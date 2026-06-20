import http from "node:http";
import fs from "node:fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const PORT = Number(process.env.API_PORT ?? 8787);

function loadDotEnv() {
  try {
    if (!fs.existsSync(".env")) return;
    const env = fs.readFileSync(".env", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env is optional; routes return setup guidance when keys are missing.
  }
}

loadDotEnv();

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function missing(keys) {
  return keys.filter((key) => !process.env[key]);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  try {
    if (req.method === "GET" && req.url === "/api/elevenlabs/scribe-token") {
      const missingKeys = missing(["ELEVENLABS_API_KEY"]);
      if (missingKeys.length) {
        return json(res, 400, { error: "Missing ELEVENLABS_API_KEY in .env" });
      }

      const elevenlabs = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
      });
      const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
      return json(res, 200, token);
    }

    if (req.method === "POST" && req.url === "/api/elevenlabs/tts") {
      const missingKeys = missing(["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"]);
      if (missingKeys.length) {
        return json(res, 400, { error: `Missing ${missingKeys.join(", ")} in .env` });
      }

      const body = await readJson(req);
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) return json(res, 400, { error: "Missing text" });

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.8,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return json(res, response.status, { error: errorText || "ElevenLabs text-to-speech failed" });
      }

      const audio = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
      });
      res.end(audio);
      return;
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`BridgeX API server listening on http://127.0.0.1:${PORT}`);
});
