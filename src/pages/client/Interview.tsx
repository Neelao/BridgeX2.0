import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Companies, Interviews, Profiles, uid } from "../../lib/db";
import { aiDelay, analyzeInterview, buildQuestionFlow, generatePersonalizedQuestions, isInterviewComplete } from "../../lib/ai";
import { useStore } from "../../lib/useStore";
import type { ChatMessage, Interview } from "../../lib/types";
import { PageHeader } from "../../components/Shell";
import { AiBadge, Avatar, Button, Card, Icon, Meter, Select } from "../../components/ui";

export default function InterviewPage() {
  const { user } = useAuth();
  const clientId = user!.id;
  const navigate = useNavigate();

  const companies = useStore(() => Companies.forClient(clientId), [clientId]);
  const profile = useStore(() => Profiles.forClient(clientId), [clientId]);
  const hasCv = !!profile?.cvText?.trim();
  const [targetId, setTargetId] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const interviewId = useRef<string>(uid("iv"));
  const startedAt = useRef<number>(Date.now());
  const flow = useRef<string[]>(buildQuestionFlow());
  const targetRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const candidateTurns = messages.filter((m) => m.role === "candidate").length;
  const totalQuestions = 5;
  const complete = isInterviewComplete(candidateTurns);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function begin() {
    const target = companies.find((c) => c.id === targetId);
    const currentProfile = Profiles.forClient(clientId);
    flow.current =
      currentProfile?.cvText?.trim()
        ? generatePersonalizedQuestions(currentProfile, target)
        : buildQuestionFlow(target);
    targetRef.current = target?.id ?? "";
    setStarted(true);
    setThinking(true);
    await aiDelay(700);
    pushInterviewer(flow.current[0]);
    setThinking(false);
  }

  function pushInterviewer(text: string) {
    setMessages((m) => [...m, { id: uid("m"), role: "interviewer", text, at: Date.now() }]);
  }

  async function send() {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    const next = [...messages, { id: uid("m"), role: "candidate" as const, text, at: Date.now() }];
    setMessages(next);

    const turns = next.filter((m) => m.role === "candidate").length;
    if (isInterviewComplete(turns)) return;

    setThinking(true);
    await aiDelay(900);
    pushInterviewer(flow.current[turns]);
    setThinking(false);
  }

  async function finish() {
    setFinishing(true);
    await aiDelay(1200);
    const profile = Profiles.forClient(clientId);
    const company = Companies.forClient(clientId).find((c) => c.id === targetRef.current) ?? Companies.forClient(clientId)[0];
    const interview: Interview = {
      id: interviewId.current,
      clientId,
      targetCompanyId: company?.id,
      startedAt: startedAt.current,
      completedAt: Date.now(),
      messages,
      analysis: analyzeInterview(messages, profile, company),
    };
    Interviews.upsert(interview);
    navigate("/client/results");
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Practice round" title="AI mock interview" />
        <Card>
          <div className="p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-steel-50 text-steel-600">
              <Icon name="mic" size={28} strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">Ready for a practice round?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Our AI interviewer will ask {totalQuestions} questions. Answer naturally — the more detail and
              concrete examples you give, the better your readiness score. When you're done, you'll get instant
              feedback and your advisor gets a coaching plan.
            </p>

            {/* CV personalization notice */}
            {hasCv ? (
              <div className="mx-auto mt-5 flex max-w-sm items-start gap-2.5 rounded-xl border border-steel-200 bg-steel-50 px-4 py-3 text-left">
                <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-steel-500" />
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[13px] font-semibold text-steel-800">CV-personalized questions</p>
                    <AiBadge />
                  </div>
                  <p className="text-xs text-steel-600">
                    Questions are tailored to your resume — referencing your actual projects and skills.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto mt-5 flex max-w-sm items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-left">
                <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-gold-600" strokeWidth={2} />
                <div>
                  <p className="text-[13px] font-semibold text-gold-800">No CV uploaded yet</p>
                  <p className="text-xs text-gold-700">
                    <a href="/client/profile" className="underline">Add your CV in Profile</a> to get questions personalised to your experience.
                  </p>
                </div>
              </div>
            )}

            <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-ink-700">
              {[
                "Use real examples and numbers where you can.",
                "Takes about five minutes to complete.",
                "Retake it as many times as you like.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Icon name="check" size={15} className="mt-0.5 shrink-0 text-sage-600" strokeWidth={2} />
                  {t}
                </li>
              ))}
            </ul>

            {companies.length > 0 && (
              <div className="mx-auto mt-6 max-w-xs text-left">
                <Select label="Practice for a specific role" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">General interview</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.roleTitle} · {c.company}</option>
                  ))}
                </Select>
                <p className="mt-1.5 text-xs text-muted">Pick a role and the questions adapt to its requirements.</p>
              </div>
            )}

            <Button icon="arrowRight" className="mt-7" onClick={begin}>
              Start interview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">AI mock interview</h1>
          <p className="text-xs text-muted">
            Question {Math.min(candidateTurns + (complete ? 0 : 1), totalQuestions)} of {totalQuestions}
          </p>
        </div>
        <div className="w-36 pb-1">
          <Meter value={candidateTurns} max={totalQuestions} />
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} name={user!.name} text={m.text} />
          ))}
          {thinking && <TypingBubble />}
        </div>

        <div className="border-t border-line p-3">
          {complete ? (
            <div className="flex flex-col items-center gap-2.5 py-2">
              <p className="text-sm text-muted">That's all the questions — nice work.</p>
              <Button icon={finishing ? undefined : "arrowRight"} onClick={finish} disabled={finishing}>
                {finishing ? "Analysing your answers…" : "Finish and see my results"}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                disabled={thinking}
                placeholder={thinking ? "Interviewer is typing…" : "Type your answer… (Enter to send)"}
                className="scroll-thin flex-1 resize-none rounded-lg border border-line-strong px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100 disabled:bg-paper-2"
              />
              <Button icon="send" onClick={send} disabled={thinking || !draft.trim()}>
                Send
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Bubble({ role, name, text }: { role: ChatMessage["role"]; name: string; text: string }) {
  const isInterviewer = role === "interviewer";
  return (
    <div className={`flex gap-2.5 ${isInterviewer ? "" : "flex-row-reverse"}`}>
      {isInterviewer ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
          <Icon name="bot" size={18} strokeWidth={1.5} />
        </span>
      ) : (
        <Avatar name={name} size={36} />
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isInterviewer ? "rounded-tl-sm bg-paper-2 text-ink-800" : "rounded-tr-sm bg-steel-500 text-white"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
        <Icon name="bot" size={18} strokeWidth={1.5} />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-paper-2 px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
