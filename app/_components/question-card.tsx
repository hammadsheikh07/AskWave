import QuestionBody from "./question-body";
import QuestionMeta from "./question-meta";
import UpvoteButton from "./upvote-button";
import type { Question } from "@/lib/types";

type Props = {
  question: Question;
  hasVoted: boolean;
  onToggleVote: () => void;
  disabled?: boolean;
};

export default function QuestionCard({
  question,
  hasVoted,
  onToggleVote,
  disabled,
}: Props) {
  return (
    <article className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4">
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
