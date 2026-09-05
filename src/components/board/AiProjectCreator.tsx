import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ai, type GeneratedBoard } from "@/lib/ai";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (board: GeneratedBoard) => void;
};

const suggestions = [
  "Plan a product launch",
  "Create a content calendar",
  "Organize a wedding",
  "Build a mobile app",
  "Plan a marketing campaign",
];

export function AiProjectCreator({ open, onOpenChange, onApply }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratedBoard | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const result = await ai.generateBoard(prompt.trim());
      setPreview(result);
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    onApply(preview);
    setPrompt("");
    setPreview(null);
    onOpenChange(false);
  };

  const close = () => {
    onOpenChange(false);
    setPrompt("");
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create with AI
          </DialogTitle>
          <DialogDescription>
            Describe your project and AI will generate lists and cards for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={3}
              value={prompt}
              placeholder="e.g. Plan a product launch for our new mobile app..."
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
              className="w-full resize-none rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your board…
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
              <h4 className="text-sm font-semibold">{preview.name}</h4>
              <div className="space-y-1.5">
                {preview.columns.map((col) => (
                  <div key={col.title} className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-primary/20 px-2 py-0.5 font-medium text-primary">
                      {col.title}
                    </span>
                    <span className="text-muted-foreground">
                      {col.cards.length} card{col.cards.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {preview.columns.reduce((sum, c) => sum + c.cards.length, 0)} total cards across{" "}
                {preview.columns.length} lists
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            {preview ? (
              <button
                onClick={apply}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Wand2 className="h-4 w-4" /> Create board
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={!prompt.trim() || loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
