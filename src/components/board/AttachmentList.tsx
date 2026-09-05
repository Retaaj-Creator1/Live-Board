import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { formatBytes, type Attachment } from "@/lib/board";
import { MAX_FILE_BYTES, getFileUrl } from "@/lib/attachments";

function AttachmentRow({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    getFileUrl(attachment.id).then((u) => {
      if (!active) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      created = u;
      setUrl(u);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [attachment.id]);

  const isImage = attachment.type.startsWith("image/");

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {isImage && url ? (
          <img src={url} alt={attachment.name} className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(attachment.size)} · {attachment.type.split("/").pop()}
        </p>
      </div>
      {url && (
        <a
          href={url}
          download={attachment.name}
          target="_blank"
          rel="noreferrer"
          aria-label={`Download ${attachment.name}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Download className="h-4 w-4" />
        </a>
      )}
      <button
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

type Props = {
  attachments: Attachment[];
  onUpload: (file: File) => Promise<unknown>;
  onRemove: (attachmentId: string) => void;
};

export function AttachmentList({ attachments, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`);
        continue;
      }
      try {
        await onUpload(file);
      } catch {
        setError(`Could not save ${file.name}`);
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Paperclip className="h-3.5 w-3.5" /> Attachments
        {attachments.length > 0 && <span className="normal-case">{attachments.length}</span>}
      </h3>

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} attachment={a} onRemove={() => onRemove(a.id)} />
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => void handleFiles(e.target.files)}
        className="hidden"
        aria-label="Upload files"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {busy ? "Saving…" : "Add images or documents"}
      </button>
      <p className="text-xs text-muted-foreground">
        Images, PDFs and documents up to {formatBytes(MAX_FILE_BYTES)}, stored on this device.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
