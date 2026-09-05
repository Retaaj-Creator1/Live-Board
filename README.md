# OpenBoard

A free, open-source, Trello-like Kanban board built with React, TanStack Start, Tailwind CSS, and dnd-kit. Drag-and-drop cards, custom labels, due dates, checklists, file attachments, comments, and themeable appearance — all running locally in your browser with on-device persistence. Optional cloud sync with Neon Postgres + Better Auth.

![OpenBoard](https://biz-tech-board.lovable.app)

## Features

- **Drag-and-drop Kanban** — move cards between lists and reorder lists, powered by dnd-kit
- **Card details** — rich description, labels, due dates, and checklists with progress tracking
- **Custom labels** — create your own labels with any name and color
- **File attachments** — upload images, PDFs, and documents (stored in IndexedDB, up to 25 MB per file)
- **Comments** — discuss cards with timestamped, editable comments
- **Appearance settings** — choose board backgrounds, dialog themes, and label styles (Soft / Solid / Outline)
- **Search** — find cards across the entire board by text or label
- **Local persistence** — everything saves to your browser; close and reopen, your board is still there
- **Cloud sync** — sign in with email/password to sync your boards across devices (Neon Postgres + Better Auth)
- **Workspaces** — organize boards into workspaces with role-based access (owner/admin/member/guest)
- **PWA support** — installable, works offline via service worker

## Tech Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Framework   | TanStack Start v1 (React 19, SSR) |
| Styling     | Tailwind CSS v4                   |
| Drag & drop | @dnd-kit/core, @dnd-kit/sortable  |
| Storage     | localStorage + IndexedDB          |
| Build       | Vite 7                            |
| Deploy      | Cloudflare Workers (Edge)         |

## Quick Start

```sh
git clone https://github.com/<your-username>/flow-board.git
cd flow-board
npm install
npm run dev
```

Open the local URL shown in your terminal.

## Roadmap

- [x] M1 — Working Kanban board (drag-and-drop, local persistence)
- [x] M2 — Card system (labels, due dates, checklists, search)
- [x] Custom labels & file attachments
- [x] Appearance settings & comments
- [x] M3 — Cloud sync (Neon Postgres + Better Auth)
- [x] M4 — Workspaces & roles (schema + workspace switcher + membership tables)
- [x] M5 — Real-time collaboration (activity feed, notifications, assignees, @mentions)
- [x] M6 — Table & calendar views (kanban/table/calendar switcher)
- [x] M8 — PWA & offline sync (manifest + service worker)
- [ ] M7 — AI-assisted task creation
- [ ] M9 — Distributable desktop app (Electron `.exe`)

See [`docs/`](./docs) and the in-project plan for details.

## Project Structure

```
src/
├── components/board/   # Board, columns, cards, dialogs
├── hooks/              # useBoard state management
├── lib/                # board.ts, attachments.ts, theme.ts
├── routes/             # TanStack Router file routes
└── styles.css          # Tailwind v4 + design tokens
```

## License

MIT — see [LICENSE](./LICENSE). Free to fork, modify, and distribute.

## Acknowledgements

Built with [Lovable](https://lovable.dev).
