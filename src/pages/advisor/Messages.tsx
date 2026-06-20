import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Messages, Users, uid } from "../../lib/db";
import { relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { Avatar, Card, EmptyState } from "../../components/ui";
import { ChatThread } from "../../components/Chat";

export default function AdvisorMessages() {
  const { user } = useAuth();
  const advisorId = user!.id;
  const clients = useStore(() => Users.clientsOf(advisorId), [advisorId]);

  const [params] = useSearchParams();
  const [activeId, setActiveId] = useState<string>(params.get("client") ?? clients[0]?.id ?? "");
  const active = clients.find((c) => c.id === activeId) ?? clients[0];

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Conversations" title="Messages" />
        <EmptyState title="No clients yet" body="Add a client to start a conversation." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Conversations" title="Messages" subtitle="Chat directly with your clients — share photos, files and voice notes." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="max-h-[70vh] overflow-y-auto scroll-thin p-2">
            {clients.map((c) => (
              <ClientRow key={c.id} clientId={c.id} name={c.name} active={c.id === active?.id} onClick={() => setActiveId(c.id)} />
            ))}
          </div>
        </Card>

        <Card className="flex h-[70vh] flex-col lg:col-span-2">
          {active ? <Thread key={active.id} advisorId={advisorId} clientId={active.id} clientName={active.name} /> : null}
        </Card>
      </div>
    </div>
  );
}

function ClientRow({ clientId, name, active, onClick }: { clientId: string; name: string; active: boolean; onClick: () => void }) {
  const last = useStore(() => Messages.lastFor(clientId), [clientId]);
  const preview = last ? (last.attachment ? attachmentLabel(last.attachment.kind) : last.text) : "No messages yet";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-paper-2" : "hover:bg-paper-2"}`}
    >
      <Avatar name={name} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
        <p className="truncate text-xs text-muted">{last && last.from === "advisor" ? "You: " : ""}{preview}</p>
      </div>
      {last && <span className="shrink-0 text-[11px] text-muted">{relative(last.at)}</span>}
    </button>
  );
}

function attachmentLabel(kind: "image" | "audio" | "file") {
  return kind === "image" ? "Photo" : kind === "audio" ? "Voice message" : "Attachment";
}

function Thread({ advisorId, clientId, clientName }: { advisorId: string; clientId: string; clientName: string }) {
  const messages = useStore(() => Messages.forClient(clientId), [clientId]);
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Avatar name={clientName} size={36} />
        <p className="text-sm font-semibold text-ink-900">{clientName}</p>
      </div>
      <ChatThread
        messages={messages}
        meRole="advisor"
        emptyText={`No messages yet. Say hello to ${clientName.split(" ")[0]}.`}
        onSend={(text, attachment) => {
          Messages.add({ id: uid("msg"), advisorId, clientId, from: "advisor", text, at: Date.now(), attachment });
          Users.touchContact(clientId);
        }}
      />
    </>
  );
}
