import Feed from "./_components/feed";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Question } from "@/lib/types";

export default async function HomePage() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("questions")
    .select("id, body, created_at, vote_count")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const initialQuestions: Question[] = data ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AskWave</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Live Q&amp;A, powered by the crowd.
        </p>
      </header>
      <section aria-label="Feed">
        <Feed initialQuestions={initialQuestions} />
      </section>
    </main>
  );
}
