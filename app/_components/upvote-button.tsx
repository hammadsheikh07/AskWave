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
          ? "border-rose-400 bg-rose-500 text-white shadow-sm hover:bg-rose-600"
          : "border-neutral-300 bg-white/80 text-neutral-700 hover:border-rose-300 hover:bg-white hover:text-rose-600",
      )}
    >
      <span aria-hidden="true">▲</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
