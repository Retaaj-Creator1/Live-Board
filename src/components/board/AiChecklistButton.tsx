import { useState } from "react";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { ai } from "@/lib/ai";

type Props = {
  cardTitle: string;
  cardDescription: string | undefined;
  onAddItems: (items: string[]) => void;
};

export function AiChecklistButton({ cardTitle, cardDescription, onAddItems }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const items = await ai.generateChecklist(cardTitle, cardDescription ?? undefined);
      onAddItems(items);
    } catch {
      // Provider failure — nothing to add, just stop loading.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {loading ? "Generating…" : "AI: Break into checklist"}
    </button>
  );
}
