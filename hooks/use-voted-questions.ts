"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Result = {
  hasVoted: (id: string) => boolean;
  toggleVote: (id: string) => Promise<boolean>;
};

export function useVotedQuestions(userId: string | null): Result {
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [seededFor, setSeededFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || seededFor === userId) return;
    let cancelled = false;
    const supabase = getSupabaseBrowser();

    (async () => {
      const { data } = await supabase
        .from("votes")
        .select("question_id")
        .eq("user_id", userId);
      if (cancelled) return;
      setVoted(new Set((data ?? []).map((r) => r.question_id as string)));
      setSeededFor(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, seededFor]);

  const hasVoted = useCallback((id: string) => voted.has(id), [voted]);

  const toggleVote = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;
      const supabase = getSupabaseBrowser();
      const had = voted.has(id);

      if (had) {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("question_id", id)
          .eq("user_id", userId);
        if (error) return true;
        setVoted((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        return false;
      }

      const { error } = await supabase
        .from("votes")
        .insert({ question_id: id, user_id: userId });
      if (error && error.code !== "23505") return false;
      setVoted((s) => new Set(s).add(id));
      return true;
    },
    [userId, voted],
  );

  return { hasVoted, toggleVote };
}
