"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getSession, type Session } from "./auth-store";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useClientHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function useRequireAuth(): { session: Session | null; ready: boolean } {
  const router = useRouter();
  const hydrated = useClientHydrated();
  const session = hydrated ? getSession() : null;
  const signedIn = session !== null;

  useEffect(() => {
    if (hydrated && !signedIn) {
      router.replace("/");
    }
  }, [hydrated, router, signedIn]);

  return { session, ready: hydrated && signedIn };
}
