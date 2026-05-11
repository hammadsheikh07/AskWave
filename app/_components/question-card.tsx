import QuestionBody from "./question-body";
import QuestionMeta from "./question-meta";
import UpvoteButton from "./upvote-button";
import { cn } from "@/lib/cn";
import type { Question } from "@/lib/types";

type Props = {
  question: Question;
  hasVoted: boolean;
  onToggleVote: () => void;
  disabled?: boolean;
  tone?: string;
};

export default function QuestionCard({
  question,
  hasVoted,
  onToggleVote,
  disabled,
  tone,
}: Props) {
  return (
    <article
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md",
        tone ?? "border-neutral-200 bg-white",
      )}
    >
      <UpvoteButton
        count={question.vote_count}
        hasVoted={hasVoted}
        onClick={onToggleVote}
        disabled={disabled}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <QuestionBody body={question.body} />
        <QuestionMeta createdAt={question.created_at} />
      </div>
    </article>
  );
}
