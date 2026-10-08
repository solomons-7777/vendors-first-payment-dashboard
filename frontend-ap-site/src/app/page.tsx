"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { DEMO_CREDENTIALS, signIn } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      signIn(email);
      router.push("/upload");
      return;
    }
    setError("Incorrect email or password.");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Landmark size={22} strokeWidth={2} />
          </span>
          <h1 className="mt-3 text-lg font-semibold text-text-primary">
            Government Payment Analytics Portal
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Sign in to review vendor payment risk and processing performance.
          </p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium text-text-secondary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
                  placeholder="you@agency.gov"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-medium text-text-secondary">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-status-critical">{error}</p>}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-4 flex items-start gap-2 rounded-md bg-status-warning-soft px-3 py-2.5 text-xs text-text-secondary">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-status-warning" />
          <span>
            Unsecured demo build. Use{" "}
            <code className="font-mono">{DEMO_CREDENTIALS.email}</code> /{" "}
            <code className="font-mono">{DEMO_CREDENTIALS.password}</code> to sign in.
            Replace this login before it is reachable outside the company.
          </span>
        </div>
      </div>
    </div>
  );
}
