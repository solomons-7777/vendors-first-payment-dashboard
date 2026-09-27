import type { Workbook } from "./types";

const WORKBOOK_KEY = "ap-portal:workbook";
const FILENAME_KEY = "ap-portal:workbook-filename";

export function getWorkbook(): Workbook | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(WORKBOOK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Workbook;
  } catch {
    return null;
  }
}

export function saveWorkbook(workbook: Workbook, filename: string): void {
  window.sessionStorage.setItem(WORKBOOK_KEY, JSON.stringify(workbook));
  window.sessionStorage.setItem(FILENAME_KEY, filename);
}

export function getWorkbookFilename(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(FILENAME_KEY);
}

export function clearWorkbook(): void {
  window.sessionStorage.removeItem(WORKBOOK_KEY);
  window.sessionStorage.removeItem(FILENAME_KEY);
}
