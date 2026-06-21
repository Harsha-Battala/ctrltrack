import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureStarterCategories } from "@/lib/starter-categories";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

const seedInFlight = new Map<string, Promise<void>>();

async function maybeSeedStarters(userId: string) {
  if (typeof window === "undefined") return;
  const key = `ctrltrack:seeded:${userId}`;
  if (window.localStorage.getItem(key)) return;
  // Set the flag immediately so a parallel auth event in this tab doesn't double-seed.
  window.localStorage.setItem(key, "1");
  // Also coalesce concurrent calls in this tab to a single promise.
  let p = seedInFlight.get(userId);
  if (!p) {
    p = ensureStarterCategories(userId)
      .then(() => undefined)
      .catch(() => {
        // Roll back the flag so the user can retry manually if seeding genuinely failed.
        window.localStorage.removeItem(key);
      })
      .finally(() => seedInFlight.delete(userId));
    seedInFlight.set(userId, p);
  }
  await p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) maybeSeedStarters(s.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) maybeSeedStarters(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);