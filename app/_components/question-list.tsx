import QuestionCard from "./question-card";
import EmptyState from "./empty-state";
import type { Question } from "@/lib/types";

const TONES = [
  "border-amber-200/70 bg-amber-50/60",
  "border-emerald-200/70 bg-emerald-50/60",
  "border-sky-200/70 bg-sky-50/60",
  "border-rose-200/70 bg-rose-50/60",
  "border-violet-200/70 bg-violet-50/60",
  "border-orange-200/70 bg-orange-50/60",
];

function toneFor(id: string, fallbackIndex: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  if (hash === 0) return TONES[fallbackIndex % TONES.length];
  return TONES[hash % TONES.length];
}

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
    <ul className="space-y-3">
      {questions.map((q, i) => (
        <li key={q.id}>
          <QuestionCard
            question={q}
            hasVoted={hasVoted(q.id)}
            onToggleVote={() => onToggleVote(q.id)}
            disabled={disabled}
            tone={toneFor(q.id, i)}
          />
        </li>
      ))}
    </ul>
  );
}
