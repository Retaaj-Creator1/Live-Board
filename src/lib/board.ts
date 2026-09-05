import type { LabelStyle } from "./theme";

export type LabelId = string;

export type LabelColor = "amber" | "red" | "teal" | "blue" | "violet" | "green" | "pink" | "slate";

export const LABEL_COLORS: Array<{
  id: LabelColor;
  name: string;
  className: string;
  solid: string;
  outline: string;
  dot: string;
}> = [
  {
    id: "amber",
    name: "Amber",
    className: "bg-chart-1/20 text-chart-1 border-chart-1/40",
    solid: "bg-chart-1 text-background border-transparent",
    outline: "bg-transparent text-chart-1 border-chart-1",
    dot: "bg-chart-1",
  },
  {
    id: "red",
    name: "Red",
    className: "bg-destructive/20 text-destructive border-destructive/40",
    solid: "bg-destructive text-background border-transparent",
    outline: "bg-transparent text-destructive border-destructive",
    dot: "bg-destructive",
  },
  {
    id: "teal",
    name: "Teal",
    className: "bg-chart-2/20 text-chart-2 border-chart-2/40",
    solid: "bg-chart-2 text-background border-transparent",
    outline: "bg-transparent text-chart-2 border-chart-2",
    dot: "bg-chart-2",
  },
  {
    id: "blue",
    name: "Blue",
    className: "bg-chart-3/20 text-chart-3 border-chart-3/40",
    solid: "bg-chart-3 text-background border-transparent",
    outline: "bg-transparent text-chart-3 border-chart-3",
    dot: "bg-chart-3",
  },
  {
    id: "violet",
    name: "Violet",
    className: "bg-chart-4/20 text-chart-4 border-chart-4/40",
    solid: "bg-chart-4 text-background border-transparent",
    outline: "bg-transparent text-chart-4 border-chart-4",
    dot: "bg-chart-4",
  },
  {
    id: "green",
    name: "Green",
    className: "bg-chart-5/20 text-chart-5 border-chart-5/40",
    solid: "bg-chart-5 text-background border-transparent",
    outline: "bg-transparent text-chart-5 border-chart-5",
    dot: "bg-chart-5",
  },
  {
    id: "pink",
    name: "Pink",
    className: "bg-primary/20 text-primary border-primary/40",
    solid: "bg-primary text-background border-transparent",
    outline: "bg-transparent text-primary border-primary",
    dot: "bg-primary",
  },
  {
    id: "slate",
    name: "Slate",
    className: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/40",
    solid: "bg-muted-foreground text-background border-transparent",
    outline: "bg-transparent text-muted-foreground border-muted-foreground",
    dot: "bg-muted-foreground",
  },
];

export type Label = {
  id: LabelId;
  name: string;
  color: LabelColor;
};

export const DEFAULT_LABELS: Label[] = [
  { id: "priority", name: "Priority", color: "amber" },
  { id: "bug", name: "Bug", color: "red" },
  { id: "frontend", name: "Frontend", color: "teal" },
  { id: "backend", name: "Backend", color: "blue" },
  { id: "design", name: "Design", color: "violet" },
  { id: "idea", name: "Idea", color: "green" },
];

export function labelClass(color: LabelColor, style: LabelStyle = "soft") {
  const entry = LABEL_COLORS.find((c) => c.id === color) ?? LABEL_COLORS[7]!;
  if (style === "solid") return entry.solid;
  if (style === "outline") return entry.outline;
  return entry.className;
}

export function labelDot(color: LabelColor) {
  return (LABEL_COLORS.find((c) => c.id === color) ?? LABEL_COLORS[7]!).dot;
}

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Comment = {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  mentions?: string[];
  createdAt: string;
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
};

export type Card = {
  id: string;
  title: string;
  description?: string;
  labels?: LabelId[];
  dueDate?: string | null;
  assigneeIds?: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  comments?: Comment[];
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardSettings = {
  boardTheme: string;
  dialogTheme: string;
  labelStyle: LabelStyle;
};

export const DEFAULT_SETTINGS: BoardSettings = {
  boardTheme: "midnight",
  dialogTheme: "match",
  labelStyle: "soft",
};

export type BoardState = {
  name: string;
  labels: Label[];
  settings: BoardSettings;
  columns: Column[];
  cards: Record<string, Card>;
};

export const STORAGE_KEY = "openboard.board.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyCard(id: string, title: string): Card {
  return {
    id,
    title,
    description: "",
    labels: [],
    dueDate: null,
    checklist: [],
    attachments: [],
    comments: [],
  };
}

export function createInitialBoard(): BoardState {
  const seed: Array<[string, string[]]> = [
    ["Backlog", ["Sketch board layout", "List must-have features"]],
    ["In progress", ["Build drag and drop"]],
    ["Review", []],
    ["Done", ["Set up the project"]],
  ];

  const cards: Record<string, Card> = {};
  const columns: Column[] = seed.map(([title, titles]) => ({
    id: uid(),
    title,
    cardIds: titles.map((t) => {
      const id = uid();
      cards[id] = emptyCard(id, t);
      return id;
    }),
  }));

  return {
    name: "OpenBoard",
    labels: DEFAULT_LABELS.map((l) => ({ ...l })),
    settings: { ...DEFAULT_SETTINGS },
    columns,
    cards,
  };
}

function normalizeCard(card: Card): Card {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? "",
    labels: Array.isArray(card.labels) ? card.labels : [],
    dueDate: card.dueDate ?? null,
    assigneeIds: Array.isArray(card.assigneeIds) ? card.assigneeIds : [],
    checklist: Array.isArray(card.checklist) ? card.checklist : [],
    attachments: Array.isArray(card.attachments) ? card.attachments : [],
    comments: Array.isArray(card.comments) ? card.comments : [],
  };
}

export function loadBoard(): BoardState {
  if (typeof window === "undefined") return createInitialBoard();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialBoard();
    const parsed = JSON.parse(raw) as BoardState;
    if (!parsed?.columns || !parsed?.cards) return createInitialBoard();
    const cards: Record<string, Card> = {};
    Object.values(parsed.cards).forEach((c) => {
      cards[c.id] = normalizeCard(c);
    });
    const labels =
      Array.isArray(parsed.labels) && parsed.labels.length
        ? parsed.labels
        : DEFAULT_LABELS.map((l) => ({ ...l }));
    const settings: BoardSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
    return { ...parsed, labels, settings, cards };
  } catch {
    return createInitialBoard();
  }
}

export function saveBoard(state: BoardState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function findColumnOfCard(state: BoardState, cardId: string) {
  return state.columns.find((c) => c.cardIds.includes(cardId));
}

export function checklistProgress(card: Card) {
  const items = card.checklist ?? [];
  return { done: items.filter((i) => i.done).length, total: items.length };
}

export function dueStatus(dueDate?: string | null) {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "overdue" as const;
  if (days <= 2) return "soon" as const;
  return "later" as const;
}

export function formatDue(dueDate: string) {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function matchesQuery(card: Card, labels: Label[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const labelNames = (card.labels ?? [])
    .map((id) => labels.find((l) => l.id === id)?.name ?? "")
    .join(" ");
  const fileNames = (card.attachments ?? []).map((a) => a.name).join(" ");
  const comments = (card.comments ?? []).map((c) => `${c.author} ${c.text}`).join(" ");
  return `${card.title} ${card.description ?? ""} ${labelNames} ${fileNames} ${comments}`
    .toLowerCase()
    .includes(q);
}
