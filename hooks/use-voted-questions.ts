"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Result = {
  hasVoted: (id: string) => boolean;
  toggleVote: (id: string) => Promise<boolean>;
};

export function useVotedQuestions(userId: string | null): Result {
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const seededForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || seededForRef.current === userId) return;
    let cancelled = false;
    const supabase = getSupabaseBrowser();

    (async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("question_id")
        .eq("user_id", userId);
      if (cancelled || error) return;
      setVoted(new Set(data.map((r) => r.question_id as string)));
      seededForRef.current = userId;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
        if (error) {
          console.error("toggleVote delete failed", error);
          return true;
        }
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
