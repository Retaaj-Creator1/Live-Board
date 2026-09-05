import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialBoard,
  emptyCard,
  loadBoard,
  saveBoard,
  uid,
  type BoardState,
  type Attachment,
  type Card,
  type Column,
  type LabelColor,
  type LabelId,
  type BoardSettings,
  DEFAULT_SETTINGS,
} from "@/lib/board";
import { deleteFile, putFile } from "@/lib/attachments";
import { fetchBoard, saveBoardToCloud } from "@/lib/board-sync";
import { createMentionNotifications, logActivity } from "@/lib/realtime";

const SYNC_DEBOUNCE_MS = 1_500;

export function useBoard(userId?: string | null, workspaceId?: string | null) {
  const [state, setState] = useState<BoardState>(() => createInitialBoard());
  const [hydrated, setHydrated] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setState(loadBoard());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveBoard(state);
  }, [state, hydrated]);

  // Pull cloud board when signed in and a workspace is selected.
  useEffect(() => {
    if (!hydrated || !userId || !workspaceId) {
      setCloudSynced(false);
      return;
    }
    let cancelled = false;
    fetchBoard({ data: { workspaceId } })
      .then((res) => {
        if (cancelled) return;
        if (res.authenticated && res.state) {
          setState(res.state);
        }
        setCloudSynced(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCloudSynced(true);
          setSyncError("Could not load your board from the cloud");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, workspaceId]);

  // Push changes to the cloud (debounced).
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || !userId || !workspaceId || !cloudSynced) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      saveBoardToCloud({ data: { state, workspaceId } })
        .then(() => {
          setSyncError(null);
          return logActivity({
            data: {
              workspaceId,
              type: "board.updated",
              payload: {
                cards: Object.keys(state.cards).length,
                columns: state.columns.length,
              },
            },
          });
        })
        .then(() => undefined)
        .catch(() => setSyncError("Cloud sync failed — changes are still saved on this device"));
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [state, hydrated, userId, workspaceId, cloudSynced]);

  const addCard = useCallback((columnId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => {
      const id = uid();
      return {
        ...prev,
        cards: { ...prev.cards, [id]: emptyCard(id, trimmed) },
        columns: prev.columns.map((c) =>
          c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c,
        ),
      };
    });
  }, []);

  const updateCard = useCallback((cardId: string, patch: Partial<Omit<Card, "id">>) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, ...patch } } };
    });
  }, []);

  const toggleLabel = useCallback((cardId: string, label: LabelId) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const labels = card.labels ?? [];
      const next = labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label];
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, labels: next } } };
    });
  }, []);

  const addChecklistItem = useCallback((cardId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const checklist = [...(card.checklist ?? []), { id: uid(), text: trimmed, done: false }];
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, checklist } } };
    });
  }, []);

  const toggleChecklistItem = useCallback((cardId: string, itemId: string) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const checklist = (card.checklist ?? []).map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i,
      );
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, checklist } } };
    });
  }, []);

  const removeChecklistItem = useCallback((cardId: string, itemId: string) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const checklist = (card.checklist ?? []).filter((i) => i.id !== itemId);
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, checklist } } };
    });
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setState((prev) => {
      const cards = { ...prev.cards };
      (cards[cardId]?.attachments ?? []).forEach((a) => {
        void deleteFile(a.id).catch(() => undefined);
      });
      delete cards[cardId];
      return {
        ...prev,
        cards,
        columns: prev.columns.map((c) => ({
          ...c,
          cardIds: c.cardIds.filter((id) => id !== cardId),
        })),
      };
    });
  }, []);

  const addColumn = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: uid(), title: trimmed, cardIds: [] }],
    }));
  }, []);

  const renameColumn = useCallback((columnId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title: trimmed } : c)),
    }));
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setState((prev) => {
      const column = prev.columns.find((c) => c.id === columnId);
      const cards = { ...prev.cards };
      column?.cardIds.forEach((id) => delete cards[id]);
      return {
        ...prev,
        cards,
        columns: prev.columns.filter((c) => c.id !== columnId),
      };
    });
  }, []);

  const moveCard = useCallback((cardId: string, toColumnId: string, toIndex: number) => {
    setState((prev) => {
      const from = prev.columns.find((c) => c.cardIds.includes(cardId));
      if (!from) return prev;

      const columns = prev.columns.map((c) => ({ ...c, cardIds: [...c.cardIds] }));
      const source = columns.find((c) => c.id === from.id)!;
      const target = columns.find((c) => c.id === toColumnId);
      if (!target) return prev;

      source.cardIds.splice(source.cardIds.indexOf(cardId), 1);
      const index = Math.max(0, Math.min(toIndex, target.cardIds.length));
      target.cardIds.splice(index, 0, cardId);

      return { ...prev, columns };
    });
  }, []);

  const createLabel = useCallback((name: string, color: LabelColor) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      labels: [...prev.labels, { id: uid(), name: trimmed, color }],
    }));
  }, []);

  const updateLabel = useCallback(
    (labelId: string, patch: { name?: string; color?: LabelColor }) => {
      setState((prev) => ({
        ...prev,
        labels: prev.labels.map((l) =>
          l.id === labelId
            ? {
                ...l,
                ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
                ...(patch.color ? { color: patch.color } : {}),
              }
            : l,
        ),
      }));
    },
    [],
  );

  const deleteLabel = useCallback((labelId: string) => {
    setState((prev) => {
      const cards: Record<string, Card> = {};
      Object.values(prev.cards).forEach((c) => {
        cards[c.id] = { ...c, labels: (c.labels ?? []).filter((l) => l !== labelId) };
      });
      return { ...prev, cards, labels: prev.labels.filter((l) => l.id !== labelId) };
    });
  }, []);

  const addAttachment = useCallback(async (cardId: string, file: File) => {
    const id = uid();
    await putFile(id, file);
    const attachment: Attachment = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      addedAt: new Date().toISOString(),
    };
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: { ...card, attachments: [...(card.attachments ?? []), attachment] },
        },
      };
    });
    return attachment;
  }, []);

  const removeAttachment = useCallback(async (cardId: string, attachmentId: string) => {
    await deleteFile(attachmentId).catch(() => undefined);
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...card,
            attachments: (card.attachments ?? []).filter((a) => a.id !== attachmentId),
          },
        },
      };
    });
  }, []);

  const moveColumn = useCallback((columnId: string, toIndex: number) => {
    setState((prev) => {
      const from = prev.columns.findIndex((c) => c.id === columnId);
      if (from === -1) return prev;
      const columns = [...prev.columns];
      const [moved] = columns.splice(from, 1) as [(typeof columns)[number]];
      columns.splice(Math.max(0, Math.min(toIndex, columns.length)), 0, moved);
      return { ...prev, columns };
    });
  }, []);

  const addComment = useCallback(
    (cardId: string, text: string, mentions: string[] = [], author = "You") => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const cardTitle = state.cards[cardId]?.title ?? "a card";
      setState((prev) => {
        const card = prev.cards[cardId];
        if (!card) return prev;
        const comments = [
          ...(card.comments ?? []),
          {
            id: uid(),
            author,
            text: trimmed,
            mentions: mentions ?? [],
            createdAt: new Date().toISOString(),
          },
        ];
        return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, comments } } };
      });
      if (mentions.length > 0 && workspaceId && userId) {
        void createMentionNotifications({
          data: { workspaceId, mentionedUserIds: mentions, actorName: author, cardTitle },
        }).catch(() => undefined);
      }
    },
    [userId, workspaceId, state.cards],
  );

  const updateComment = useCallback((cardId: string, commentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const comments = (card.comments ?? []).map((c) =>
        c.id === commentId ? { ...c, text: trimmed } : c,
      );
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, comments } } };
    });
  }, []);

  const removeComment = useCallback((cardId: string, commentId: string) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const comments = (card.comments ?? []).filter((c) => c.id !== commentId);
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, comments } } };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<BoardSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetSettings = useCallback(() => {
    setState((prev) => ({ ...prev, settings: { ...DEFAULT_SETTINGS } }));
  }, []);

  const resetBoard = useCallback(() => setState(createInitialBoard()), []);

  const importBoard = useCallback(
    (
      name: string,
      columns: Array<{
        title: string;
        cards: Array<{ title: string; description?: string; dueDate?: string | null }>;
      }>,
    ) => {
      const newColumns = columns.map((col) => {
        const columnId = uid();
        const cardIds: string[] = [];
        const newCards: Record<string, Card> = {};
        for (const card of col.cards) {
          const cardId = uid();
          cardIds.push(cardId);
          newCards[cardId] = emptyCard(cardId, card.title);
          if (card.description) newCards[cardId].description = card.description;
          if (card.dueDate) newCards[cardId].dueDate = card.dueDate;
        }
        return { id: columnId, title: col.title, cardIds, cards: newCards };
      });

      const allCards: Record<string, Card> = {};
      const cols: Column[] = [];
      for (const col of newColumns) {
        cols.push({ id: col.id, title: col.title, cardIds: col.cardIds });
        Object.assign(allCards, col.cards);
      }

      setState((prev) => ({
        ...prev,
        name,
        columns: cols,
        cards: allCards,
      }));
    },
    [],
  );

  return {
    state,
    hydrated,
    cloudSynced,
    syncError,
    addCard,
    updateCard,
    toggleLabel,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    createLabel,
    updateLabel,
    deleteLabel,
    addAttachment,
    removeAttachment,
    deleteCard,
    moveColumn,
    addColumn,
    renameColumn,
    deleteColumn,
    moveCard,
    addComment,
    updateComment,
    removeComment,
    updateSettings,
    resetSettings,
    resetBoard,
    importBoard,
  };
}
