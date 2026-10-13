"use client";

import { useRouter } from "next/navigation";
import { Landmark, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSession, signOut } from "@/lib/auth-store";
import { useClientHydrated } from "@/lib/use-require-auth";
import { clearWorkbook } from "@/lib/workbook-store";

export function TopBar() {
  const router = useRouter();
  const hydrated = useClientHydrated();
  const session = hydrated ? getSession() : null;

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
