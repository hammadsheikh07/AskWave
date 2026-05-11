"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { compareQuestions } from "@/lib/format";
import type { Question } from "@/lib/types";

type Result = {
  questions: Question[];
  applyVote: (id: string, delta: number) => void;
};

export function useRealtimeQuestions(initialQuestions: Question[]): Result {
  const [byId, setById] = useState<Record<string, Question>>(() =>
    Object.fromEntries(initialQuestions.map((q) => [q.id, q])),
  );

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const upsert = (row: Question) =>
      setById((m) => ({ ...m, [row.id]: row }));

    const channel = supabase
      .channel("questions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "questions" },
        ({ new: row }) => upsert(row as Question),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "questions" },
        ({ new: row }) => upsert(row as Question),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyVote = useCallback((id: string, delta: number) => {
    setById((m) => {
      const cur = m[id];
      if (!cur) return m;
      return {
        ...m,
        [id]: { ...cur, vote_count: Math.max(0, cur.vote_count + delta) },
      };
    });
  }, []);

  const questions = useMemo(
    () => Object.values(byId).sort(compareQuestions),
    [byId],
  );

  return { questions, applyVote };
}
