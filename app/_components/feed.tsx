"use client";

import { useCallback } from "react";
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

  const onToggleVote = useCallback(
    async (id: string) => {
      if (!ready) return;
      const wasVoted = hasVoted(id);
      applyVote(id, wasVoted ? -1 : 1);
      const nowVoted = await toggleVote(id);
      if (nowVoted === wasVoted) applyVote(id, wasVoted ? 1 : -1);
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
      />
    </div>
  );
}
