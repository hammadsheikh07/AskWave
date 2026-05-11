import { cn } from "@/lib/cn";

type Props = {
  count: number;
  hasVoted: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export default function UpvoteButton({
  count,
  hasVoted,
  onClick,
  disabled,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={hasVoted}
      aria-label={hasVoted ? "Remove upvote" : "Upvote"}
      className={cn(
        "inline-flex min-w-[3.25rem] items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        hasVoted
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
      )}
    >
      <span aria-hidden="true">▲</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
