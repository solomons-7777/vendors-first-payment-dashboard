"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type Session } from "./auth-store";

export function useRequireAuth(): { session: Session | null; ready: boolean } {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = getSession();
    if (!existing) {
      router.replace("/");
      return;
    }
    setSession(existing);
    setReady(true);
  }, [router]);

  return { session, ready };
}
