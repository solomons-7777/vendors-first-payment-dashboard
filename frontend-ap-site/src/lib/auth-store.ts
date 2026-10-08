const SESSION_KEY = "ap-portal:session";

export const DEMO_CREDENTIALS = {
  email: "demo@vendorsfirst.club",
  password: "demo123",
};

export interface Session {
  email: string;
  signedInAt: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function signIn(email: string): Session {
  const session: Session = { email, signedInAt: new Date().toISOString() };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
}
