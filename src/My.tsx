// „Моят напредък“, удостоверение и инструменти в урока (отметки, бележки, четене).
import { useEffect, useMemo, useRef, useState } from "react";
import { courses, lessonCount, type Course } from "./courses";
import { content } from "./content";
import {
  useStore, MARKS, NOTES, ACTIVITY, READER, NAME, READER_DEFAULT, FONT_SIZES, type Reader,
  today, streak, exportData, importData, clearData, download,
} from "./store";

const PROGRESS = "pv-progress-v1";
const LAST = "sk-last";
const href = (slug: string, mi: number, li: number) => `#/kurs/${slug}/${mi}-${li}`;
const parse = (k: string) => { const [slug, mi, li] = k.split(":"); return { slug, mi: Number(mi), li: Number(li) }; };
const titleOf = (k: string) => {
  const { slug, mi, li } = parse(k);
  const c = courses.find((x) => x.slug === slug);
  const l = c?.modules[mi]?.l[li];
  return c && l ? { c, title: l[0], href: href(slug, mi, li) } : null;
};
const doneIn = (c: Course, d: Record<string, boolean>) =>
  c.modules.reduce((n, m, mi) => n + m.l.filter((_, li) => d[`${c.slug}:${mi}:${li}`]).length, 0);

function Meter({ v }: { v: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/* ───────── Топлинна карта на активността (последните 18 седмици) ───────── */
function Heatmap({ a }: { a: Record<string, number> }) {
  const weeks = 18;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (weeks - 1) * 7 - ((end.getDay() + 6) % 7));
  const days: Date[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const max = Math.max(1, ...days.map((d) => a[today(d)] || 0));
  const lvl = (n: number) => (n ? Math.min(4, Math.ceil((n / max) * 4)) : 0);
  const op = [1, 0.3, 0.55, 0.8, 1];
  return (
    <div className="overflow-x-auto">
      <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Завършени уроци по дни за последните седмици">
        {days.map((d) => {
          const n = a[today(d)] || 0;
          return <span key={today(d)} title={`${d.toLocaleDateString("bg-BG")}: ${n} урока`} className={`h-3 w-3 rounded-[3px] ${n ? "bg-primary" : "bg-raised"}`} style={{ opacity: op[lvl(n)] }} />;
        })}
      </div>
    </div>
  );
}

/* ───────── Страница „Моят напредък“ ───────── */
export function MyPage() {
  const [done, setDone] = useStore<Record<string, boolean>>(PROGRESS, {});
  const [marks, setMarks] = useStore<string[]>(MARKS, []);
  const [notes] = useStore<Record<string, string>>(NOTES, {});
  const [act] = useStore<Record<string, number>>(ACTIVITY, {});
  const [last] = useStore<{ slug: string; mi: number; li: number } | null>(LAST, null);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const total = Object.values(done).filter(Boolean).length;
  const started = courses.filter((c) => doneIn(c, done) > 0);
  const finished = started.filter((c) => doneIn(c, done) === lessonCount(c));
  const lastT = last ? titleOf(`${last.slug}:${last.mi}:${last.li}`) : null;
  const noteKeys = Object.keys(notes).filter((k) => notes[k]?.trim() && titleOf(k));
  const markKeys = marks.filter((k) => titleOf(k));

  const onImport = async (f?: File) => {
    if (!f) return;
    try {
      const n = importData(await f.text());
      setMsg(`Внесено: ${n} записа. Страницата се презарежда…`);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setMsg(e instanceof Error && e.message.startsWith("Това") ? e.message : "Файлът не може да се прочете. Избери файл, изнесен от школата.");
    }
  };
  const offline = async () => {
    try {
      const r = await fetch(location.pathname, { cache: "no-store" });
      if (!r.ok) throw new Error();
      download("svetlina-i-kod.html", await r.text(), "text/html");
      setMsg("Файлът е свален. Отвори го с браузъра и учиш и без интернет.");
    } catch {
      setMsg("Свалянето не стана оттук. Отвори школата онлайн и опитай отново.");
    }
  };

  const stats = [
    [total, "завършени урока"],
    [started.length, "започнати курса"],
    [finished.length, "завършени курса"],
    [streak(act), "поредни дни"],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <a href="#" className="text-sm text-mute hover:text-ink">← Начало</a>
      <p className="eyebrow mt-8 text-accent">Само в твоя браузър</p>
      <h1 className="display mt-3 text-[2rem] leading-tight sm:text-5xl">Моят напредък</h1>
      <p className="mt-4 max-w-2xl text-soft">Завършени уроци, отметки и бележки. Нищо не се изпраща никъде. Изнеси файл, за да пренесеш напредъка на друго устройство.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([n, l]) => (
          <div key={l} className="panel p-4">
            <p className="display text-3xl">{n}</p>
            <p className="mt-1 text-sm text-mute">{l}</p>
          </div>
        ))}
      </div>

      <a href="#/pregovor" className="card group mt-4 flex items-center justify-between gap-4 p-5">
        <span>
          <span className="eyebrow text-mute">Преговор с карти</span>
          <span className="mt-1.5 block font-semibold group-hover:text-accent">Повтори въпросите и уроците, които са за днес</span>
        </span>
        <span className="text-accent">→</span>
      </a>

      {lastT && (
        <a href={lastT.href} className="card group mt-4 flex items-center justify-between gap-4 p-5">
          <span>
            <span className="eyebrow text-mute">Продължи оттам, докъдето стигна</span>
            <span className="mt-1.5 block font-semibold group-hover:text-accent">{lastT.title}</span>
            <span className="block text-sm text-mute">{lastT.c.name}</span>
          </span>
          <span className="text-accent">→</span>
        </a>
      )}

      <section className="mt-12">
        <h2 className="eyebrow text-second">Активност</h2>
        <div className="panel mt-4 p-5">
          <Heatmap a={act} />
          <p className="mt-3 text-xs text-faint">Всяко квадратче е един ден. Колкото по-ярко, толкова повече уроци си завършил.</p>
        </div>
      </section>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
        <section>
          <h2 className="eyebrow text-second">Курсове</h2>
          {started.length === 0 ? (
            <p className="mt-4 text-mute">Още нямаш завършени уроци. <a href="#kursove" className="text-accent underline underline-offset-4">Избери курс</a>.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {started.map((c) => {
                const d = doneIn(c, done), n = lessonCount(c);
                return (
                  <li key={c.slug} className="panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <a href={`#/kurs/${c.slug}`} className="font-semibold hover:text-accent">{c.name}</a>
                      <span className="whitespace-nowrap font-mono text-xs text-mute">{d} / {n}</span>
                    </div>
                    <div className="mt-3"><Meter v={d / n} /></div>
                    {d === n && <a href={`#/sertifikat/${c.slug}`} className="mt-3 inline-block text-sm text-accent underline underline-offset-4">Вземи удостоверение</a>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="eyebrow text-second">Отметки</h2>
          {markKeys.length === 0 ? (
            <p className="mt-4 text-mute">Няма отметки. В урока избери „Запази“, за да се върнеш към него по-късно.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {markKeys.map((k) => { const t = titleOf(k)!; return (
                <li key={k} className="panel flex items-center justify-between gap-3 p-3.5">
                  <a href={t.href} className="min-w-0 flex-1 hover:text-accent"><span className="block truncate text-[15px]">{t.title}</span><span className="block truncate text-xs text-mute">{t.c.name}</span></a>
                  <button onClick={() => setMarks(marks.filter((x) => x !== k))} className="text-xs text-mute hover:text-danger" aria-label={`Премахни отметката „${t.title}“`}>Премахни</button>
                </li>
              ); })}
            </ul>
          )}

          <h2 className="eyebrow mt-10 text-second">Бележки</h2>
          {noteKeys.length === 0 ? (
            <p className="mt-4 text-mute">Няма бележки. Пиши ги под всеки урок – пазят се автоматично.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {noteKeys.map((k) => { const t = titleOf(k)!; return (
                <li key={k} className="panel p-3.5">
                  <a href={t.href} className="text-[15px] font-semibold hover:text-accent">{t.title}</a>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-soft">{notes[k]}</p>
                </li>
              ); })}
            </ul>
          )}
          {noteKeys.length > 0 && (
            <button
              onClick={() => download("belezhki-svetlina-i-kod.md", noteKeys.map((k) => { const t = titleOf(k)!; return `## ${t.title}\n_${t.c.name}_\n\n${notes[k].trim()}\n`; }).join("\n"), "text/markdown")}
              className="btn-ghost mt-4 px-4 py-2 text-sm"
            >Свали бележките (.md)</button>
          )}
        </section>
      </div>

      <section className="mt-12">
        <h2 className="eyebrow text-second">Данни и офлайн</h2>
        <div className="panel mt-4 flex flex-wrap gap-3 p-5">
          <button onClick={() => download(`napredak-${today()}.json`, exportData())} className="btn px-4 py-2.5 text-sm">Изнеси напредъка</button>
          <button onClick={() => file.current?.click()} className="btn-ghost px-4 py-2.5 text-sm">Внеси от файл</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          <button onClick={offline} className="btn-ghost px-4 py-2.5 text-sm">Свали школата за офлайн</button>
          <button
            onClick={() => { if (confirm("Да изтрия ли целия напредък, отметките и бележките в този браузър? Това не може да се отмени.")) { clearData(); setDone({}); setMarks([]); setMsg("Данните са изтрити."); setTimeout(() => location.reload(), 600); } }}
            className="px-4 py-2.5 text-sm text-mute hover:text-danger"
          >Изтрий всичко</button>
          {msg && <p className="w-full text-sm text-soft" role="status">{msg}</p>}
        </div>
      </section>
    </div>
  );
}

/* ───────── Удостоверение за завършен курс ───────── */
export function Certificate({ c }: { c: Course }) {
  const [done] = useStore<Record<string, boolean>>(PROGRESS, {});
  const [act] = useStore<Record<string, number>>(ACTIVITY, {});
  const [name, setName] = useStore<string>(NAME, "");
  const d = doneIn(c, done), n = lessonCount(c);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const dates = Object.keys(act).filter((k) => act[k]).sort();
  const date = new Date(dates.length ? dates[dates.length - 1] : today()).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });

  if (d < n)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <a href={`#/kurs/${c.slug}`} className="text-sm text-mute hover:text-ink">← {c.name}</a>
        <h1 className="display mt-8 text-4xl">Удостоверението те чака</h1>
        <p className="mt-4 text-soft">Завърши всички уроци в курса, за да го получиш. Имаш {d} от {n}.</p>
        <div className="mt-6 max-w-sm"><Meter v={d / n} /></div>
        <a href={`#/kurs/${c.slug}`} className="btn mt-8 px-5 py-3 text-sm">Към курса</a>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="no-print">
        <a href={`#/kurs/${c.slug}`} className="text-sm text-mute hover:text-ink">← {c.name}</a>
        <h1 className="display mt-6 text-3xl sm:text-4xl">Удостоверение</h1>
        <label className="mt-6 block max-w-md text-sm text-mute">
          Име върху удостоверението
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Твоето име" maxLength={60} className="field mt-2 block w-full rounded-xl px-4 py-2.5 text-base text-fg outline-none" />
        </label>
        <button onClick={() => print()} className="btn mt-4 px-5 py-3 text-sm">Отпечатай или запази като PDF</button>
      </div>
      <div className="cert mt-8 rounded-2xl border-2 border-primary bg-surface p-8 text-center sm:p-14">
        <p className="eyebrow text-accent">Светлина и код · безплатна школа</p>
        <p className="mt-8 text-sm text-mute">Удостоверява се, че</p>
        <p className="display mt-3 text-3xl sm:text-5xl">{name.trim() || "…"}</p>
        <p className="mt-6 text-sm text-mute">завърши самостоятелно всички {n} урока от курса</p>
        <p className="display mx-auto mt-3 max-w-2xl text-xl sm:text-2xl">{c.name}</p>
        <p className="mt-8 font-mono text-xs text-mute">{date} · {c.modules.length} модула</p>
        <p className="mx-auto mt-8 max-w-lg text-[11px] leading-relaxed text-faint">
          Удостоверението се създава в браузъра на ученика по отбелязания от него напредък. То не е официален документ за образование и не е проверено от трета страна.
        </p>
      </div>
    </div>
  );
}

/* ───────── Инструменти в урока ───────── */
export function useReader() {
  const [r, setR] = useStore<Reader>(READER, READER_DEFAULT);
  return [{ ...READER_DEFAULT, ...r }, setR] as const;
}

export function LessonTools({ k }: { k: string }) {
  const [marks, setMarks] = useStore<string[]>(MARKS, []);
  const [r, setR] = useReader();
  const on = marks.includes(k);
  return (
    <div className="no-print mt-6 flex flex-wrap items-center gap-2">
      <button onClick={() => setMarks(on ? marks.filter((x) => x !== k) : [...marks, k])} aria-pressed={on} className={`chip px-3 py-1.5 text-sm ${on ? "border-accent text-accent" : "text-soft hover:text-accent"}`}>
        {on ? "★ Запазен" : "☆ Запази"}
      </button>
      <span className="chip gap-0 p-0 text-sm text-soft" role="group" aria-label="Размер на текста">
        <button onClick={() => setR({ ...r, fs: Math.max(0, r.fs - 1) })} disabled={r.fs === 0} className="px-3 py-1.5 hover:text-accent disabled:opacity-40" aria-label="По-малък текст">A−</button>
        <span className="h-4 w-px bg-line" />
        <button onClick={() => setR({ ...r, fs: Math.min(FONT_SIZES.length - 1, r.fs + 1) })} disabled={r.fs === FONT_SIZES.length - 1} className="px-3 py-1.5 hover:text-accent disabled:opacity-40" aria-label="По-голям текст">A+</button>
      </span>
      <button onClick={() => setR({ ...r, wide: !r.wide })} aria-pressed={r.wide} className={`chip hidden px-3 py-1.5 text-sm lg:inline-flex ${r.wide ? "border-accent text-accent" : "text-soft hover:text-accent"}`}>
        Широк текст
      </button>
      <FocusTimer />
      <button onClick={() => print()} className="chip px-3 py-1.5 text-sm text-soft hover:text-accent">Отпечатай</button>
    </div>
  );
}

export function Notes({ k }: { k: string }) {
  const [notes, setNotes] = useStore<Record<string, string>>(NOTES, {});
  const [v, setV] = useState(notes[k] || "");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setV(notes[k] || ""); }, [k]);
  useEffect(() => {
    if ((notes[k] || "") === v) return;
    const t = setTimeout(() => {
      const nx = { ...notes };
      if (v.trim()) nx[k] = v; else delete nx[k];
      setNotes(nx);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }, 500);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <section className="no-print mt-12 border-t border-line pt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow text-second"><label htmlFor="note">Моите бележки</label></h2>
        <span className="text-xs text-faint" role="status">{saved ? "Запазено" : "Пазят се само в този браузър"}</span>
      </div>
      <textarea
        id="note"
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={4}
        placeholder="Какво научих, какво да пробвам, въпроси…"
        className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-fg outline-none placeholder:text-faint focus:border-accent"
      />
    </section>
  );
}

/* ───────── Преговор с карти (система на Лайтнер) ───────── */
const REVIEW = "sk-review";
const BOXES = [0, 1, 3, 7, 16]; // дни до следващото показване за кутия 0…4
type Card =
  | { id: string; kind: "q"; course: Course; lesson: string; q: string; opts: string[]; correct: number }
  | { id: string; kind: "l"; course: Course; lesson: string; s: string; k: string[] };

function allCards(done: Record<string, boolean>, scope: "started" | "all"): Card[] {
  const out: Card[] = [];
  for (const c of courses) {
    if (scope === "started" && doneIn(c, done) === 0) continue;
    (content[c.slug] || []).forEach((m, mi) =>
      m.forEach((x, li) => {
        const lesson = c.modules[mi]?.l[li]?.[0];
        if (!lesson) return;
        const key = `${c.slug}:${mi}:${li}`;
        x.z?.forEach(([q, opts, correct], qi) => out.push({ id: `q:${key}:${qi}`, kind: "q", course: c, lesson, q, opts, correct }));
        if (!x.z && done[key] && x.k.length) out.push({ id: `l:${key}`, kind: "l", course: c, lesson, s: x.s, k: x.k });
      })
    );
  }
  return out;
}

const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return today(d); };
// Разбъркване, зависещо само от id и деня – стабилно при презареждане
const rnd = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

export function ReviewPage() {
  const [done] = useStore<Record<string, boolean>>(PROGRESS, {});
  const [state, setState] = useStore<Record<string, { b: number; due: string }>>(REVIEW, {});
  const [scope, setScope] = useState<"started" | "all">(() => (Object.values(done).some(Boolean) ? "started" : "all"));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState({ ok: 0, all: 0 });
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const cards = useMemo(() => allCards(done, scope), [scope]);
  const t = today();
  const queue = useMemo(
    () => cards.filter((c) => (state[c.id]?.due ?? t) <= t).sort((a, b) => rnd(a.id + t) - rnd(b.id + t)).slice(0, 15),
    [cards, scope]
  );
  const card = queue[i];
  const order = useMemo(() => (card?.kind === "q" ? card.opts.map((_, k) => k).sort((a, b) => rnd(card.id + a + t) - rnd(card.id + b + t)) : []), [card?.id]);
  const learned = cards.filter((c) => (state[c.id]?.b ?? 0) >= 3).length;

  const grade = (ok: boolean) => {
    const b = ok ? Math.min(4, (state[card.id]?.b ?? 0) + 1) : 0;
    setState({ ...state, [card.id]: { b, due: addDays(ok ? BOXES[b] : 0) } });
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), all: s.all + 1 }));
    setPick(null); setShown(false); setI(i + 1);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <a href="#/moi" className="text-sm text-mute hover:text-ink">← Моят напредък</a>
      <p className="eyebrow mt-8 text-accent">Преговор с карти</p>
      <h1 className="display mt-3 text-[2rem] leading-tight sm:text-5xl">Преговор</h1>
      <p className="mt-4 text-soft">
        Въпросите от тестовете и картите от завършените уроци се връщат през все по-дълги интервали: на следващия ден, след 3, 7 и 16 дни.
        Грешният отговор връща картата в началото.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Обхват">
        {([["started", "Започнатите курсове"], ["all", "Всички курсове"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => { setScope(v); setI(0); setPick(null); setShown(false); }} aria-pressed={scope === v}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${scope === v ? "border-primary bg-primary font-semibold text-on-primary" : "border-line text-mute hover:text-fg"}`}>{l}</button>
        ))}
        <span className="ml-auto font-mono text-xs text-mute">{learned} / {cards.length} научени</span>
      </div>

      <div className="panel mt-8 p-6 sm:p-8">
        {!card ? (
          <div className="text-center">
            <p className="display text-2xl">{score.all ? `Готово: ${score.ok} от ${score.all} верни` : cards.length ? "Няма карти за днес" : "Още няма карти"}</p>
            <p className="mt-3 text-mute">
              {cards.length ? "Ела утре за следващите карти." : "Завърши урок или избери „Всички курсове“, за да се появят карти."}
            </p>
            {score.all > 0 && queue.length === 15 && (
              <button onClick={() => { setI(0); setScore({ ok: 0, all: 0 }); location.reload(); }} className="btn-ghost mt-6 px-4 py-2 text-sm">Още карти</button>
            )}
          </div>
        ) : (
          <div key={card.id} className="rise">
            <div className="flex items-center justify-between gap-3 text-xs text-mute">
              <span className="truncate">{card.course.name}</span>
              <span className="font-mono">{i + 1} / {queue.length}</span>
            </div>
            <p className="mt-1 text-xs text-faint">{card.lesson}</p>
            {card.kind === "q" ? (
              <>
                <p className="mt-5 text-lg font-semibold text-ink">{card.q}</p>
                <div className="mt-4 space-y-2">
                  {order.map((k) => {
                    const st = pick === null ? "border-line hover:border-accent" : k === card.correct ? "border-second text-second" : k === pick ? "border-danger text-danger" : "border-line opacity-60";
                    return (
                      <button key={k} disabled={pick !== null} onClick={() => setPick(k)} className={`block w-full rounded-xl border px-4 py-3 text-left text-[15px] ${st}`}>
                        {card.opts[k]}
                      </button>
                    );
                  })}
                </div>
                {pick !== null && (
                  <button onClick={() => grade(pick === card.correct)} className="btn mt-5 px-5 py-2.5 text-sm" autoFocus>
                    {pick === card.correct ? "Вярно – напред" : "Ще го видиш пак – напред"}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-5 text-lg font-semibold text-ink">Кои са основните идеи на урока „{card.lesson}“?</p>
                <p className="mt-2 text-sm text-mute">Отговори си наум, после отвори картата.</p>
                {!shown ? (
                  <button onClick={() => setShown(true)} className="btn-ghost mt-5 px-5 py-2.5 text-sm">Покажи отговора</button>
                ) : (
                  <>
                    <p className="mt-5 text-soft">{card.s}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-soft">{card.k.map((x) => <li key={x}>– {x}</li>)}</ul>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button onClick={() => grade(true)} className="btn px-5 py-2.5 text-sm">Знаех го</button>
                      <button onClick={() => grade(false)} className="btn-ghost px-5 py-2.5 text-sm">Не съвсем</button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Таймер за фокус (25 минути) ───────── */
const FOCUS = "sk-focus";
export function FocusTimer() {
  const [f, setF] = useStore<{ end: number; left: number } | null>(FOCUS, null);
  const [, tick] = useState(0);
  const running = !!f && f.end > 0;
  const left = !f ? 25 * 60 : running ? Math.max(0, Math.round((f.end - Date.now()) / 1000)) : f.left;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) {
      setF(null);
      try {
        const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain();
        o.frequency.value = 660; g.gain.setValueAtTime(0.15, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.2);
        o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 1.2);
      } catch { /* ignore */ }
      alertDone();
    }
  }, [left, running]);
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <span className="chip gap-0 p-0 text-sm text-soft" role="group" aria-label="Таймер за фокус">
      <button
        onClick={() => setF(running ? { end: 0, left } : { end: Date.now() + left * 1000, left })}
        className={`px-3 py-1.5 hover:text-accent ${running ? "text-accent" : ""}`}
        aria-label={running ? "Пауза на таймера" : "Пусни таймер за фокус"}
      >
        {running ? "❚❚" : "▶"} <span className="font-mono">{mm}</span>
      </button>
      {f && (
        <>
          <span className="h-4 w-px bg-line" />
          <button onClick={() => setF(null)} className="px-2.5 py-1.5 hover:text-accent" aria-label="Нулирай таймера">↺</button>
        </>
      )}
    </span>
  );
}
function alertDone() {
  const t = document.title;
  document.title = "Време за почивка – Светлина и код";
  setTimeout(() => (document.title = t), 8000);
}
