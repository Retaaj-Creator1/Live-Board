import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useMembers } from "@/hooks/useMembers";
import { extractMentionIds, type MemberInfo } from "@/lib/realtime";

type Props = {
  workspaceId: string | null;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string, mentions: string[]) => void;
  placeholder?: string;
};

export function MentionInput({
  workspaceId,
  value,
  onChange,
  onSubmit,
  placeholder = "Write a comment…",
}: Props) {
  const { members } = useMembers(workspaceId);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [caretIndex, setCaretIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract the @mention query being typed.
  const checkForMention = (text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");
    if (atIndex === -1) {
      setShowMentions(false);
      return;
    }
    const afterAt = beforeCursor.slice(atIndex + 1);
    // Only show if no space after @ (still typing the mention).
    if (afterAt.includes(" ")) {
      setShowMentions(false);
      return;
    }
    setMentionQuery(afterAt.toLowerCase());
    setShowMentions(true);
    setCaretIndex(atIndex);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(mentionQuery) || m.email.toLowerCase().includes(mentionQuery),
  );

  const insertMention = (member: MemberInfo) => {
    const before = value.slice(0, caretIndex);
    const after = value.slice(caretIndex + 1 + mentionQuery.length);
    const mention = `@${member.name} `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim(), extractMentionIds(value, members));
        onChange("");
      }
    }
  };

  // Close mentions on outside click.
  useEffect(() => {
    if (!showMentions) return;
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMentions]);

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          checkForMention(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => checkForMention(e.currentTarget.value, e.currentTarget.selectionStart)}
        onClick={(e) => checkForMention(e.currentTarget.value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
      />

      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
