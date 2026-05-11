"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type State = { userId: string | null; ready: boolean };

export function useAnonymousSession(): State {
  const [state, setState] = useState<State>({ userId: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();

    (async () => {
      const { data } = await supabase.auth.getSession();
      let userId = data.session?.user.id ?? null;
      if (!userId) {
        const { data: signed } = await supabase.auth.signInAnonymously();
        userId = signed.user?.id ?? null;
      }
      if (!cancelled) setState({ userId, ready: true });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
