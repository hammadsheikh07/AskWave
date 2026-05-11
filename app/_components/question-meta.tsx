import { relativeTime } from "@/lib/format";

type Props = {
  createdAt: string;
};

export default function QuestionMeta({ createdAt }: Props) {
  return (
    <time
      dateTime={createdAt}
      className="text-xs tabular-nums text-neutral-500"
    >
      {relativeTime(createdAt)}
    </time>
  );
}
