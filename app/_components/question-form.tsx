"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import CharCounter from "./char-counter";

const MAX = 280;

type Props = {
  disabled?: boolean;
};

export default function QuestionForm({ disabled }: Props) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = body.trim();
  const over = body.length > MAX;
  const submitDisabled = pending || over || trimmed.length === 0 || disabled;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error: insertError } = await supabase
      .from("questions")
      .insert({ body: trimmed });
    setPending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBody("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ask anything…"
        aria-label="Your question"
        rows={3}
        className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      <div className="flex items-center justify-between">
        <CharCounter count={body.length} max={MAX} />
        <button
          type="submit"
          disabled={submitDisabled}
          className={cn(
            "rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
