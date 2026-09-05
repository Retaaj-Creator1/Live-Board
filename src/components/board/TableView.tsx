import { useState } from "react";
import {
  checklistProgress,
  dueStatus,
  formatDue,
  labelClass,
  type BoardState,
  type Card,
  type Label,
} from "@/lib/board";
import type { LabelStyle } from "@/lib/theme";
import type { MemberInfo } from "@/lib/realtime";

type Props = {
  state: BoardState;
  members: MemberInfo[];
  labelStyle?: LabelStyle;
  onOpenCard: (cardId: string) => void;
};

type SortKey = "title" | "column" | "dueDate" | "progress";

export function TableView({ state, members, labelStyle = "soft", onOpenCard }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortAsc, setSortAsc] = useState(true);

  const cards = Object.values(state.cards).map((card) => {
    const column = state.columns.find((c) => c.cardIds.includes(card.id));
    return { ...card, columnTitle: column?.title ?? "" };
  });

  const sorted = [...cards].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "column":
        cmp = a.columnTitle.localeCompare(b.columnTitle);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        break;
      case "progress": {
        const pa = checklistProgress(a);
        const pb = checklistProgress(b);
        cmp = pa.done / Math.max(pa.total, 1) - pb.done / Math.max(pb.total, 1);
        break;
      }
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyVal)}
      className={`text-left text-xs font-semibold uppercase tracking-wide ${sortKey === sortKeyVal ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label} {sortKey === sortKeyVal && (sortAsc ? "↑" : "↓")}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr>
            <th className="w-8 px-3 py-2" />
            <th className="px-3 py-2">
              <SortHeader label="Title" sortKeyVal="title" />
            </th>
            <th className="px-3 py-2">
              <SortHeader label="List" sortKeyVal="column" />
            </th>
            <th className="px-3 py-2">
              <SortHeader label="Due" sortKeyVal="dueDate" />
            </th>
            <th className="px-3 py-2">
              <SortHeader label="Progress" sortKeyVal="progress" />
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assignees
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => (
            <TableRow
              key={card.id}
              card={card}
              state={state}
              members={members}
              labelStyle={labelStyle}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">No cards yet.</div>
      )}
    </div>
  );
}
function TableRow({
  card,
  state,
  members,
  labelStyle,
  onOpen,
}: {
  card: Card & { columnTitle: string };
  state: BoardState;
  members: MemberInfo[];
  labelStyle: LabelStyle;
  onOpen: () => void;
}) {
  const progress = checklistProgress(card);
  const status = dueStatus(card.dueDate);
  const cardLabels = (card.labels ?? [])
    .map((id) => state.labels.find((l) => l.id === id))
    .filter(Boolean) as Label[];
  const assignees = (card.assigneeIds ?? [])
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as MemberInfo[];

  return (
    <tr
      className="border-b border-border/50 transition-colors hover:bg-secondary/30 cursor-pointer"
      onClick={onOpen}
    >
      <td className="px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-primary/60" />
      </td>
      <td className="px-3 py-2 font-medium">{card.title}</td>
      <td className="px-3 py-2 text-muted-foreground">{card.columnTitle}</td>
      <td className="px-3 py-2">
        {card.dueDate && (
          <span
            className={
              status === "overdue"
                ? "text-destructive"
                : status === "soon"
                  ? "text-chart-1"
                  : "text-muted-foreground"
            }
          >
            {formatDue(card.dueDate)}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {progress.total > 0 && (
          <span className="text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <span
              key={l.id}
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${labelClass(l.color, labelStyle)}`}
            >
              {l.name}
            </span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary ring-2 ring-background"
              title={m.name}
            >
              {m.name.slice(0, 1).toUpperCase()}
            </div>
          ))}
          {assignees.length > 4 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
              +{assignees.length - 4}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
