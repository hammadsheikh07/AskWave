import QuestionCard from "./question-card";
import EmptyState from "./empty-state";
import type { Question } from "@/lib/types";

type Props = {
  questions: Question[];
  hasVoted: (id: string) => boolean;
  onToggleVote: (id: string) => void;
  disabled?: boolean;
};

export default function QuestionList({
  questions,
  hasVoted,
  onToggleVote,
  disabled,
}: Props) {
  if (questions.length === 0) return <EmptyState />;
  return (
    <ul className="space-y-2">
      {questions.map((q) => (
        <li key={q.id}>
          <QuestionCard
            question={q}
            hasVoted={hasVoted(q.id)}
            onToggleVote={() => onToggleVote(q.id)}
            disabled={disabled}
          />
        </li>
      ))}
    </ul>
  );
}
