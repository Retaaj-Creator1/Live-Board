import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Cloud, CloudOff, LogOut, Palette, Plus, RotateCcw, Search, UserRound, X } from "lucide-react";
import { useBoard } from "@/hooks/useBoard";
import { useAuth } from "@/hooks/useAuth";
import { findColumnOfCard, matchesQuery } from "@/lib/board";
import { BoardColumn } from "./BoardColumn";
import { CardDialog } from "./CardDialog";
import { BoardSettingsDialog } from "./BoardSettingsDialog";
import { AuthDialog } from "./AuthDialog";
import { boardTheme, themeStyle } from "@/lib/theme";

export function Board() {
  const auth = useAuth();
  const board = useBoard(auth.user?.id ?? null);
  const { state } = board;
  const [authOpen, setAuthOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newList, setNewList] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [query, setQuery] = useState("");
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = boardTheme(state.settings.boardTheme);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overId = String(over.id);

    // Reordering whole lists
    if (activeIdStr.startsWith("col:")) {
      if (!overId.startsWith("col:") || overId === activeIdStr) return;
      const columnId = activeIdStr.slice(4);
      const toIndex = state.columns.findIndex((c) => c.id === overId.slice(4));
      if (toIndex !== -1) board.moveColumn(columnId, toIndex);
      return;
    }

    const cardId = activeIdStr;

    if (overId.startsWith("column:")) {
      const columnId = overId.slice("column:".length);
      const target = state.columns.find((c) => c.id === columnId);
      if (target) board.moveCard(cardId, columnId, target.cardIds.length);
      return;
    }
    if (overId.startsWith("col:")) {
      const columnId = overId.slice(4);
      const target = state.columns.find((c) => c.id === columnId);
      if (target) board.moveCard(cardId, columnId, target.cardIds.length);
      return;
    }

    if (overId === cardId) return;
    const targetColumn = findColumnOfCard(state, overId);
    if (!targetColumn) return;
    const index = targetColumn.cardIds.indexOf(overId);
    board.moveCard(cardId, targetColumn.id, index);
  };

  const activeCard = activeId && !activeId.startsWith("col:") ? state.cards[activeId] : null;
  const activeColumn = activeId?.startsWith("col:")
    ? state.columns.find((c) => c.id === activeId.slice(4))
    : null;
  const total = Object.keys(state.cards).length;
  const matching = Object.values(state.cards).filter((c) => matchesQuery(c, state.labels, query)).length;
  const openCard = openCardId ? state.cards[openCardId] ?? null : null;
  const openCardColumn = openCardId ? findColumnOfCard(state, openCardId) : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={themeStyle(theme)}>
      <header className="border-b border-border px-6 py-5">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">{state.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {query ? (
                <span>
                  {matching} of {total} cards match "{query}"
                </span>
              ) : (
                <span>
                  {total} cards across {state.columns.length} lists ·{" "}
                  {auth.user ? (
                    board.syncError ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <CloudOff className="h-3.5 w-3.5" /> {board.syncError}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Cloud className="h-3.5 w-3.5" /> synced to your account
                      </span>
                    )
                  ) : (
                    <span>saved on this device</span>
                  )}
                </span>
              )}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cards, labels…"
                aria-label="Search cards"
                className="w-56 rounded-lg border border-border bg-input/40 py-1.5 pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Palette className="h-4 w-4" /> Appearance
            </button>
            <button
              onClick={() => {
                if (confirm("Reset the board to its starting cards?")) board.resetBoard();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            {auth.user === undefined ? null : auth.user ? (
              <button
                onClick={() => void auth.signOut()}
                title={`Signed in as ${auth.user.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> {auth.user.name}
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <UserRound className="h-4 w-4" /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto px-6 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="mx-auto flex max-w-[110rem] items-start gap-4">
            <SortableContext
              items={state.columns.map((c) => `col:${c.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {state.columns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  cards={state.cards}
                  boardLabels={state.labels}
                  labelStyle={state.settings.labelStyle}
                  query={query}
                  onAddCard={(title) => board.addCard(column.id, title)}
                  onOpenCard={setOpenCardId}
                  onDeleteCard={board.deleteCard}
                  onRenameColumn={(title) => board.renameColumn(column.id, title)}
                  onDeleteColumn={() => board.deleteColumn(column.id)}
                />
              ))}
            </SortableContext>

            <div className="w-[19rem] shrink-0">
              {addingList ? (
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <input
                    autoFocus
                    value={newList}
                    placeholder="List name"
                    onChange={(e) => setNewList(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        board.addColumn(newList);
                        setNewList("");
                        setAddingList(false);
                      }
                      if (e.key === "Escape") setAddingList(false);
                    }}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingList(true)}
                  className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                >
                  <Plus className="h-4 w-4" /> Add another list
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="w-[17rem] rotate-2 rounded-lg border border-primary/50 bg-card p-3 text-sm shadow-lg">
                {activeCard.title}
              </div>
            ) : activeColumn ? (
              <div className="w-[19rem] rotate-1 rounded-xl border border-primary/50 bg-secondary p-3 text-sm font-semibold uppercase shadow-lg">
                {activeColumn.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <CardDialog
        card={openCard}
        columnTitle={openCardColumn?.title ?? ""}
        onClose={() => setOpenCardId(null)}
        onUpdate={(patch) => openCardId && board.updateCard(openCardId, patch)}
        labels={state.labels}
        settings={state.settings}
        onToggleLabel={(label) => openCardId && board.toggleLabel(openCardId, label)}
        onCreateLabel={board.createLabel}
        onUpdateLabel={board.updateLabel}
        onDeleteLabel={board.deleteLabel}
        onUploadFile={async (file) => {
          if (openCardId) await board.addAttachment(openCardId, file);
        }}
        onRemoveFile={(attachmentId) => {
          if (openCardId) void board.removeAttachment(openCardId, attachmentId);
        }}
        onAddChecklistItem={(text) => openCardId && board.addChecklistItem(openCardId, text)}
        onToggleChecklistItem={(id) => openCardId && board.toggleChecklistItem(openCardId, id)}
        onRemoveChecklistItem={(id) => openCardId && board.removeChecklistItem(openCardId, id)}
        onAddComment={(text) => openCardId && board.addComment(openCardId, text)}
        onUpdateComment={(id, text) => openCardId && board.updateComment(openCardId, id, text)}
        onRemoveComment={(id) => openCardId && board.removeComment(openCardId, id)}
        onDelete={() => openCardId && board.deleteCard(openCardId)}
      />

      <BoardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={state.settings}
        labels={state.labels}
        onChange={board.updateSettings}
        onReset={board.resetSettings}
      />

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
      />
    </div>
  );
}
