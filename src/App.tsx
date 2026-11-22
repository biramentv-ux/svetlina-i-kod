import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { content, type Content } from "./content";
import { full } from "./content/full";
import { videos, extVideos } from "./content/videos";
import { marked } from "marked";
import type { Quiz } from "./content/types";
import { courses, lessonCount, totalMinutes, fmtHours, type Course, type LessonType } from "./courses";
import { MyPage, Certificate, LessonTools, Notes, useReader, ReviewPage } from "./My";
import { logActivity, FONT_SIZES } from "./store";

/* ====== РЕДАКТИРАЙ ТУК ====== */
const CONFIG = {
  brand: "Светлина и код",
  tagline: "Безплатна школа на български за VJ, програмиране, изкуствен интелект и reverse engineering",
};

const features = [
  { n: "01", title: "Пълни писмени уроци", text: "Всеки урок е завършен текст с обяснения, стъпки, пример от практиката и чести грешки – не само резюме." },
  { n: "02", title: "Упражнения, тестове и проекти", text: "Учиш с ръцете си: задача с критерии за самопроверка към всеки урок, тестове по модули и курсови проекти." },
  { n: "03", title: "Напредъкът остава при теб", text: "Отметки, бележки, дневник на активността и удостоверение за завършен курс. Всичко се пази в браузъра и се пренася с един файл." },
  { n: "04", title: "Един файл, работи и офлайн", text: "Цялата школа е един HTML файл без сървър и регистрация. Можеш да я свалиш и да учиш без интернет." },
];

const tracks: { n: string; title: string; text: string; slugs: string[] }[] = [
  {
    n: "A",
    title: "Визия на живо",
    text: "От първия микс до сцената: сигнал, софтуер, съдържание и работа в екип.",
    slugs: ["nachinaesht-vj", "resolume", "saveti-i-trikove", "synesthesia", "nestdrop", "notch-vfx", "2d-animaciya", "sheydari-glsl", "back-to-back", "zapisi-ot-strimove"],
  },
  {
    n: "B",
    title: "Изкуствен интелект",
    text: "От първия промпт през агентите и ИИ за визия до това как се обучават моделите.",
    slugs: ["rabota-s-ii", "ii-agenti-i-avtomatizaciya", "ii-za-vizualni-artisti", "matematika-za-ii", "ii-ot-perceptrona-do-llm"],
  },
  {
    n: "C",
    title: "Reverse engineering",
    text: "От асемблера и файловите формати до Ghidra, конкурентите ѝ и анализ с ИИ агенти.",
    slugs: ["reverse-engineering", "ghidra-reverse-engineering"],
  },
  {
    n: "D",
    title: "Код от нулата",
    text: "Python, C, Linux и как кодът става машина – основата под ИИ и reverse engineering.",
    slugs: ["programirane-ot-nulata", "linux-komanden-red"],
  },
  {
    n: "E",
    title: "Системно програмиране",
    text: "C в дълбочина, модерен C++, Rust и асемблер за x86-64 и ARM64 – кодът най-близо до машината.",
    slugs: ["c-sistemno", "cpp-moderen", "rust-ot-nulata", "asembler-x86-arm"],
  },
];

const faqs = [
  ["Нужен ли ми е опит?", "Не. Всяка пътека започва от нулата, а към всеки курс пише какво трябва да знаеш предварително."],
  ["Какъв софтуер ми трябва?", "Започваш с безплатни и пробни версии. В уроците сочим алтернативи за всеки бюджет, включително с отворен код."],
  ["Наистина ли всичко е безплатно?", "Да. Всички курсове и уроци са отворени – без абонамент, без регистрация и без скрити такси."],
  ["Къде се пази напредъкът ми?", "Само в твоя браузър. Школата не събира данни и няма профили. За да продължиш на друго устройство, изнеси напредъка от „Моят напредък“ и го внеси там."],
  ["Има ли видео уроци?", "Уроците са писмени. Към някои курсове има връзки към официални видео материали, а в края на всеки урок има бележки за бъдеща видео версия."],
  ["На какъв език са уроците?", "Изцяло на български, с термините на английски там, където това е стандартът в професията."],
];

/* ───────── Тема ───────── */
type Theme = "dark" | "light";
const TKEY = "sk-theme";
function initialTheme(): Theme {
  try {
    const s = localStorage.getItem(TKEY);
    if (s === "dark" || s === "light") return s;
  } catch { /* ignore */ }
  try {
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}
document.documentElement.dataset.theme = initialTheme();

function useTheme() {
  const [t, setT] = useState<Theme>(initialTheme);
  useEffect(() => { document.documentElement.dataset.theme = t; }, [t]);
  const toggle = () =>
    setT((x) => {
      const n: Theme = x === "dark" ? "light" : "dark";
      try { localStorage.setItem(TKEY, n); } catch { /* ignore */ }
      return n;
    });
  return [t, toggle] as const;
}

/* ───────── Напредък (пази се в браузъра, ако е позволено) ───────── */
const KEY = "pv-progress-v1";
const LAST = "sk-last";
function loadDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function saveDone(d: Record<string, boolean>) {
  const before = Object.values(loadDone()).filter(Boolean).length;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
  logActivity(Object.values(d).filter(Boolean).length - before);
}
function loadLast(): { slug: string; mi: number; li: number } | null {
  try {
    const x = JSON.parse(localStorage.getItem(LAST) || "null");
    const c = courses.find((k) => k.slug === x?.slug);
    return c && c.modules[x.mi]?.l[x.li] ? x : null;
  } catch {
    return null;
  }
}

const TYPE: Record<LessonType, { label: string; cls: string }> = {
  v: { label: "Урок", cls: "text-mute border-line" },
  l: { label: "Упражнение", cls: "text-accent border-accent-dim" },
  p: { label: "Проект", cls: "text-second border-second" },
  q: { label: "Тест", cls: "text-warn border-warn" },
};

const lessonHref = (slug: string, mi: number, li: number) => `#/kurs/${slug}/${mi}-${li}`;
const keysOf = (c: Course) => c.modules.flatMap((m, mi) => m.l.map((_, li) => `${c.slug}:${mi}:${li}`));
const ALL_LESSONS = courses.reduce((n, c) => n + lessonCount(c), 0);
const ALL_MIN = courses.reduce((n, c) => n + totalMinutes(c), 0);

function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const f = () => setH(location.hash);
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return h;
}

/** Плавно появяване на елементите с клас .reveal, когато влязат в екрана. */
function useReveal(dep: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

/* ───────── Икони ───────── */
const I = {
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
  ),  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4v16l13-8z" /></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  stop: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M5 5h14v14H5z" /></svg>,
  prev: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18 5v14L8 12zM5 5h2v14H5z" /></svg>,
  next: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 5v14l10-7zM17 5h2v14h-2z" /></svg>,
};

/* ───────── Знак: лъч светлина през скоби ───────── */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--ink)" />
      <path d="M12 10 7 16l5 6M20 10l5 6-5 6" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.2" fill="var(--primary)" />
      <circle cx="16" cy="16" r="6" fill="var(--primary)" opacity=".25" />
    </svg>
  );
}

