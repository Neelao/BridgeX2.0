import { useEffect, useRef, useState } from "react";
import { ADVISOR_PROMPT_SUGGESTIONS, aiDelay, answerAdvisorQuery } from "../lib/ai";
import { AdvisorChats, uid } from "../lib/db";
import type { AdvisorChatMessage } from "../lib/types";
import { Icon } from "./Icon";

export function AdvisorAssistant({ advisorId }: { advisorId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AdvisorChatMessage[]>(() => AdvisorChats.forAdvisor(advisorId));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || thinking) return;
    setMessages(AdvisorChats.append(advisorId, { id: uid("msg"), role: "user", text: question, at: Date.now() }));
    setInput("");
    setThinking(true);
    await aiDelay(650);
    const answer = answerAdvisorQuery(advisorId, question);
    setMessages(AdvisorChats.append(advisorId, { id: uid("msg"), role: "assistant", text: answer, at: Date.now() }));
    setThinking(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Bridgy" : "Open Bridgy"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#44415f] to-[#2c2a40] text-white shadow-lg shadow-black/20 transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Icon name={open ? "x" : "bot"} size={22} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[min(640px,calc(100vh-140px))] w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/15">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#44415f] to-[#2c2a40] text-white">
              <Icon name="bot" size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">Bridgy</p>
              <p className="text-[11px] text-muted">Ask about any client or your roster</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-muted transition hover:bg-paper-2 hover:text-ink-800"
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-steel-500">
                  <Icon name="sparkle" size={20} />
                </span>
                <p className="max-w-[260px] text-sm text-muted">
                  I'm Bridgy — ask me about a client's readiness, who needs attention, or what to do next.
                </p>
                <div className="flex flex-col gap-2">
                  {ADVISOR_PROMPT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-700 transition hover:bg-paper-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user" ? "bg-ink-900 text-white" : "bg-paper-2 text-ink-800"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl bg-paper-2 px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "-0.2s" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "-0.1s" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a client or your roster…"
              className="flex-1 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-[13px] outline-none placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white transition disabled:opacity-40"
              aria-label="Send"
            >
              <Icon name="send" size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
