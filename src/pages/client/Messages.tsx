import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Messages, Users, uid } from "../../lib/db";
import { PageHeader } from "../../components/Shell";
import { Avatar, Card, EmptyState } from "../../components/ui";
import { ChatThread } from "../../components/Chat";

export default function ClientMessages() {
  const { user } = useAuth();
  const clientId = user!.id;
  const advisor = user!.advisorId ? Users.byId(user!.advisorId) : undefined;
  const messages = useStore(() => Messages.forClient(clientId), [clientId]);

  if (!advisor) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Messages" title="Your advisor" />
        <EmptyState title="No advisor yet" body="You'll be able to message your advisor here." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Messages" title={`Chat with ${advisor.name}`} subtitle={advisor.agency} />

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
  );
}