/* ───────── Търсене в курсове и уроци ───────── */
type Hit = { kind: "Курс" | "Урок"; title: string; sub: string; href: string; hay: string };
const INDEX: Hit[] = courses.flatMap((c) => [
  { kind: "Курс" as const, title: c.name, sub: `${c.cat} · ${c.level}`, href: `#/kurs/${c.slug}`, hay: `${c.name} ${c.summary} ${c.tools.join(" ")}`.toLowerCase() },
  ...c.modules.flatMap((m, mi) =>
    m.l.map(([t], li) => ({ kind: "Урок" as const, title: t, sub: `${c.name} · ${m.t}`, href: lessonHref(c.slug, mi, li), hay: `${t} ${m.t}`.toLowerCase() }))
  ),
]);

function Search({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return INDEX.filter((h) => h.kind === "Курс");
    return INDEX.filter((h) => words.every((w) => h.hay.includes(w))).slice(0, 40);
  }, [q]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { list.current?.children[sel]?.scrollIntoView({ block: "nearest" }); }, [sel]);
  const go = (h?: Hit) => {
    if (!h) return;
    location.hash = h.href;
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Търсене" className="pop w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-bg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4 text-mute">
          {I.search}
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "Enter") go(hits[sel]);
            }}
            placeholder="Търси курс или урок…"
            aria-label="Търси курс или урок"
            className="h-14 w-full bg-transparent text-base text-fg placeholder:text-faint focus:outline-none"
          />
          <button onClick={onClose} className="kbd shrink-0" aria-label="Затвори търсенето">Esc</button>
        </div>
        <ul ref={list} className="max-h-[55vh] overflow-y-auto py-2">
          {hits.map((h, i) => (
            <li key={h.href}>
              <button
                onClick={() => go(h)}
                onMouseEnter={() => setSel(i)}
                className={`mx-2 flex w-[calc(100%-1rem)] items-start gap-3 rounded-lg px-3 py-2.5 text-left ${i === sel ? "bg-hover" : ""}`}
              >
                <span className={`eyebrow mt-1 w-10 shrink-0 ${h.kind === "Курс" ? "text-second" : "text-accent"}`}>{h.kind}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-fg">{h.title}</span>
                  <span className="block truncate text-xs text-faint">{h.sub}</span>
                </span>
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="px-4 py-6 text-sm text-mute">Нищо не намерих. Опитай с друга дума.</li>}
        </ul>
        <p className="border-t border-line px-4 py-2 text-xs text-faint">
          {q.trim() ? `${hits.length}${hits.length === 40 ? "+" : ""} резултата` : `${courses.length} курса · ${ALL_LESSONS} урока`} · стрелки и Enter за избор
        </p>
      </div>
    </div>
  );
}

