import http from "node:http";
import fs from "node:fs";

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function missing(keys) {
  return keys.filter((key) => !process.env[key]);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  try {
    if (req.method === "GET" && req.url === "/api/config/status") {
      return json(res, 200, {
        tavusReady: missing(["TAVUS_API_KEY", "TAVUS_REPLICA_ID", "TAVUS_PERSONA_ID"]).length === 0,
        deepgramReady: missing(["DEEPGRAM_API_KEY"]).length === 0,
      });
    }

    if (req.method === "POST" && req.url === "/api/tavus/conversation") {
      const missingKeys = missing(["TAVUS_API_KEY", "TAVUS_REPLICA_ID", "TAVUS_PERSONA_ID"]);
      if (missingKeys.length) {
        return json(res, 400, {
          error: `Missing ${missingKeys.join(", ")} in .env`,
        });
      }

      const response = await fetch("https://tavusapi.com/v2/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.TAVUS_API_KEY,
        },
        body: JSON.stringify({
          replica_id: process.env.TAVUS_REPLICA_ID,
          persona_id: process.env.TAVUS_PERSONA_ID,
          conversation_name: "BridgeX Mock Interview",
        }),
      });

      const data = await response.json().catch(() => ({}));
      return json(res, response.ok ? 200 : response.status, data);
    }

    if (req.method === "POST" && req.url === "/api/deepgram/transcribe") {
      const missingKeys = missing(["DEEPGRAM_API_KEY"]);
      if (missingKeys.length) {
        return json(res, 400, { error: "Missing DEEPGRAM_API_KEY in .env" });
      }

      const audio = await readBody(req);
      if (!audio.length) return json(res, 400, { error: "No audio received" });

      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en-US", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": req.headers["content-type"] || "audio/webm",
        },
        body: audio,
      });

      const data = await response.json().catch(() => ({}));
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
      return json(res, response.ok ? 200 : response.status, { transcript, raw: data });
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`BridgeX API server listening on http://127.0.0.1:${PORT}`);
});
