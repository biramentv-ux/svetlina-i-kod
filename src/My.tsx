// „Моят напредък“, удостоверение и инструменти в урока (отметки, бележки, четене).
import { useEffect, useRef, useState } from "react";
import { courses, lessonCount, type Course } from "./courses";
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
