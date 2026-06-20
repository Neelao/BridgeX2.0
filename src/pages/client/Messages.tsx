import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Messages, Sessions, Users, uid } from "../../lib/db";
import { fmtDateTime, relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { Avatar, Button, Card, CardHeader, EmptyState, Icon, Input, Select } from "../../components/ui";
import { Modal } from "../../components/Modal";
import { ChatThread } from "../../components/Chat";

export default function ClientMessages() {
  const { user } = useAuth();
  const clientId = user!.id;
  const advisorId = user!.advisorId ?? "";
  const advisor = advisorId ? Users.byId(advisorId) : undefined;
  const messages = useStore(() => Messages.forClient(clientId), [clientId]);
  const sessions = useStore(
    () => Sessions.forClient(clientId).filter((s) => s.status === "scheduled"),
    [clientId]
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (!advisor) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Messages" title="Your advisor" />
        <EmptyState title="No advisor yet" body="You'll be able to message your advisor here." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Messages" title={`Chat with ${advisor.name}`} subtitle={advisor.agency} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex h-[70vh] flex-col">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <Avatar name={advisor.name} size={36} />
              <div>
                <p className="text-sm font-semibold text-ink-900">{advisor.name}</p>
                <p className="text-xs text-muted">{advisor.title ?? "Career advisor"}</p>
              </div>
            </div>
            <ChatThread
              messages={messages}
              meRole="client"
              emptyText="No messages yet. Reach out to your advisor with any questions."
              onSend={(text, attachment) => {
                Messages.add({ id: uid("msg"), advisorId: advisor.id, clientId, from: "client", text, at: Date.now(), attachment });
              }}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4 p-5">
              <Avatar name={advisor.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{advisor.name}</p>
                {advisor.title && <p className="text-xs text-muted">{advisor.title}</p>}
                {advisor.agency && <p className="text-xs text-muted">{advisor.agency}</p>}
              </div>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Button variant="outline" icon="calendar" className="w-full" onClick={() => setScheduleOpen(true)}>
                Request a session
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Upcoming Sessions" icon="calendar" />
            <div className="p-3">
              {sessions.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted">No sessions scheduled yet.</p>
              ) : (
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <div key={s.id} className="rounded-lg px-2 py-2.5">
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