/* ───────── Обща рамка ───────── */
function Shell({ children, theme, toggleTheme }: { children: ReactNode; theme: Theme; toggleTheme: () => void }) {
  const [search, setSearch] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearch(true);
      } else if (e.key === "?" && !typing) {
        setHelp((x) => !x);
      } else if (e.key === "Escape") {
        setHelp(false);
      } else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === "t") {
        toggleTheme();
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);
  return (
    <div className="min-h-screen bg-bg text-fg">
      <a href="#sadarzhanie" onClick={(e) => { e.preventDefault(); document.getElementById("sadarzhanie")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        Към съдържанието
      </a>
      <header className="hdr no-print sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2.5 whitespace-nowrap" aria-label="Светлина и код – начало">
            <Logo />
            <span className="display text-[17px] sm:text-lg">Светлина <span className="text-accent">и</span> код</span>
          </a>
          <nav className="flex items-center gap-2 text-sm text-mute sm:gap-3" aria-label="Основна навигация">
            <a href="#kursove" className="hidden px-2 py-2 hover:text-ink sm:block">Курсове</a>
            <a href="#pateki" className="hidden px-2 py-2 hover:text-ink md:block">Пътеки</a>
            <a href="#vaprosi" className="hidden px-2 py-2 hover:text-ink md:block">Въпроси</a>
            <a href="#/moi" className="px-2 py-2 hover:text-ink" title="Моят напредък"><span className="hidden sm:inline">Моят напредък</span><span className="sm:hidden" aria-label="Моят напредък">★</span></a>
            <a href="https://github.com/biramentv-ux/svetlina-i-kod" target="_blank" rel="noopener noreferrer" className="hidden px-2 py-2 hover:text-ink xl:block">Код</a>
            <button onClick={() => setSearch(true)} className="icon-btn px-3 text-sm" aria-label="Търсене в курсове и уроци">
              {I.search}
              <span className="hidden sm:inline">Търсене</span>
              <span className="kbd hidden lg:inline">/</span>
            </button>
            <button onClick={toggleTheme} className="icon-btn" aria-label={theme === "dark" ? "Включи светла тема" : "Включи тъмна тема"}>
              {theme === "dark" ? I.sun : I.moon}
            </button>
          </nav>
        </div>
      </header>
      <main id="sadarzhanie" tabIndex={-1} className="outline-none">{children}</main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2.5"><Logo size={24} /><span className="display text-lg">{CONFIG.brand}</span></p>
            <p className="mt-3 max-w-sm text-sm text-mute">{CONFIG.tagline}.</p>
            <p className="mt-4 text-sm text-mute">{courses.length} курса · {ALL_LESSONS} урока · 0 лв.</p>
          </div>
          <div>
            <p className="eyebrow text-second">Пътеки</p>
            <ul className="mt-3 space-y-2 text-sm text-soft">
              {tracks.map((t) => <li key={t.n}><a href="#pateki" className="hover:text-accent">{t.title}</a></li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow text-second">Школата</p>
            <ul className="mt-3 space-y-2 text-sm text-soft">
              <li><a href="#kursove" className="hover:text-accent">Всички курсове</a></li>
              <li><a href="#/moi" className="hover:text-accent">Моят напредък</a></li>
              <li><a href="#/pregovor" className="hover:text-accent">Преговор с карти</a></li>
              <li><button onClick={() => setHelp(true)} className="hover:text-accent">Клавишни комбинации</button></li>
              <li><a href="#vaprosi" className="hover:text-accent">Въпроси</a></li>
              <li><button onClick={() => setSearch(true)} className="hover:text-accent">Търсене</button></li>
              <li><a href="https://github.com/biramentv-ux/svetlina-i-kod" target="_blank" rel="noopener noreferrer" className="hover:text-accent">Изходен код (GitHub)</a></li>
            </ul>
          </div>
        </div>
        <p className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs leading-relaxed text-faint sm:px-6">
          Поверителност: школата не събира лични данни – няма регистрация, аналитика или бисквитки за проследяване.
          Напредъкът се пази само в твоя браузър. Външните връзки водят към сайтове със собствени правила.
          Уроците са образователни материали и не са правен съвет.
        </p>
      </footer>
      {search && <Search onClose={() => setSearch(false)} />}
      {help && <Shortcuts onClose={() => setHelp(false)} />}
    </div>
  );
}

/* ───────── Анимиран фон: лъч светлина, който осветява редове код ───────── */
const CODE = [
  "int run(const uint8_t *p, int n) {",
  "  int stack[64], sp = 0;",
  "  for (int i = 0; i < n; i++) {",
  "    switch (p[i]) {",
  "      case PUSH: stack[sp++] = p[++i]; break;",
  "      case ADD:  sp--; stack[sp-1] += stack[sp];",
  "      case MUL:  sp--; stack[sp-1] *= stack[sp];",
  "    }",
  "  }",
  "  return stack[sp - 1];   // 42",
  "}",
  "",
  "def attention(q, k, v):",
  "    w = softmax(q @ k.T / sqrt(d))",
  "    return w @ v",
  "",
  "mov  rdi, rax        ; ghidra: FUN_001012ab",
  "call printf          ; \"%d\\n\"",
  "layer.opacity = beat(0.25) * 0.8",
  "clip.speed    = bpm / 128",
];
function Visual({ theme }: { theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = theme === "dark";
    const dim = dark ? "rgba(236,234,228,0.13)" : "rgba(29,32,41,0.12)";
    const lit = dark ? "#ffe2bd" : "#5a2a00";
    const glow = dark ? "255,166,64" : "242,138,30";
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * devicePixelRatio;
      c.height = r.height * devicePixelRatio;
    };
    resize();
    addEventListener("resize", resize);
    const draw = (t: number) => {
      const { width: w, height: h } = c;
      const dpr = devicePixelRatio;
      ctx.clearRect(0, 0, w, h);
      const fs = Math.max(11, Math.min(15, w / dpr / 70)) * dpr;
      const lh = fs * 1.75;
      const x0 = w * 0.5;
      const rows = Math.ceil(h / lh) + 1;
      // лъчът: източник горе вдясно, петно се движи бавно по редовете
      const lx = x0 + (w - x0) * (0.42 + 0.28 * Math.sin(t / 4100));
      const ly = h * (0.42 + 0.26 * Math.sin(t / 3300 + 1.3));
      const R = Math.min(w, h) * 0.26;
      const sx = w * 1.02, sy = -h * 0.08;
      const beam = ctx.createLinearGradient(sx, sy, lx, ly);
      beam.addColorStop(0, `rgba(${glow},0.0)`);
      beam.addColorStop(1, `rgba(${glow},${dark ? 0.16 : 0.2})`);
      ctx.fillStyle = beam;
      ctx.filter = `blur(${18 * dpr}px)`;
      const ang = Math.atan2(ly - sy, lx - sx) + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lx + Math.cos(ang) * R, ly + Math.sin(ang) * R);
      ctx.lineTo(lx - Math.cos(ang) * R, ly - Math.sin(ang) * R);
      ctx.closePath();
      ctx.fill();
      ctx.filter = "none";
      const spot = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
      spot.addColorStop(0, `rgba(${glow},${dark ? 0.28 : 0.3})`);
      spot.addColorStop(1, `rgba(${glow},0)`);
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "middle";
      for (let r = 0; r < rows; r++) {
        const line = CODE[r % CODE.length];
        const y = lh * (r + 0.6);
        ctx.fillStyle = dim;
        ctx.fillText(line, x0, y);
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, R * 0.78, 0, 6.283);
      ctx.clip();
      ctx.fillStyle = lit;
      ctx.shadowColor = `rgba(${glow},0.9)`;
      ctx.shadowBlur = 12 * dpr;
      for (let r = 0; r < rows; r++) {
        const y = lh * (r + 0.6);
        const d = Math.abs(y - ly) / (R * 0.78);
        ctx.globalAlpha = Math.max(0, 1 - d * d);
        ctx.fillText(CODE[r % CODE.length], x0, y);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, [theme]);
  return <canvas ref={ref} className="hero-canvas absolute inset-0 h-full w-full" aria-hidden />;
}

function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1 overflow-hidden rounded-full bg-hover ${className}`} aria-hidden>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function Landing({ theme }: { theme: Theme }) {
  const [done] = useState(loadDone);
  const last = useMemo(loadLast, []);
  const lastCourse = last ? courses.find((c) => c.slug === last.slug) : undefined;
  const doneCount = Object.values(done).filter(Boolean).length;
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id && !id.startsWith("/")) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, []);
  useReveal(null);
  const stats: [string, string][] = [
    [String(courses.length), "курса"],
    [String(ALL_LESSONS), "урока"],
    [`${Math.round(ALL_MIN / 60)} ч`, "материал"],
    ["0 лв.", "завинаги"],
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="halo absolute inset-0" aria-hidden />
        <div className="grain absolute inset-0" aria-hidden />
        <Visual theme={theme} />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-28">
          <p className="rise chip bg-surface py-1.5 text-soft">
            <span className="dot blink" /> Безплатна школа · {courses.length} курса · {ALL_LESSONS} урока
          </p>
          <h1 className="rise display mt-6 max-w-3xl text-[2.4rem] leading-[1.04] sm:text-6xl lg:text-7xl" style={{ ["--d" as string]: "80ms" }}>
            Свири със светлина.<br />
            <span className="italic text-accent">Мисли с код.</span>
          </h1>
          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-soft" style={{ ["--d" as string]: "160ms" }}>
            {CONFIG.tagline}. Пълни уроци, упражнения и проекти – от първия микс
            до сцената, от първия ред код до собствен агент и от асемблера до Ghidra.
          </p>
          <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ ["--d" as string]: "240ms" }}>
            <a href="#kursove" className="btn px-7 py-4 text-[15px]">Към курсовете {I.arrow}</a>
            <a href="#pateki" className="btn-ghost px-6 py-4 text-[15px]">Избери пътека</a>
          </div>
          <p className="rise mt-5 text-sm text-mute" style={{ ["--d" as string]: "300ms" }}>Без абонамент · без регистрация · без такси</p>

          <dl className="rise mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4" style={{ ["--d" as string]: "380ms" }}>
            {stats.map(([v, l]) => (
              <div key={l} className="bg-surface px-4 py-4">
                <dt className="sr-only">{l}</dt>
                <dd className="display text-2xl sm:text-3xl">{v}</dd>
                <dd className="mt-1 text-sm text-mute">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {last && lastCourse && (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <a href={lessonHref(last.slug, last.mi, last.li)} className="card group flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <span className="min-w-0">
              <span className="eyebrow text-second">Продължи оттам, докъдето стигна</span>
              <span className="mt-1 block truncate text-lg font-semibold group-hover:text-accent">{lastCourse.modules[last.mi].l[last.li][0]}</span>
              <span className="block truncate text-sm text-mute">{lastCourse.name} · завършени общо {doneCount} от {ALL_LESSONS} урока</span>
            </span>
            <span className="btn px-5 py-3 text-xs">Продължи {I.arrow}</span>
          </a>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="eyebrow reveal text-second">Какво получаваш</h2>
        <p className="reveal display mt-3 max-w-2xl text-3xl leading-tight sm:text-4xl">Учиш като в истинско студио – с текст, ръце и проверка.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <article key={f.n} className="panel reveal p-7" style={{ ["--d" as string]: `${i * 70}ms` }}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-glow font-mono text-xs text-accent">{f.n}</span>
              <h3 className="mt-5 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pateki" className="scroll-mt-16 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="eyebrow reveal text-second">Пътеки</h2>
          <p className="reveal display mt-3 max-w-2xl text-3xl leading-tight sm:text-4xl">Четири посоки. Избери откъде да тръгнеш.</p>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {tracks.map((t, ti) => {
              const cs = t.slugs.map((s) => courses.find((c) => c.slug === s)).filter((c): c is Course => !!c);
              const n = cs.reduce((a, c) => a + lessonCount(c), 0);
              return (
                <article key={t.n} className="panel reveal flex min-w-0 flex-col bg-bg p-6" style={{ ["--d" as string]: `${ti * 90}ms` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="display text-4xl italic text-accent">{t.n}</span>
                    <span className="text-xs text-mute">{cs.length} курса · {n} урока</span>
                  </div>
                  <h3 className="display mt-3 text-2xl leading-tight">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{t.text}</p>
                  <ol className="mt-5 flex-1 space-y-px">
                    {cs.map((c, i) => {
                      const ks = keysOf(c);
                      const d = ks.filter((k) => done[k]).length;
                      return (
                        <li key={c.slug}>
                          <a href={`#/kurs/${c.slug}`} className="group flex items-center gap-3 border-t border-line py-2.5 text-[15px]">
                            <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 flex-1 truncate group-hover:text-accent">{c.name}</span>
                            {d === ks.length ? <span className="text-accent">{I.check}</span> : d > 0 ? <span className="font-mono text-xs text-accent">{d}/{ks.length}</span> : null}
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                  {cs[0] && (
                    <a href={`#/kurs/${cs[0].slug}`} className="btn-ghost mt-5 justify-center px-4 py-3 text-xs">Започни от първия {I.arrow}</a>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Catalog />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="panel reveal relative grid gap-8 overflow-hidden p-8 sm:p-12 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
          <div className="halo pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="eyebrow text-accent">Цена</p>
            <p className="display mt-3 text-6xl sm:text-8xl">0 лв.</p>
          </div>
          <div className="relative">
            <p className="max-w-xl text-lg leading-relaxed text-soft">
              Всичко в школата е безплатно за учене: всички курсове, уроци, упражнения, тестове и проекти.
              Няма абонамент, пробен период или заключено съдържание.
            </p>
            <a href="#kursove" className="btn mt-6 px-6 py-3 text-sm">Започни сега {I.arrow}</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <h2 id="vaprosi" className="eyebrow reveal scroll-mt-24 text-second">Често задавани въпроси</h2>
        <div className="mt-6 border-t border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold hover:text-accent">
                {q}
                <span className="text-2xl font-normal text-accent transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

const STATUS = ["Всички", "Незапочнати", "В процес", "Завършени"] as const;
const CATS = ["Всички", "Основи", "Програмиране", "Софтуер", "Сцена", "Творчество", "Архив", "ИИ и анализ"] as const;

function Catalog() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Всички");
  const [q, setQ] = useState("");
  const [done] = useState(loadDone);
  const [st, setSt] = useState<(typeof STATUS)[number]>("Всички");
  const status = (c: Course) => { const d = keysOf(c).filter((k) => done[k]).length; return d === 0 ? "Незапочнати" : d === lessonCount(c) ? "Завършени" : "В процес"; };
  const list = useMemo(
    () =>
      courses.filter(
        (c) =>
          (cat === "Всички" || c.cat === cat) &&
          (st === "Всички" || status(c) === st) &&
          (c.name + c.summary + c.level + c.tools.join(" ")).toLowerCase().includes(q.trim().toLowerCase())
      ),
    [cat, q, st]
  );
  useReveal(`${cat}|${q}|${st}`);
  return (
    <section id="kursove" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="eyebrow text-second">Курсове</h2>
          <p className="display mt-3 text-3xl leading-tight sm:text-4xl">Каталог</p>
          <p className="mt-3 text-mute">
            {courses.length} курса · {ALL_LESSONS} урока · около {fmtHours(ALL_MIN)} материал
          </p>
        </div>
        <label className="field flex w-full items-center gap-2 px-4 text-mute sm:w-72">
          {I.search}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Филтрирай курсовете…"
            aria-label="Филтрирай курсовете"
            className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
          />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Категория">
        {CATS.map((c) => {
          const n = c === "Всички" ? courses.length : courses.filter((x) => x.cat === c).length;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                cat === c ? "border-primary bg-primary font-semibold text-on-primary" : "border-line text-mute hover:border-line-strong hover:text-fg"
              }`}
            >
              {c} <span className={cat === c ? "opacity-60" : "text-faint"}>{n}</span>
            </button>
          );
        })}
      </div>
      {Object.values(done).some(Boolean) && (
        <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Напредък">
          <span className="eyebrow mr-1 text-faint">Напредък</span>
          {STATUS.map((x) => (
            <button key={x} onClick={() => setSt(x)} aria-pressed={st === x}
              className={`rounded-full border px-3 py-1 ${st === x ? "border-accent text-accent" : "border-line text-mute hover:text-fg"}`}>{x}</button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c, i) => {
          const n = lessonCount(c);
          const d = keysOf(c).filter((k) => done[k]).length;
          return (
            <a key={c.slug} href={`#/kurs/${c.slug}`} className="card reveal group flex flex-col p-6" style={{ ["--d" as string]: `${(i % 3) * 60}ms` }}>
              <span className="flex items-center justify-between gap-3">
                <span className="eyebrow text-accent">{c.cat}</span>
                <span className="text-xs text-faint">{c.level}</span>
              </span>
              <h3 className="display mt-4 text-[1.35rem] leading-snug group-hover:text-accent">{c.name}</h3>
              <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-mute">{c.summary}</p>
              <p className="mt-5 flex items-center justify-between text-xs text-mute">
                <span>{c.modules.length} модула · {n} урока · {fmtHours(totalMinutes(c))}</span>
                {d > 0 && <span className="font-mono text-accent">{d}/{n}</span>}
              </p>
              <Bar value={d / n} className="mt-3" />
            </a>
          );
        })}
        {list.length === 0 && <p className="text-mute">Няма курсове по тези критерии. Опитай търсенето горе – то намира и отделни уроци.</p>}
      </div>
    </section>
  );
}

function CoursePage({ c }: { c: Course }) {
  const [done, setDone] = useState(loadDone);
  const [open, setOpenRaw] = useState<string | null>(null);
  const [mods, setMods] = useState<Record<number, boolean>>({ 0: true });
  const setOpen = (k: string | null) => {
    setOpenRaw(k);
    if (k) {
      const mi = Number(k.split(":")[1]);
      setMods((x) => ({ ...x, [mi]: true }));
    }
  };
  const body = content[c.slug] || [];
  const key = (mi: number, li: number) => `${c.slug}:${mi}:${li}`;
  const nextKey = (mi: number, li: number) =>
    li + 1 < c.modules[mi].l.length ? key(mi, li + 1) : mi + 1 < c.modules.length ? key(mi + 1, 0) : null;
  const toggle = (k: string) => {
    const nx = { ...done, [k]: !done[k] };
    setDone(nx);
    saveDone(nx);
  };
  const n = lessonCount(c);
  const flat = c.modules.flatMap((m, mi) => m.l.map((_, li) => [mi, li] as const));
  const d = flat.filter(([a, b]) => done[key(a, b)]).length;
  const resume = flat.find(([a, b]) => !done[key(a, b)]) ?? flat[0];
  const idx = courses.findIndex((x) => x.slug === c.slug);
  const next = courses[idx + 1];
  useEffect(() => { window.scrollTo(0, 0); setOpenRaw(null); setMods({ 0: true }); }, [c.slug]);
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="halo absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <a href="#kursove" className="text-sm text-mute hover:text-ink">← Всички курсове</a>
          <p className="eyebrow rise mt-8 text-accent">{c.cat} · {c.level}</p>
          <h1 className="rise display mt-4 max-w-4xl text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl" style={{ ["--d" as string]: "60ms" }}>{c.name}</h1>
          <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-soft" style={{ ["--d" as string]: "120ms" }}>{c.summary}</p>
          <div className="rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-5" style={{ ["--d" as string]: "180ms" }}>
            <a href={lessonHref(c.slug, resume[0], resume[1])} className="btn px-6 py-3.5 text-sm">
              {d === 0 ? "Започни курса" : d === n ? "Прегледай отново" : "Продължи"} {I.arrow}
            </a>
            <div className="w-full max-w-xs">
              <div className="mb-1.5 flex justify-between text-xs text-mute">
                <span>Твоят напредък</span>
                <span className="font-mono">{d} / {n}</span>
              </div>
              <Bar value={d / n} className="h-1.5" />
            </div>
            <p className="text-sm text-mute">{c.modules.length} модула · {n} урока · {fmtHours(totalMinutes(c))}</p>
            {d === n && <a href={`#/sertifikat/${c.slug}`} className="btn-ghost px-4 py-2 text-sm">Вземи удостоверение</a>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="eyebrow mb-5 text-second">Програма</h2>
          <div className="border-t border-line">
            {c.modules.map((m, mi) => {
              const md = m.l.filter((_, li) => done[key(mi, li)]).length;
              return (
                <details
                  key={m.t}
                  open={!!mods[mi]}
                  onToggle={(e) => {
                    const o = (e.currentTarget as HTMLDetailsElement).open;
                    if (o !== !!mods[mi]) setMods((x) => ({ ...x, [mi]: o }));
                  }}
                  className="group border-b border-line py-5"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <span>
                      <span className="eyebrow text-accent">Модул {String(mi + 1).padStart(2, "0")}</span>
                      <span className="mt-1.5 block text-lg font-semibold group-hover:text-accent">{m.t}</span>
                      <span className="mt-0.5 block text-sm text-mute">{m.goal}</span>
                    </span>
                    <span className="flex items-center gap-3 whitespace-nowrap pt-1 font-mono text-xs text-mute">
                      {md === m.l.length ? <span className="text-accent">{I.check}</span> : `${md}/${m.l.length}`}
                      <span className="inline-block text-xl text-accent transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <ul className="mt-4 space-y-0.5">
                    {m.l.map(([title, min, type = "v"], li) => {
                      const k = key(mi, li);
                      return (
                        <li key={k} className={open === k ? "rounded-lg bg-hover" : ""}>
                          <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-hover">
                            <input
                              type="checkbox"
                              checked={!!done[k]}
                              onChange={() => toggle(k)}
                              aria-label={`Отбележи „${title}“ като завършен`}
                              className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                            />
                            <button
                              onClick={() => (full[k] ? (location.hash = lessonHref(c.slug, mi, li)) : setOpen(open === k ? null : k))}
                              aria-expanded={full[k] ? undefined : open === k}
                              className={`flex-1 text-left text-[15px] hover:text-accent ${done[k] ? "text-faint line-through" : ""}`}
                            >
                              {title}
                            </button>
                            {type !== "v" && (
                              <span className={`hidden rounded-full border px-2 py-0.5 text-[11px] sm:inline ${TYPE[type].cls}`}>{TYPE[type].label}</span>
                            )}
                            <span className="w-14 text-right font-mono text-xs text-mute">{min} мин</span>
                          </div>
                          {open === k && body[mi]?.[li] && (
                            <LessonBody
                              c={body[mi][li]}
                              done={!!done[k]}
                              onDone={() => { if (!done[k]) toggle(k); setOpen(nextKey(mi, li)); }}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        </div>

        <aside className="panel space-y-9 p-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <h2 className="eyebrow mb-4 text-second">Какво ще можеш</h2>
            <ul className="space-y-3">
              {c.outcomes.map((o) => (
                <li key={o} className="flex gap-3 text-[15px] leading-relaxed text-soft">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-4 text-second">Какво трябва да имаш</h2>
            <ul className="space-y-2 text-[15px] text-mute">
              {c.prereq.map((o) => <li key={o} className="flex gap-3"><span className="text-faint">–</span>{o}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-4 text-second">Инструменти</h2>
            <div className="flex flex-wrap gap-2">
              {c.tools.map((o) => <span key={o} className="chip text-soft">{o}</span>)}
            </div>
          </div>
        </aside>
      </div>

      {next && (
        <div className="border-t border-line">
          <a href={`#/kurs/${next.slug}`} className="group mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-8 sm:px-6">
            <span className="eyebrow text-mute">Следващ курс</span>
            <span className="flex items-center gap-3 text-right text-lg font-semibold group-hover:text-accent">{next.name} {I.arrow}</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const hash = useHash();
  const [theme, toggleTheme] = useTheme();
  const cert = hash.match(/^#\/sertifikat\/([^/]+)$/);
  const certCourse = cert ? courses.find((c) => c.slug === cert[1]) : undefined;
  const m = hash.match(/^#\/kurs\/([^/]+)(?:\/(\d+)-(\d+)(?:\/(\d+))?)?$/);
  const course = m ? courses.find((c) => c.slug === m[1]) : undefined;
  const lesson = m && m[2] !== undefined ? { mi: Number(m[2]), li: Number(m[3]) } : null;
  return (
    <Shell theme={theme} toggleTheme={toggleTheme}>
      {hash === "#/moi" ? (
        <MyPage />
      ) : hash === "#/pregovor" ? (
        <ReviewPage />
      ) : certCourse ? (
        <Certificate c={certCourse} />
      ) : !course ? (
        <Landing theme={theme} />
      ) : lesson && course.modules[lesson.mi]?.l[lesson.li] ? (
        <LessonPage c={course} mi={lesson.mi} li={lesson.li} sec={m?.[4] !== undefined ? Number(m[4]) : null} />
      ) : (
        <CoursePage c={course} />
      )}
    </Shell>
  );
}

function LessonBody({ c, done, onDone }: { c: Content; done: boolean; onDone: () => void }) {
  return (
    <div className="mx-2 mb-3 rounded-xl border border-line border-l-[3px] border-l-primary bg-surface px-5 py-5 text-sm">
      <p className="text-[15px] leading-relaxed text-fg">{c.s}</p>
      {c.z ? (
        <QuizView z={c.z} onPass={onDone} />
      ) : (
        <>
          <h4 className="eyebrow mt-5 text-second">Ключови точки</h4>
          <ol className="mt-3 space-y-2">
            {c.k.map((x, i) => (
              <li key={i} className="flex gap-3 text-soft">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span className="leading-relaxed">{x}</span>
              </li>
            ))}
          </ol>
          {c.t && (
            <div className="mt-5 rounded-xl border border-accent-dim p-4">
              <p className="eyebrow text-accent">Задача</p>
              <p className="mt-2 text-fg">{c.t}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-faint">Пълният текст на този урок се подготвя.</p>
          <button onClick={onDone} className="btn mt-4 px-4 py-2.5 text-xs">
            {done ? "Към следващия урок" : "Завърших урока"} {I.arrow}
          </button>
        </>
      )}
    </div>
  );
}

function QuizView({ z, onPass }: { z: Quiz; onPass: () => void }) {
  const [ans, setAns] = useState<(number | null)[]>(() => z.map(() => null));
  const [checked, setChecked] = useState(false);
  const score = ans.filter((a, i) => a === z[i][2]).length;
  const all = ans.every((a) => a !== null);
  return (
    <div className="mt-5 space-y-6">
      {z.map(([q, opts, correct], qi) => (
        <fieldset key={qi}>
          <legend className="mb-3 font-semibold text-fg">{qi + 1}. {q}</legend>
          <div className="space-y-2">
            {opts.map((o, oi) => {
              const picked = ans[qi] === oi;
              const state = checked
                ? oi === correct ? "border-second text-second" : picked ? "border-danger text-danger" : "border-line text-mute"
                : picked ? "border-fg bg-hover text-ink" : "border-line text-soft hover:border-line-strong";
              return (
                <button
                  key={oi}
                  disabled={checked}
                  aria-pressed={picked}
                  onClick={() => setAns(ans.map((a, i) => (i === qi ? oi : a)))}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors ${state}`}
                >
                  <span className="font-mono text-xs opacity-70">{"АБВГД"[oi]}</span>
                  <span className="flex-1">{o}</span>
                  {checked && oi === correct && I.check}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {!checked ? (
        <button disabled={!all} onClick={() => setChecked(true)} className="btn px-5 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-40">
          Провери отговорите
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-4" role="status">
          <p className={score === z.length ? "font-semibold text-second" : "font-semibold text-warn"}>
            Резултат: {score} от {z.length}{score === z.length ? " – отлично!" : " – прегледай уроците и опитай пак."}
          </p>
          {score === z.length ? (
            <button onClick={onPass} className="btn px-5 py-3 text-xs">Продължи {I.arrow}</button>
          ) : (
            <button onClick={() => { setAns(z.map(() => null)); setChecked(false); }} className="btn-ghost px-5 py-3 text-xs">Опитай отново</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Слушане на урока с гласа на браузъра ───────── */
const VKEY = "sk-voice";
const RKEY = "sk-rate";
const RATES = [0.8, 1, 1.2, 1.5];

/** Дели текста на изречения и ги групира на къси части – дългите реплики се прекъсват в някои браузъри. */
function splitText(t: string): string[] {
  const out: string[] = [];
  const parts = t.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*\s*/g) || [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + p).length > 220) { out.push(cur.trim()); cur = p; } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function Listen({ root, dep }: { root: React.RefObject<HTMLDivElement | null>; dep: string }) {
  const ok = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem(VKEY) || ""; } catch { return ""; } });
  const [rate, setRate] = useState(() => { try { return Number(localStorage.getItem(RKEY)) || 1; } catch { return 1; } });
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [pos, setPos] = useState(0);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const q = useRef<{ el: Element; text: string }[]>([]);
  const run = useRef(0);
  const fails = useRef(0);
  const cur = useRef<Element | null>(null);
  const live = useRef({ voice, rate, voices });
  live.current = { voice, rate, voices };
  const bg = voices.filter((v) => v.lang.toLowerCase().startsWith("bg"));

  useEffect(() => {
    if (!ok) return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [ok]);

  const mark = (el: Element | null) => {
    cur.current?.classList.remove("speaking");
    cur.current = el;
    if (!el) return;
    el.classList.add("speaking");
    const r = el.getBoundingClientRect();
    if (r.top < 150 || r.bottom > innerHeight - 40) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  };
  const stop = () => {
    run.current++;
    if (ok) speechSynthesis.cancel();
    mark(null);
    setState("idle");
  };
  const build = () => {
    const items: { el: Element; text: string }[] = [];
    const el = root.current;
    if (!el) return items;
    const push = (e: Element) => { const c = e.cloneNode(true) as Element; c.querySelectorAll(".anchor, .copy").forEach((x) => x.remove()); for (const t of splitText(c.textContent || "")) items.push({ el: e, text: t }); };
    for (const ch of Array.from(el.children)) {
      const tag = ch.tagName;
      if (tag === "H2" && (ch.textContent || "").trim().startsWith("Бележки за видеото")) break;
      if (tag === "PRE" || tag === "TABLE" || tag === "HR") continue;
      if (tag === "UL" || tag === "OL") Array.from(ch.children).forEach(push);
      else push(ch);
    }
    return items;
  };
  const speak = (i: number) => {
    const items = q.current;
    if (i >= items.length) { stop(); return; }
    setPos(i);
    mark(items[i].el);
    const u = new SpeechSynthesisUtterance(items[i].text);
    const { voice, rate, voices } = live.current;
    const v = voices.find((x) => x.voiceURI === voice) || voices.find((x) => x.lang.toLowerCase().startsWith("bg"));
    u.lang = "bg-BG";
    if (v) u.voice = v;
    u.rate = rate;
    const my = run.current;
    u.onend = () => { if (my === run.current) { fails.current = 0; speak(i + 1); } };
    u.onerror = (e) => {
      if (my !== run.current || e.error === "interrupted" || e.error === "canceled") return;
      if (++fails.current >= 3) { stop(); setErr("Браузърът не успя да прочете текста. Провери дали има инсталиран български глас."); }
      else speak(i + 1);
    };
    speechSynthesis.speak(u);
  };
  const start = (i: number) => {
    run.current++;
    speechSynthesis.cancel();
    setErr("");
    fails.current = 0;
    setState("playing");
    speak(Math.max(0, Math.min(i, q.current.length - 1)));
  };
  const play = () => {
    q.current = build();
    setTotal(q.current.length);
    if (q.current.length) start(0);
  };
  const toggle = () => {
    if (state === "idle") play();
    else if (state === "playing") { speechSynthesis.pause(); setState("paused"); }
    else { speechSynthesis.resume(); setState("playing"); }
  };
  /** Прескача към предишния или следващия абзац. */
  const skip = (dir: 1 | -1) => {
    const items = q.current;
    let i = pos;
    const el = items[i]?.el;
    if (dir === 1) { while (i < items.length && items[i].el === el) i++; }
    else {
      while (i > 0 && items[i].el === el) i--;
      const e2 = items[i]?.el;
      while (i > 0 && items[i - 1].el === e2) i--;
    }
    if (i >= items.length) stop(); else start(i);
  };
  useEffect(() => () => { run.current++; if (ok) speechSynthesis.cancel(); cur.current?.classList.remove("speaking"); }, [dep, ok]);
  useEffect(() => { setState("idle"); setErr(""); }, [dep]);

  if (!ok) return null;
  const active = state !== "idle";
  return (
    <div className={`no-print mt-6 overflow-hidden rounded-xl border ${active ? "sticky top-[4.6rem] z-20 border-accent bg-bg shadow-lg" : "border-line bg-surface"}`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <button onClick={toggle} className="btn px-4 py-2.5 text-xs">
          {state === "playing" ? I.pause : I.play}
          {state === "idle" ? "Слушай урока" : state === "playing" ? "Пауза" : "Продължи"}
        </button>
        {active && (
          <>
            <button onClick={() => skip(-1)} className="icon-btn" aria-label="Предишен абзац">{I.prev}</button>
            <button onClick={() => skip(1)} className="icon-btn" aria-label="Следващ абзац">{I.next}</button>
            <button onClick={stop} className="icon-btn" aria-label="Спри слушането">{I.stop}</button>
            <span className="px-1 font-mono text-xs text-mute" aria-live="off">{pos + 1} / {total}</span>
          </>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-mute">
            <span className="sr-only sm:not-sr-only">Скорост</span>
            <select
              value={rate}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRate(r);
                live.current.rate = r;
                try { localStorage.setItem(RKEY, String(r)); } catch { /* ignore */ }
                if (state === "playing") start(pos);
              }}
              className="h-10 rounded-full border border-line bg-bg px-3 text-sm text-fg"
              aria-label="Скорост на четене"
            >
              {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
          </label>
          {bg.length > 1 && (
            <select
              value={bg.some((v) => v.voiceURI === voice) ? voice : bg[0].voiceURI}
              onChange={(e) => {
                setVoice(e.target.value);
                live.current.voice = e.target.value;
                try { localStorage.setItem(VKEY, e.target.value); } catch { /* ignore */ }
                if (state === "playing") start(pos);
              }}
              className="h-10 max-w-[11rem] rounded-full border border-line bg-bg px-3 text-sm text-fg"
              aria-label="Глас"
            >
              {bg.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name.replace(/Microsoft |Google | Online \(Natural\)| - Bulgarian \(Bulgaria\)/g, "")}</option>)}
            </select>
          )}
        </span>
      </div>
      {(err || (voices.length > 0 && bg.length === 0)) && (
        <p className="border-t border-line px-3 py-2 text-xs leading-relaxed text-warn" role="status">
          {err || "Не намирам български глас в този браузър. Добави български глас за четене на текст в настройките на устройството или опитай с друг браузър – иначе текстът ще звучи неправилно."}
        </p>
      )}
      {!active && !err && (
        <p className="border-t border-line px-3 py-2 text-xs text-faint">Чете се с гласа на твоето устройство. Блоковете с код и таблиците се пропускат.</p>
      )}
    </div>
  );
}

const strip = (s: string) => {
  const t = document.createElement("textarea");
  t.innerHTML = s.replace(/<[^>]+>/g, "");
  return t.value;
};

function LessonPage({ c, mi, li, sec }: { c: Course; mi: number; li: number; sec: number | null }) {
  const [done, setDone] = useState(loadDone);
  const k = `${c.slug}:${mi}:${li}`;
  const [title, min, type = "v"] = c.modules[mi].l[li];
  const short = content[c.slug]?.[mi]?.[li];
  const md = full[k];
  const { html, toc } = useMemo(() => {
    const toc: string[] = [];
    if (!md) return { html: "", toc };
    const raw = marked.parse(md, { async: false }) as string;
    const html = raw.replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, t: string) => {
      toc.push(strip(t));
      return `<h2 id="sec-${toc.length - 1}">${t}</h2>`;
    });
    return { html, toc };
  }, [md]);
  const flat = c.modules.flatMap((m, a) => m.l.map((_, b) => [a, b] as const));
  const pos = flat.findIndex(([a, b]) => a === mi && b === li);
  const prev = flat[pos - 1];
  const next = flat[pos + 1];
  const href = (x: readonly [number, number]) => lessonHref(c.slug, x[0], x[1]);
  const body = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(0);
  const [active, setActive] = useState(0);
  const [reader] = useReader();

  // ← и → за предишен и следващ урок
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === "ArrowLeft" && prev) location.hash = href(prev);
      if (e.key === "ArrowRight" && next) location.hash = href(next);
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [k]);

  useEffect(() => {
    window.scrollTo(0, 0);
    try { localStorage.setItem(LAST, JSON.stringify({ slug: c.slug, mi, li })); } catch { /* ignore */ }
  }, [k]);

  // Напредък при четене и активен раздел
  useEffect(() => {
    let raf = 0;
    const f = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = body.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - innerHeight * 0.6;
        setRead(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1);
        const hs = Array.from(el.querySelectorAll("h2"));
        let a = 0;
        hs.forEach((h, i) => { if (h.getBoundingClientRect().top < 140) a = i; });
        setActive(a);
      });
    };
    f();
    addEventListener("scroll", f, { passive: true });
    addEventListener("resize", f);
    return () => { cancelAnimationFrame(raf); removeEventListener("scroll", f); removeEventListener("resize", f); };
  }, [html]);

  // Бутон „Копирай“ към блоковете с код
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    el.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy")) return;
      const b = document.createElement("button");
      b.className = "copy no-print";
      b.type = "button";
      b.textContent = "Копирай";
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "");
          b.textContent = "Копирано";
        } catch {
          b.textContent = "Неуспешно";
        }
        setTimeout(() => (b.textContent = "Копирай"), 1600);
      });
      pre.appendChild(b);
    });
  }, [html]);

  // Връзка към раздел: бутон „#“ до всяко заглавие и отваряне на раздела от адреса
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    el.querySelectorAll("h2").forEach((h, i) => {
      if (h.querySelector(".anchor")) return;
      const b = document.createElement("button");
      b.className = "anchor no-print";
      b.type = "button";
      b.textContent = "#";
      b.setAttribute("aria-label", "Копирай връзка към този раздел");
      b.addEventListener("click", async () => {
        const url = `${location.origin}${location.pathname}#/kurs/${c.slug}/${mi}-${li}/${i}`;
        history.replaceState(null, "", url);
        try { await navigator.clipboard.writeText(url); b.textContent = "✓"; } catch { b.textContent = "#"; }
        setTimeout(() => (b.textContent = "#"), 1500);
      });
      h.appendChild(b);
    });
    if (sec !== null) setTimeout(() => document.getElementById(`sec-${sec}`)?.scrollIntoView({ block: "start" }), 50);
  }, [html]);

  const jump = (i: number) => document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const finish = () => {
    const nx = { ...done, [k]: true };
    setDone(nx);
    saveDone(nx);
    location.hash = next ? href(next) : `#/kurs/${c.slug}`;
  };
  const words = md ? md.trim().split(/\s+/).length : 0;

  return (
    <>
      <div className="no-print fixed left-0 top-16 z-30 h-0.5 w-full" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${read * 100}%` }} />
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className={`min-w-0 ${reader.wide ? "max-w-none" : "max-w-3xl"}`}>
          <nav className="no-print text-sm text-mute" aria-label="Път">
            <a href={`#/kurs/${c.slug}`} className="hover:text-ink">← {c.name}</a>
            <span className="mx-2 text-faint">/</span>
            <span>Модул {mi + 1}: {c.modules[mi].t}</span>
          </nav>
          <p className="eyebrow mt-8 text-accent">
            Урок {pos + 1} от {flat.length} · {TYPE[type].label} · {min} мин
          </p>
          <h1 className="display mt-4 text-[1.9rem] leading-[1.12] sm:text-5xl">{title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">
            {done[k] && <span className="inline-flex items-center gap-1.5 text-accent">{I.check} Завършен</span>}
            {words > 0 && <span>около {Math.max(1, Math.round(words / 180))} мин четене</span>}
          </p>
          <LessonTools k={k} />

          {videos[k] && <VideoBlock url={videos[k]} />}

          {html && <Listen root={body} dep={k} />}

          {toc.length > 2 && (
            <details className="no-print group mt-8 overflow-hidden rounded-xl border border-line lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
                Съдържание на урока
                <span className="text-xl font-normal text-accent transition-transform group-open:rotate-45">+</span>
              </summary>
              <ol className="border-t border-line px-4 py-3 text-sm text-mute">
                {toc.map((t, i) => (
                  <li key={i}><button onClick={() => jump(i)} className="block w-full py-1.5 text-left hover:text-accent">{t}</button></li>
                ))}
              </ol>
            </details>
          )}

          {html ? (
            <div ref={body} className="prose-vj mt-8" style={{ fontSize: FONT_SIZES[reader.fs] }} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            short && (
              <div ref={body} className="mt-8">
                <LessonBody c={short} done={!!done[k]} onDone={finish} />
              </div>
            )
          )}

          {(extVideos[c.slug]?.length ?? 0) > 0 && (
            <section className="no-print mt-14 border-t border-line pt-8">
              <h2 className="eyebrow text-second">Допълнителни материали</h2>
              <p className="mt-2 text-sm text-mute">Официални материали от създателите на софтуера (на английски).</p>
              <ul className="mt-4 space-y-2">
                {extVideos[c.slug].map((v) => (
                  <li key={v.url}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="card group flex items-start gap-3 p-3.5">
                      <span className="mt-0.5 font-mono text-xs text-accent">▶</span>
                      <span className="flex-1">
                        <span className="block text-sm text-fg group-hover:text-accent">{v.title}</span>
                        <span className="block text-xs text-mute">{v.by}{v.note ? ` · ${v.note}` : ""}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {html && short?.z && (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="eyebrow text-second">Тест</h2>
              <QuizView z={short.z} onPass={finish} />
            </section>
          )}

          <Notes k={k} />

          <div className="no-print mt-14 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {prev ? (
              <a href={href(prev)} className="card group p-4">
                <span className="eyebrow text-mute">← Предишен урок</span>
                <span className="mt-2 block text-[15px] font-semibold group-hover:text-accent">{c.modules[prev[0]].l[prev[1]][0]}</span>
              </a>
            ) : <span />}
            {html && !short?.z && (
              <button onClick={finish} className="btn justify-between rounded-xl p-4 text-left">
                <span>
                  <span className="block text-xs opacity-75">{next ? "Завърших – следващ урок" : "Последен урок"}</span>
                  <span className="mt-2 block text-[15px] normal-case tracking-normal">{next ? c.modules[next[0]].l[next[1]][0] : "Завърших курса"}</span>
                </span>
                {next ? I.arrow : I.check}
              </button>
            )}
          </div>
        </article>

        {toc.length > 2 && (
          <aside className="no-print hidden lg:block">
            <div className="sticky top-24">
              <p className="eyebrow text-second">В този урок</p>
              <ol className="mt-4 border-l border-line text-sm">
                {toc.map((t, i) => (
                  <li key={i}>
                    <button
                      onClick={() => jump(i)}
                      aria-current={i === active ? "true" : undefined}
                      className={`-ml-px block w-full border-l py-1.5 pl-4 text-left leading-snug transition-colors ${i === active ? "border-accent text-accent" : "border-transparent text-mute hover:text-fg"}`}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="mt-6 font-mono text-xs text-faint">{Math.round(read * 100)}% прочетено</p>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function embedUrl(u: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^www\./, "");
    if (h === "youtube.com" || h === "m.youtube.com") {
      const id = x.searchParams.get("v") || x.pathname.split("/").filter(Boolean).pop();
      return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (h === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed${x.pathname}` };
    if (h === "vimeo.com") return { kind: "iframe", src: `https://player.vimeo.com/video${x.pathname}` };
    if (/\.(mp4|webm|mov)$/i.test(x.pathname)) return { kind: "video", src: u };
    return { kind: "iframe", src: u };
  } catch {
    return null;
  }
}

function VideoBlock({ url }: { url?: string }) {
  const e = url ? embedUrl(url) : null;
  if (!e) return null;
  return (
    <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl bg-black">
      {e.kind === "video" ? (
        <video src={e.src} controls preload="metadata" className="h-full w-full" />
      ) : (
        <iframe
          src={e.src}
          title="Видео към урока"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["/ или Ctrl+K", "Търсене"],
    ["← и →", "Предишен и следващ урок"],
    ["T", "Светла или тъмна тема"],
    ["?", "Тази помощ"],
    ["Esc", "Затвори"],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sc-t" className="pop panel w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="sc-t" className="display text-2xl">Клавишни комбинации</h2>
        <dl className="mt-5 space-y-2.5">
          {rows.map(([a, b]) => (
            <div key={a} className="flex items-center justify-between gap-4 text-sm">
              <dt className="kbd py-0.5 text-[0.75rem] text-soft">{a}</dt>
              <dd className="text-soft">{b}</dd>
            </div>
          ))}
        </dl>
        <button onClick={onClose} className="btn-ghost mt-6 px-4 py-2 text-sm" autoFocus>Затвори</button>
      </div>
    </div>
  );
}
