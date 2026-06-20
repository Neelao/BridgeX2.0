import { useEffect, useRef, useState } from "react";
import type { DirectMessage, MessageAttachment } from "../lib/types";
import { fmtTime } from "../lib/format";
import { useToast } from "./Toast";
import { Modal } from "./Modal";
import { Button, Icon } from "./ui";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB cap — localStorage is small in this demo

function blobToAttachment(
  blob: Blob,
  name: string,
  kind: MessageAttachment["kind"]
): Promise<MessageAttachment | null> {
  return new Promise((resolve) => {
    if (blob.size > MAX_BYTES) return resolve(null);
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ kind, name, mime: blob.type || "application/octet-stream", size: blob.size, dataUrl: String(reader.result ?? "") });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function kindOf(mime: string): MessageAttachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function fmtSecs(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function prettySize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ---------------- Thread (list + composer) ---------------- */
export function ChatThread({
  messages,
  meRole,
  onSend,
  emptyText,
}: {
  messages: DirectMessage[];
  meRole: "advisor" | "client";
  onSend: (text: string, attachment?: MessageAttachment) => void;
  emptyText: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <>
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} mine={m.from === meRole} />)
        )}
      </div>
      <Composer onSend={onSend} />
    </>
  );
}

function Bubble({ message, mine }: { message: DirectMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-steel-500 text-white" : "rounded-bl-sm bg-paper-2 text-ink-800"}`}>
        {message.attachment && <AttachmentView att={message.attachment} mine={mine} />}
        {message.text && <p className={message.attachment ? "mt-1.5 px-0.5" : "px-0.5"}>{message.text}</p>}
        <p className={`mt-0.5 px-0.5 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{fmtTime(message.at)}</p>
      </div>
    </div>
  );
}

function AttachmentView({ att, mine }: { att: MessageAttachment; mine: boolean }) {
  if (att.kind === "image") {
    return <img src={att.dataUrl} alt={att.name} className="max-h-60 w-auto max-w-full rounded-xl" />;
  }
  if (att.kind === "audio") {
    return <audio src={att.dataUrl} controls className="w-60 max-w-full" />;
  }
  return (
    <a
      href={att.dataUrl}
      download={att.name}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${mine ? "bg-white/15 text-white" : "border border-line bg-surface text-ink-800"}`}
    >
      <Icon name="file" size={18} className="shrink-0" />
      <span className="min-w-0">
        <span className="block max-w-[180px] truncate text-[13px] font-medium">{att.name}</span>
        <span className={`text-[11px] ${mine ? "text-white/70" : "text-muted"}`}>{prettySize(att.size)}</span>
      </span>
      <Icon name="download" size={15} className="ml-1 shrink-0 opacity-70" />
    </a>
  );
}

/* ---------------- Composer ---------------- */
function Composer({ onSend }: { onSend: (text: string, attachment?: MessageAttachment) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<MessageAttachment | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const att = await blobToAttachment(file, file.name, kindOf(file.type));
    if (!att) return toast("File is too large (max 3MB for this demo).", "error");
    setAttachment(att);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelRef.current) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const att = await blobToAttachment(blob, "voice-message", "audio");
        if (!att) return toast("Recording too long to store (max 3MB).", "error");
        setAttachment(att);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast("Microphone access was blocked.", "error");
    }
  }

  function stopRecording(cancel = false) {
    cancelRef.current = cancel;
    window.clearInterval(timerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function handleSend() {
    const t = text.trim();
    if (!t && !attachment) return;
    try {
      onSend(t, attachment ?? undefined);
      setText("");
      setAttachment(null);
    } catch {
      toast("Couldn't send — the attachment may be too large to store.", "error");
    }
  }

  return (
    <div className="border-t border-line p-3">
      {recording ? (
        <div className="flex items-center gap-3 rounded-xl bg-clay-50 px-4 py-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-clay-500" />
          <span className="flex-1 text-sm font-medium text-clay-600">Recording… {fmtSecs(seconds)}</span>
          <button onClick={() => stopRecording(true)} className="rounded-lg p-1.5 text-muted hover:bg-white/60 hover:text-ink-700" title="Cancel">
            <Icon name="trash" size={17} />
          </button>
          <Button size="sm" icon="check" onClick={() => stopRecording(false)}>Stop</Button>
        </div>
      ) : (
        <>
          {attachment && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-paper-2 px-3 py-2">
              {attachment.kind === "image" ? (
                <img src={attachment.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-ink-600">
                  <Icon name={attachment.kind === "audio" ? "mic" : "file"} size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-800">{attachment.name}</p>
                <p className="text-xs text-muted">{prettySize(attachment.size)}</p>
              </div>
              <button onClick={() => setAttachment(null)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-clay-500" title="Remove">
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.ppt,.pptx,.xls,.xlsx"
              onChange={onFile}
              className="hidden"
            />
            <ComposerButton icon="paperclip" title="Attach a file" onClick={() => fileRef.current?.click()} />
            <ComposerButton icon="camera" title="Take a photo" onClick={() => setCameraOpen(true)} />
            <ComposerButton icon="mic" title="Record a voice message" onClick={startRecording} />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Type a message…"
              className="scroll-thin max-h-28 flex-1 resize-none rounded-xl border border-line-strong px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
            />
            <Button icon="send" onClick={handleSend} disabled={!text.trim() && !attachment}>Send</Button>
          </div>
        </>
      )}

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(att) => setAttachment(att)} />
    </div>
  );
}

function ComposerButton({ icon, title, onClick }: { icon: "paperclip" | "camera" | "mic"; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-paper-2 hover:text-ink-700"
    >
      <Icon name={icon} size={19} />
    </button>
  );
}

/* ---------------- Camera capture ---------------- */
function CameraModal({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (att: MessageAttachment) => void }) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        toast("Camera access was blocked.", "error");
        onClose();
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCapture({ kind: "image", name: `photo-${Date.now()}.jpg`, mime: "image/jpeg", size: Math.round(dataUrl.length * 0.75), dataUrl });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Take a photo" width="max-w-lg">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl bg-ink-900">
          <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" icon="camera" className="flex-1" onClick={capture}>Capture</Button>
        </div>
      </div>
    </Modal>
  );
}
