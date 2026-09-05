import { LayoutGrid, Table, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "kanban" | "table" | "calendar";

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const modes: Array<{ id: ViewMode; label: string; icon: typeof LayoutGrid }> = [
  { id: "kanban", label: "Board", icon: LayoutGrid },
  { id: "table", label: "Table", icon: Table },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export function ViewSwitcher({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {modes.map((mode) => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              value === mode.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
