import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Messages, Notes, Sessions, Users, uid } from "../../lib/db";
import { fmtDateTime, relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Icon,
  Input,
  Select,
} from "../../components/ui";
import { Modal } from "../../components/Modal";
import type { DirectMessage } from "../../lib/types";

export default function AdvisorPortal() {
  const { user } = useAuth();
  const clientId = user!.id;
  const advisorId = user!.advisorId ?? "";

  const advisor = useStore(() => Users.byId(advisorId), [advisorId]);
  const conversation = useStore(
    () => Messages.forConversation(advisorId, clientId),
    [advisorId, clientId]
  );
  const sessions = useStore(
    () => Sessions.forClient(clientId).filter((s) => s.status === "scheduled"),
    [clientId]
  );
  const notes = useStore(() => Notes.forClient(clientId), [clientId]);

  const [draft, setDraft] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation]);

  function send() {
    const text = draft.trim();
    if (!text || !advisorId) return;
    Messages.add({
      id: uid("msg"),
      advisorId,
      clientId,
      from: "client",
      text,
      at: Date.now(),
    });
    setDraft("");
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!advisorId || !advisor) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Communication" title="My Advisor" />
        <Card>
          <div className="p-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-2 text-muted">
              <Icon name="users" size={24} strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-semibold text-ink-900">No advisor assigned</p>
            <p className="mt-1.5 text-sm text-muted">
              You don't have an advisor yet. Contact support to get matched.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Communication portal"
        title="My Advisor"
        subtitle={`${advisor.name} · ${advisor.title ?? "Career Advisor"}${advisor.agency ? ` · ${advisor.agency}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat — spans 2 cols */}
        <div className="flex h-full flex-col lg:col-span-2">
          <Card className="flex h-full flex-col">
            <CardHeader
              title={`Chat with ${advisor.name}`}
              icon="send"
              action={
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sage-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
                  Active
                </span>
              }
            />
            <div
              ref={scrollRef}
              className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5"
            >
              {conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-steel-50 text-steel-400">
                    <Icon name="send" size={20} strokeWidth={1.5} />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink-700">No messages yet</p>
                  <p className="mt-1 text-xs text-muted">
                    Send a message to start the conversation with {advisor.name}.
                  </p>
                </div>
              ) : (
                conversation.map((m) => (
                  <ChatBubble
                    key={m.id}
                    message={m}
                    clientName={user!.name}
                    advisorName={advisor.name}
                  />
                ))
              )}
            </div>
            <div className="border-t border-line p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={2}
                  placeholder={`Message ${advisor.name}… (Enter to send)`}
                  className="scroll-thin flex-1 resize-none rounded-lg border border-line-strong px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
                />
                <Button icon="send" onClick={send} disabled={!draft.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Advisor card */}
          <Card>
            <div className="flex items-center gap-4 p-5">
              <Avatar name={advisor.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{advisor.name}</p>
                {advisor.title && (
                  <p className="text-xs text-muted">{advisor.title}</p>
                )}
                {advisor.agency && (
                  <p className="text-xs text-muted">{advisor.agency}</p>
                )}
              </div>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Button
                variant="outline"
                icon="calendar"
                className="w-full"
                onClick={() => setScheduleOpen(true)}
              >
                Request a session
              </Button>
            </div>
          </Card>

          {/* Upcoming sessions */}
          <Card>
            <CardHeader title="Upcoming Sessions" icon="calendar" />
            <div className="p-3">
              {sessions.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted">
                  No sessions scheduled yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg px-2 py-2.5"
                    >
                      <p className="text-sm font-medium text-ink-800">{s.topic}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {fmtDateTime(s.when)} · {s.durationMins} min ·{" "}
                        <span className="text-sage-600">{relative(s.when)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setScheduleOpen(true)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium text-muted transition hover:bg-paper-2 hover:text-ink-700"
              >
                <Icon name="plus" size={13} />
                Request another session
              </button>
            </div>
          </Card>

          {/* Advisor recommendations */}
          <Card>
            <CardHeader title="Recommendations" icon="sparkle" />
            <div className="p-4">
              {notes.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted">
                  No recommendations yet — check back after your next session.
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="flex gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-steel-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-ink-800">{n.text}</p>
                        <p className="mt-0.5 text-xs text-muted">{relative(n.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <RequestSessionModal
        open={scheduleOpen}
        advisorId={advisorId}
        clientId={clientId}
        onClose={() => setScheduleOpen(false)}
      />
    </div>
  );
}

function ChatBubble({
  message,
  clientName,
  advisorName,
}: {
  message: DirectMessage;
  clientName: string;
  advisorName: string;
}) {
  const isAdvisor = message.from === "advisor";
  return (
    <div className={`flex gap-2.5 ${isAdvisor ? "" : "flex-row-reverse"}`}>
      {isAdvisor ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white text-[11px] font-semibold">
          {advisorName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel-500 text-white text-[11px] font-semibold">
          {clientName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 max-w-[78%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isAdvisor
              ? "rounded-tl-sm bg-paper-2 text-ink-800"
              : "rounded-tr-sm bg-steel-500 text-white"
          }`}
        >
          {message.text}
        </div>
        <p className={`mt-1 text-[11px] text-muted ${isAdvisor ? "" : "text-right"}`}>
          {isAdvisor ? advisorName : "You"} · {relative(message.at)}
        </p>
      </div>
    </div>
  );
}

function RequestSessionModal({
  open,
  advisorId,
  clientId,
  onClose,
}: {
  open: boolean;
  advisorId: string;
  clientId: string;
  onClose: () => void;
}) {
  const defaultWhen = new Date(Date.now() + 24 * 3600 * 1000);
  defaultWhen.setMinutes(0, 0, 0);
  const [topic, setTopic] = useState("Mock interview review");
  const [when, setWhen] = useState(toLocalInput(defaultWhen));
  const [duration, setDuration] = useState(30);
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    Sessions.upsert({
      id: uid("ses"),
      advisorId,
      clientId,
      when: new Date(when).getTime(),
      durationMins: duration,
      topic: topic.trim() || "Coaching session",
      status: "scheduled",
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1400);
  }

  return (
    <Modal open={open} onClose={onClose} title="Request a coaching session">
      {saved ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600">
            <Icon name="check" size={22} strokeWidth={2.5} />
          </span>
          <p className="font-semibold text-ink-900">Request sent!</p>
          <p className="text-sm text-muted">Your advisor will confirm shortly.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Session topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Interview prep, CV review"
          />
          <Input
            label="Preferred date & time"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <Select
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" icon="calendar">
              Send request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
