import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Companies, Interviews, Profiles, uid } from "../../lib/db";
import { aiDelay, analyzeInterview, buildQuestionFlow, isInterviewComplete } from "../../lib/ai";
import { useStore } from "../../lib/useStore";
import type { ChatMessage, Interview } from "../../lib/types";
import { PageHeader } from "../../components/Shell";
import { Icon, Select } from "../../components/ui";

/* ─── Browser speech APIs ─── */
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null;

type Phase = "setup" | "call" | "finishing";
type TurnState = "ai-speaking" | "listening" | "processing" | "done";

/** Load voices, waiting for the async Chrome event if needed */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!synth) { resolve([]); return; }
    const v = synth.getVoices();
    if (v.length > 0) { resolve(v); return; }
    synth.addEventListener("voiceschanged", () => resolve(synth.getVoices()), { once: true });
  });
}

export default function InterviewPage() {
  const { user } = useAuth();
  const clientId = user!.id;
  const navigate = useNavigate();

  const companies = useStore(() => Companies.forClient(clientId), [clientId]);
  const [targetId, setTargetId] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [turnState, setTurnState] = useState<TurnState>("ai-speaking");
  const [currentQ, setCurrentQ] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [speechAvailable] = useState(() => !!synth && !!SpeechRecognitionCtor);
  const [camError, setCamError] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<any>(null);
  const resolveListenRef = useRef<((v: string) => void) | null>(null);
  const accumulatedRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowRef = useRef<string[]>([]);
  const interviewId = useRef(uid("iv"));
  const startedAt = useRef(Date.now());
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /* ── camera only (no audio track — avoids mic conflict with SpeechRecognition) ── */
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCamError(true);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /* ── TTS ── */
  async function speak(text: string): Promise<void> {
    if (!synth) return;
    synth.cancel();

    const voices = await loadVoices();
    const preferred =
      voices.find((v) => /samantha|google uk english female|zira|aria|jenny/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith("en-")) ??
      voices[0];

    return new Promise((resolve) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9;
      utt.pitch = 1.05;
      if (preferred) utt.voice = preferred;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      synth!.speak(utt);
    });
  }

  /* ── STT: continuous — resolved on "Done speaking" click or silence ── */
  function startListening(): Promise<string> {
    accumulatedRef.current = "";
    setLiveTranscript("");
    setUserSpeaking(false);

    return new Promise<string>((resolve) => {
      resolveListenRef.current = resolve;
      if (!SpeechRecognitionCtor) { resolve(""); return; }

      const rec = new SpeechRecognitionCtor();
      recognizerRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) accumulatedRef.current += t + " ";
          else interim += t;
        }
        setLiveTranscript(accumulatedRef.current + interim);

        /* mark user as speaking; clear after 1.5 s of silence */
        setUserSpeaking(true);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => setUserSpeaking(false), 1500);
      };

      const finish = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setUserSpeaking(false);
        if (resolveListenRef.current) {
          resolveListenRef.current(accumulatedRef.current.trim());
          resolveListenRef.current = null;
        }
      };
      rec.onend = finish;
      rec.onerror = finish;
      rec.start();
    });
  }

  function submitAnswer() {
    recognizerRef.current?.stop();
  }

  /* ── interview loop ── */
  const runTurn = useCallback(async (qIndex: number, flow: string[]) => {
    const question = flow[qIndex];
    setMessages((m) => [...m, { id: uid("m"), role: "interviewer", text: question, at: Date.now() }]);
    setCurrentQ(qIndex);
    setTurnState("ai-speaking");
    await speak(question);

    setTurnState("listening");
    const answer = await startListening();
    setLiveTranscript("");

    const text = answer.trim() || "(no response)";
    setMessages((m) => [...m, { id: uid("m"), role: "candidate", text, at: Date.now() }]);
    setTurnState("processing");
    await aiDelay(500);

    const nextQ = qIndex + 1;
    if (!isInterviewComplete(nextQ)) {
      await runTurn(nextQ, flow);
    } else {
      setTurnState("done");
    }
  }, []);

  async function beginCall() {
    const target = companies.find((c) => c.id === targetId);
    const flow = buildQuestionFlow(target);
    flowRef.current = flow;
    interviewId.current = uid("iv");
    startedAt.current = Date.now();
    setMessages([]);
    setCurrentQ(0);
    setPhase("call");
    await startCamera();
    await aiDelay(600);
    await runTurn(0, flow);
  }

  async function endInterview() {
    synth?.cancel();
    recognizerRef.current?.stop();
    resolveListenRef.current?.("");
    resolveListenRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopCamera();
    setPhase("finishing");
    await aiDelay(1200);
    const profile = Profiles.forClient(clientId);
    const target = companies.find((c) => c.id === targetId) ?? companies[0];
    const current = messagesRef.current;
    const interview: Interview = {
      id: interviewId.current,
      clientId,
      targetCompanyId: target?.id,
      startedAt: startedAt.current,
      completedAt: Date.now(),
      messages: current,
      analysis: analyzeInterview(current, profile, target),
    };
    Interviews.upsert(interview);
    navigate("/client/results");
  }

  useEffect(() => {
    return () => {
      synth?.cancel();
      recognizerRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopCamera();
    };
  }, []);

  /* ─────────────── SETUP SCREEN ─────────────── */
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Practice round" title="AI mock interview" />
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-line shadow-[0_1px_2px_rgba(20,22,30,0.04)] md:grid-cols-2">
          <div className="flex flex-col justify-between bg-ink-900 px-8 py-10 text-white">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-300">
                Face-to-face practice
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight">
                Speak to a realistic AI interviewer.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Your camera opens on the call screen. The AI interviewer asks questions out loud
                and speech recognition will capture your answers live.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3">
              {["Camera required", "Microphone required", "Natural AI voice", "Private scoring"].map((label) => (
                <div key={label} className="flex flex-col gap-2 rounded-xl bg-white/8 px-4 py-3.5">
                  <Icon name="check" size={14} className="text-steel-300" strokeWidth={2.5} />
                  <span className="text-sm font-medium text-white/80">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between bg-surface px-8 py-10">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-50">
                <Icon name="mic" size={26} className="text-steel-500" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-ink-900">Set up your mock call</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Allow camera and microphone access when asked. The AI will ask questions out loud
                and speech recognition will capture your answers live.
              </p>

              {companies.length > 0 && (
                <div className="mt-7">
                  <Select
                    label="Practice for a specific role"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">General interview</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.roleTitle} · {c.company}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-xs text-muted">Pick a role and the AI adapts the questions.</p>
                </div>
              )}

              {!speechAvailable && (
                <div className="mt-5 rounded-lg border border-gold-100 bg-gold-50 px-4 py-3 text-sm text-gold-600">
                  Speech recognition isn't available in this browser. Try Chrome for the full voice experience.
                </div>
              )}

              {speechAvailable && (
                <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-sage-50 px-4 py-3 text-sm text-sage-700">
                  <Icon name="check" size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                  Speech recognition is ready. Your answers will be captured live from your microphone.
                </div>
              )}
            </div>

            <button
              onClick={beginCall}
              className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl bg-ink-900 py-4 text-sm font-semibold text-white transition hover:bg-ink-800 active:scale-[0.98]"
            >
              <Icon name="arrowRight" size={16} />
              Start FaceTime-style interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── FINISHING OVERLAY ─────────────── */
  if (phase === "finishing") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink-900 text-white">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-steel-400"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-lg font-semibold">Analysing your answers…</p>
        <p className="text-sm text-white/50">This only takes a moment.</p>
      </div>
    );
  }

  /* ─────────────── CALL SCREEN ─────────────── */
  const totalQuestions = flowRef.current.length || 5;
  const candidateTurns = messages.filter((m) => m.role === "candidate").length;
  const aiMessages = messages.filter((m) => m.role === "interviewer");
  const currentQuestion = aiMessages[aiMessages.length - 1]?.text ?? "";
  const isSpeaking = turnState === "ai-speaking";
  const isListening = turnState === "listening";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">

      {/* Top progress bar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <div className="flex items-center gap-3 text-white/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-clay-400" />
          <span className="text-sm font-medium">
            Question {Math.min(currentQ + 1, totalQuestions)} of {totalQuestions}
          </span>
        </div>
        <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-steel-400 transition-all duration-700"
            style={{ width: `${(candidateTurns / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* 1:1 panels */}
      <div className="flex flex-1 gap-0.5 overflow-hidden">

        {/* ── Left: AI interviewer — full panel, looks like a video call ── */}
        <div className="relative flex flex-1 overflow-hidden bg-[#0d1420]">
          {/* Full-panel photo */}
          <img
            src="/ai-interviewer.png"
            alt="AI Interviewer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* Gradient overlay so bottom text is readable */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Blue border when she's speaking */}
          {isSpeaking && (
            <div className="pointer-events-none absolute inset-0 border-[3px] border-steel-400/80" />
          )}

          {/* Speaking badge */}
          {isSpeaking && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-steel-600/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Speaking
            </div>
          )}

          {/* Audio bars while AI speaks */}
          {isSpeaking && (
            <div className="absolute bottom-[4.5rem] left-5 flex items-end gap-[3px]">
              {[3, 7, 10, 8, 5, 9, 6, 8, 4].map((h, i) => (
                <span
                  key={i}
                  className="w-[5px] rounded-full bg-steel-300"
                  style={{
                    height: `${h * 3}px`,
                    animation: `audioBars ${0.55 + i * 0.07}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.06}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Name / title */}
          <div className="absolute bottom-6 left-5">
            <p className="text-sm font-semibold text-white">Alex</p>
            <p className="text-xs text-white/50">AI Interviewer · BridgeX</p>
          </div>

          {/* Current question text */}
          {currentQuestion && (
            <div className="absolute bottom-16 left-5 right-5">
              <p className="text-[13px] leading-relaxed text-white/80">{currentQuestion}</p>
            </div>
          )}
        </div>

        {/* ── Right: user camera ── */}
        <div className="relative flex flex-1 overflow-hidden bg-[#1a1c24]">
          {camError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/40">
              <Icon name="camera" size={44} strokeWidth={1} />
              <p className="text-sm">Camera not available</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          )}

          {/* Green border when you're speaking */}
          {userSpeaking && isListening && (
            <div className="pointer-events-none absolute inset-0 border-[3px] border-sage-500/80" />
          )}

          {/* Your name tag */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur">
            <span className="text-xs font-semibold text-white">{user!.name} (You)</span>
          </div>

          {/* Status badge top-right */}
          {isListening && (
            <div
              className={`absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-all duration-200 ${
                userSpeaking ? "bg-sage-600/90" : "bg-white/15"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  userSpeaking ? "animate-pulse bg-white" : "bg-white/40"
                }`}
              />
              {userSpeaking ? "Speaking…" : "Listening…"}
            </div>
          )}

          {/* Speaking pulse bars — shown when voice detected */}
          {isListening && userSpeaking && (
            <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-end gap-[3px]">
              {[4, 8, 12, 9, 6, 10, 7, 9, 5].map((h, i) => (
                <span
                  key={i}
                  className="w-[5px] rounded-full bg-sage-400"
                  style={{
                    height: `${h * 2.5}px`,
                    animation: `audioBars ${0.5 + i * 0.08}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Live transcript */}
          {liveTranscript && (
            <div className="absolute bottom-16 left-4 right-4">
              <div className="rounded-xl bg-black/60 px-4 py-3 text-sm leading-relaxed text-white/90 backdrop-blur">
                {liveTranscript}
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {turnState === "processing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/60"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex h-20 shrink-0 items-center justify-center gap-6">
        {turnState === "done" ? (
          <button
            onClick={endInterview}
            className="flex items-center gap-2.5 rounded-full bg-steel-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-steel-600"
          >
            <Icon name="arrowRight" size={16} />
            Finish &amp; see results
          </button>
        ) : (
          <>
            <button
              onClick={endInterview}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-clay-600 px-5 py-3 text-white transition hover:bg-clay-500"
            >
              <Icon name="phoneOff" size={22} strokeWidth={1.5} />
              <span className="text-[11px] font-medium">End interview</span>
            </button>

            <p className="min-w-[160px] text-center text-xs text-white/35">
              {isSpeaking && "Alex is speaking…"}
              {isListening && (userSpeaking ? "We can hear you — keep going" : "Speak your answer")}
              {turnState === "processing" && "Moving on…"}
            </p>

            {isListening && (
              <button
                onClick={submitAnswer}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-sage-600 px-5 py-3 text-white transition hover:bg-sage-500"
              >
                <Icon name="check" size={22} strokeWidth={2} />
                <span className="text-[11px] font-medium">Done speaking</span>
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes audioBars {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
}
