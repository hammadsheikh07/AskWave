"use client";

import { useCallback, useRef } from "react";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { useRealtimeQuestions } from "@/hooks/use-realtime-questions";
import { useVotedQuestions } from "@/hooks/use-voted-questions";
import QuestionForm from "./question-form";
import QuestionList from "./question-list";
import type { Question } from "@/lib/types";

type Props = {
  initialQuestions: Question[];
};

export default function Feed({ initialQuestions }: Props) {
  const { userId, ready } = useAnonymousSession();
  const { questions, applyVote } = useRealtimeQuestions(initialQuestions);
  const { hasVoted, toggleVote } = useVotedQuestions(userId);
  const pendingRef = useRef<Set<string>>(new Set());

  const onToggleVote = useCallback(
    async (id: string) => {
      if (!ready || pendingRef.current.has(id)) return;
      pendingRef.current.add(id);
      const wasVoted = hasVoted(id);
      applyVote(id, wasVoted ? -1 : 1);
      try {
        const nowVoted = await toggleVote(id);
        if (nowVoted === wasVoted) applyVote(id, wasVoted ? 1 : -1);
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [ready, hasVoted, applyVote, toggleVote],
  );

  return (
    <div className="space-y-6">
      <QuestionForm disabled={!ready} />
      <QuestionList
        questions={questions}
        hasVoted={hasVoted}
        onToggleVote={onToggleVote}
        disabled={!ready}
      />
    </div>
  );
}
