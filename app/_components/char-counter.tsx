import { cn } from "@/lib/cn";

type Props = {
  count: number;
  max: number;
};

export default function CharCounter({ count, max }: Props) {
  const over = count > max;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        over ? "text-red-600" : "text-neutral-500",
      )}
    >
      {count} / {max}
    </span>
  );
}
