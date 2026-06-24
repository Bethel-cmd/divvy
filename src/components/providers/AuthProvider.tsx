"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let resolved = false;

    // Suppress refresh token errors in console (harmless when no session exists)
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (
        args[0]?.message?.includes("Invalid Refresh Token") ||
        args[0]?.message?.includes("Refresh Token Not Found") ||
        (typeof args[0] === "string" && args[0].includes("Invalid Refresh Token"))
      ) {
        return;
      }
      originalError(...args);
    };

    function markResolved(nextUser: User | null) {
      resolved = true;
      setUser(nextUser);
      setLoading(false);
    }

    // Primary path: onAuthStateChange fires immediately with INITIAL_SESSION,
    // giving us the local session without a network call to /auth/v1/user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      markResolved(session?.user ?? null);
    });

    // Fallback path: if onAuthStateChange hasn't fired within 3s (network
    // hiccup, dropped event, etc.), explicitly fetch the session so the app
    // never gets stuck on a permanent loading screen.
    const fallbackTimer = setTimeout(async () => {
      console.log("AUTH: fallback timer fired, resolved =", resolved);
      if (resolved) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("AUTH: fallback getSession result", session);
        if (!resolved) markResolved(session?.user ?? null);
      } catch (err) {
        console.error("AUTH: fallback getSession threw", err);
        if (!resolved) markResolved(null);
      }
    }, 3000);

    // Hard safety net: never let loading stay true longer than 6s no matter what.
    const hardTimer = setTimeout(() => {
      if (!resolved) markResolved(null);
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
      clearTimeout(hardTimer);
      console.error = originalError;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
