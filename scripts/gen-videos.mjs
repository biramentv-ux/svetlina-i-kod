// Събира videos/<курс>/m<модул>-l<урок>.meta.json в src/content/lessonVideos.ts
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "videos");
const out = {};
if (existsSync(dir)) {
  for (const slug of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const f of readdirSync(join(dir, slug)).filter((f) => f.endsWith(".meta.json"))) {
      const m = /^m(\d+)-l(\d+)\.meta\.json$/.exec(f);
      if (!m || !existsSync(join(dir, slug, f.replace(".meta.json", ".mp4")))) continue;
      const j = JSON.parse(readFileSync(join(dir, slug, f), "utf8"));
      out[`${slug}:${m[1]}:${m[2]}`] = { src: `video/${slug}/m${m[1]}-l${m[2]}.mp4`, dur: j.dur, size: j.size, cues: j.cues.map((c) => [c[0], c[2]]) };
    }
  }
}
const head = "// Генерирано от scripts/gen-videos.mjs – не редактирай на ръка.\nexport type LessonVideo = { src: string; dur: number; size: number; cues: [number, string][] };\n";
writeFileSync(join(root, "src/content/lessonVideos.ts"), head + "export const lessonVideos: Record<string, LessonVideo> = " + JSON.stringify(out, null, 1) + ";\n");
console.log("видеа:", Object.keys(out).length);
