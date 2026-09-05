import type { BoardState } from "./board";

export type GeneratedBoard = {
  name: string;
  columns: Array<{
    title: string;
    cards: Array<{
      title: string;
      description?: string;
      dueDate?: string | null;
      labels?: string[];
    }>;
  }>;
};

export type AiProvider = {
  generateBoard: (prompt: string) => Promise<GeneratedBoard>;
  generateChecklist: (cardTitle: string, cardDescription?: string) => Promise<string[]>;
  generateDailyFocus: (cards: BoardState["cards"]) => Promise<string[]>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function soonDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parsePromptToBoard(prompt: string): GeneratedBoard {
  const lower = prompt.toLowerCase();
  if (lower.includes("blog") || lower.includes("content") || lower.includes("article")) {
    return {
      name: "Content Calendar",
      columns: [
        {
          title: "Ideas",
          cards: [
            { title: "Brainstorm topic ideas", description: "List 10 potential topics" },
            { title: "Research trending keywords", description: "Use SEO tools" },
          ],
        },
        {
          title: "Writing",
          cards: [
            { title: "Draft: Getting Started guide", dueDate: soonDate(3) },
            { title: "Edit: Best practices post", dueDate: soonDate(5) },
          ],
        },
        {
          title: "Review",
          cards: [{ title: "Review: Introduction article", dueDate: soonDate(7) }],
        },
        {
          title: "Published",
          cards: [{ title: "Welcome post", description: "Already published" }],
        },
      ],
    };
  }
  if (lower.includes("launch") || lower.includes("product") || lower.includes("release")) {
    return {
      name: "Product Launch",
      columns: [
        {
          title: "Pre-launch",
          cards: [
            { title: "Define launch goals", description: "Set measurable KPIs" },
            { title: "Prepare marketing assets", description: "Create banners, copy, videos" },
            { title: "Set up landing page", dueDate: soonDate(7) },
          ],
        },
        {
          title: "Launch week",
          cards: [
            { title: "Publish announcement", dueDate: soonDate(10) },
            { title: "Send newsletter", dueDate: soonDate(10) },
            { title: "Social media blitz", dueDate: soonDate(11) },
          ],
        },
        {
          title: "Post-launch",
          cards: [
            { title: "Collect user feedback", dueDate: soonDate(14) },
            { title: "Analyze metrics", dueDate: soonDate(14) },
            { title: "Plan iteration", dueDate: soonDate(21) },
          ],
        },
      ],
    };
  }
  const name = prompt.length > 40 ? prompt.slice(0, 40) + "…" : prompt;
  return {
    name: name || "New Project",
    columns: [
      {
        title: "To Do",
        cards: [
          { title: "Define scope and requirements", description: `For: ${prompt}` },
          { title: "Break down into tasks", description: "Identify key milestones" },
          { title: "Assign responsibilities", dueDate: soonDate(7) },
        ],
      },
      {
        title: "In Progress",
        cards: [
          { title: "Initial research", dueDate: soonDate(3) },
          { title: "First draft / prototype", dueDate: soonDate(10) },
        ],
      },
      { title: "Done", cards: [{ title: "Project kickoff", description: "Completed" }] },
    ],
  };
}

function generateChecklistItems(title: string, description?: string): string[] {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (text.includes("write") || text.includes("article") || text.includes("blog")) {
    return [
      "Research the topic",
      "Create an outline",
      "Write first draft",
      "Edit and proofread",
      "Add images/media",
      "Publish",
    ];
  }
  if (text.includes("launch") || text.includes("release")) {
    return [
      "Finalize feature list",
      "Run QA testing",
      "Prepare release notes",
      "Update documentation",
      "Announce to users",
      "Monitor feedback",
    ];
  }
  if (text.includes("design") || text.includes("ui") || text.includes("ux")) {
    return [
      "Gather requirements",
      "Create wireframes",
      "Design mockups",
      "Get feedback",
      "Iterate on design",
      "Hand off to development",
    ];
  }
  return [
    "Break down into subtasks",
    "Set deadlines",
    "Identify dependencies",
    "Assign to team members",
    "Review progress",
  ];
}

function rankCardsForToday(cards: BoardState["cards"]): string[] {
  const now = new Date();
  const scored = Object.values(cards).map((card) => {
    let score = 0;
    if (card.dueDate) {
      const due = new Date(`${card.dueDate}T23:59:59`);
      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
      if (daysUntil < 0) score += 100;
      else if (daysUntil <= 2) score += 80;
      else if (daysUntil <= 7) score += 40;
    }
    if (card.labels?.includes("priority")) score += 50;
    if (card.labels?.includes("bug")) score += 30;
    const total = card.checklist?.length ?? 0;
    const done = card.checklist?.filter((i) => i.done).length ?? 0;
    if (total > 0 && done < total) score += 20;
    return { card, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.card.id);
}

export const ai: AiProvider = {
  async generateBoard(prompt: string) {
    await delay(800);
    return parsePromptToBoard(prompt);
  },
  async generateChecklist(cardTitle: string, cardDescription?: string) {
    await delay(500);
    return generateChecklistItems(cardTitle, cardDescription);
  },
  async generateDailyFocus(cards: BoardState["cards"]) {
    await delay(400);
    return rankCardsForToday(cards);
  },
};
