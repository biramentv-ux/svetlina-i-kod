// Локално хранилище на школата: всичко остава в браузъра на ученика.
import { useEffect, useState } from "react";

const get = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
};
const set = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
  try { dispatchEvent(new CustomEvent("sk-store", { detail: k })); } catch { /* ignore */ }
};

/** Връща стойност от хранилището и я опреснява, когато друг компонент я промени. */
export function useStore<T>(k: string, d: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => get(k, d));
  useEffect(() => {
    const f = (e: Event) => { if ((e as CustomEvent).detail === k) setV(get(k, d)); };
    const g = (e: StorageEvent) => { if (e.key === k) setV(get(k, d)); };
    addEventListener("sk-store", f);
    addEventListener("storage", g);
    return () => { removeEventListener("sk-store", f); removeEventListener("storage", g); };
  }, [k]);
  return [v, (x: T) => { setV(x); set(k, x); }];
}

export const MARKS = "sk-marks";
export const NOTES = "sk-notes";
export const ACTIVITY = "sk-activity";
export const READER = "sk-reader";
export const NAME = "sk-name";

export type Reader = { fs: number; wide: boolean };
export const READER_DEFAULT: Reader = { fs: 1, wide: false };
export const FONT_SIZES = [15, 17, 19, 21];

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Записва n завършени урока за днешния ден. */
export function logActivity(n: number) {
  if (n <= 0) return;
  const a = get<Record<string, number>>(ACTIVITY, {});
  const t = today();
  a[t] = (a[t] || 0) + n;
  set(ACTIVITY, a);
}

/** Поредни дни с поне един завършен урок, до днес или до вчера. */
export function streak(a: Record<string, number>) {
  const d = new Date();
  if (!a[today(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (a[today(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Всички ключове на школата за изнасяне и внасяне. */
const OWN = (k: string) => k.startsWith("sk-") || k.startsWith("pv-");

export function exportData(): string {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (OWN(k)) { try { out[k] = JSON.parse(localStorage.getItem(k)!); } catch { out[k] = localStorage.getItem(k); } }
    }
  } catch { /* ignore */ }
  return JSON.stringify({ school: "svetlina-i-kod", version: 1, exported: new Date().toISOString(), data: out }, null, 2);
}

/** Внася файл, изнесен от школата. Връща броя внесени ключове или хвърля грешка. */
export function importData(text: string): number {
  const j = JSON.parse(text);
  if (j?.school !== "svetlina-i-kod" || typeof j.data !== "object") throw new Error("Това не е файл с напредък от школата.");
  let n = 0;
  for (const [k, v] of Object.entries(j.data as Record<string, unknown>)) {
    if (!OWN(k)) continue;
    localStorage.setItem(k, typeof v === "string" && (k === "sk-theme" || k === "sk-voice" || k === "sk-rate") ? v : JSON.stringify(v));
    n++;
  }
  return n;
}

export function clearData() {
  const ks: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (OWN(k)) ks.push(k); }
  ks.forEach((k) => localStorage.removeItem(k));
}

/** Сваля файл, създаден в браузъра. */
export function download(name: string, text: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
