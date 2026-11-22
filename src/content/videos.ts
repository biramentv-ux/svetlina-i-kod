// ── ТВОИТЕ ВИДЕА ──────────────────────────────────────────────
// Ключ: "<slug на курса>:<индекс на модул>:<индекс на урок>" (от 0).
// Стойност: линк към YouTube, Vimeo или директен .mp4/.webm файл.
// Пример: "nachinaesht-vj:0:0": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
export const videos: Record<string, string> = {};

// ── ДОПЪЛНИТЕЛНИ ВИДЕО МАТЕРИАЛИ (официални източници) ────────
// Показват се във всеки урок на съответния курс.
export type ExtVideo = { title: string; url: string; by: string; note?: string };
const R = (title: string, path: string): ExtVideo => ({ title, url: `https://resolume.com/training/${path}`, by: "Resolume – официално видео обучение" });
const HAP: ExtVideo = { title: "Using HAP – как се експортира и ползва HAP", url: "https://hap.video/using-hap", by: "VIDVOX – официален сайт на HAP", note: "ръководство" };

export const extVideos: Record<string, ExtVideo[]> = {
  "nachinaesht-vj": [
    R("Avenue & Arena: 1. Основи (Basics)", "2/8/42"),
    R("Avenue & Arena: 4. Ритъм (Rhythm)", "2/11/63"),
    HAP,
  ],
  resolume: [
    R("Avenue & Arena: 1. Основи (Basics)", "2/8/42"),
    R("Avenue & Arena: 2. Композиране (Compositing)", "2/9/49"),
    R("Avenue & Arena: 3. Цвят (Color)", "2/10/58"),
    R("Avenue & Arena: 4. Ритъм (Rhythm)", "2/11/63"),
    R("Avenue & Arena: 5. Изпълнение (Performance)", "2/12/70"),
    R("Avenue & Arena: 6. Външно управление (External Control)", "2/13/74"),
    R("Avenue & Arena: 7. Проекционен мапинг (Projection Mapping)", "2/14/79"),
    R("Wire: 1. Основи (Basics)", "3/15/84"),
    R("Wire: 2. Инстансинг (Instancing)", "3/16/95"),
  ],
  "saveti-i-trikove": [R("Avenue & Arena: 5. Изпълнение (Performance)", "2/12/70"), HAP],
  synesthesia: [
    { title: "Synesthesia – официален YouTube канал", url: "https://www.youtube.com/channel/UCN91NOZFK06VxOMbFw_-E2g", by: "Synesthesia" },
    { title: "Документация: ръчно ръководство, Scene Editor и SSF шейдъри", url: "https://app.synesthesia.live/docs", by: "Synesthesia", note: "ръководство" },
  ],
  nestdrop: [
    { title: "Инсталация и основни функции (NestDrop Classic)", url: "https://youtu.be/JTmO1L4Wwqs", by: "N.E.S.T. Immersion – NestDrop" },
    { title: "Разширени функции (Midnight и Midnight Pro V2)", url: "https://youtu.be/IvZjRDognXw", by: "N.E.S.T. Immersion – NestDrop" },
    { title: "Представяне на NestDrop", url: "https://www.youtube.com/watch?v=IWjIu61Nhfo", by: "N.E.S.T. Immersion – NestDrop" },
    { title: "Подробно ръководство за потребителя (PDF)", url: "https://nestimmersion.ca/assets/nestdrop_user_manual_V2x2.pdf", by: "N.E.S.T. Immersion", note: "ръководство" },
  ],
  "notch-vfx": [
    { title: "Notch – видео курсове (Learning › Video Courses)", url: "https://manual.notch.one/2026.2/en/docs/learning/courses/", by: "Notch – официален наръчник" },
    { title: "Notch Essentials – основен видео курс", url: "https://manual.notch.one/2026.2/en/docs/learning/courses/essentials/", by: "Notch – официален наръчник" },
  ],
  "back-to-back": [
    R("Avenue & Arena: 6. Външно управление (External Control)", "2/13/74"),
    { title: "Spout – споделяне на видео между програми (Windows)", url: "https://spout.zeal.co/", by: "Spout – официален сайт", note: "ръководство" },
    { title: "Ableton Link – синхрон на темпото между програми", url: "https://ableton.github.io/link", by: "Ableton", note: "документация" },
  ],
  "2d-animaciya": [
    { title: "After Effects – официални уроци", url: "https://www.adobe.com/learn/after-effects", by: "Adobe" },
    HAP,
  ],
  "ii-ot-perceptrona-do-llm": [
    { title: "Let's build GPT: from scratch, in code, spelled out", url: "https://www.youtube.com/watch?v=kCc8FmEb1nY", by: "Andrej Karpathy", note: "на английски" },
    { title: "LLM Course – безплатен курс", url: "https://huggingface.co/learn/llm-course", by: "Hugging Face", note: "текст и код" },
  ],
  "ghidra-reverse-engineering": [
    { title: "Ghidra – официално хранилище, документация и издания", url: "https://github.com/NationalSecurityAgency/ghidra", by: "NSA", note: "GitHub" },
  ],
};
