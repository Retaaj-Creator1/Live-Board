import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const Board = lazy(() => import("./Board").then((m) => ({ default: m.Board })));

function BoardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border px-6 py-5">
        <div className="mx-auto max-w-[110rem]">
          <div className="h-7 w-40 rounded bg-muted" />
          <div className="mt-2 h-4 w-64 rounded bg-muted/60" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[110rem] gap-4 px-6 py-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 w-[19rem] shrink-0 rounded-xl border border-border bg-secondary/40"
          />
        ))}
      </div>
    </div>
  );
}

export function BoardShell() {
  return (
    <ClientOnly fallback={<BoardSkeleton />}>
      <Suspense fallback={<BoardSkeleton />}>
        <Board />
      </Suspense>
    </ClientOnly>
  );
}
