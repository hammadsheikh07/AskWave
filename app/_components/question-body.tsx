type Props = {
  body: string;
};

export default function QuestionBody({ body }: Props) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900 line-clamp-6">
      {body}
    </p>
  );
}
