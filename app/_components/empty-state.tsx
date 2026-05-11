type Props = {
  message?: string;
};

export default function EmptyState({
  message = "No questions yet — be the first to ask.",
}: Props) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}
