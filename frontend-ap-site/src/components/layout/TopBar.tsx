"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSession, signOut, type Session } from "@/lib/auth-store";
import { clearWorkbook } from "@/lib/workbook-store";

export function TopBar() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  function handleSignOut() {
    signOut();
    clearWorkbook();
    router.replace("/");
  }

  return (
    <header className="border-b border-border-strong bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Landmark size={18} strokeWidth={2} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text-primary">
              Government Payment Analytics Portal
            </div>
            <div className="text-xs text-text-muted">Vendors First</div>
          </div>
        </div>
        {session && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary">
              Signed in as <span className="font-medium">{session.email}</span>
            </span>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
