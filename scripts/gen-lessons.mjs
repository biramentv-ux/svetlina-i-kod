// Събира lessons/<slug>/m<mi>-l<li>.md в src/content/full.ts
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "lessons");
const out = {};
if (existsSync(dir)) {
  for (const slug of readdirSync(dir)) {
    const p = join(dir, slug);
    if (!statSync(p).isDirectory()) continue;
    for (const f of readdirSync(p)) {
      const m = f.match(/^m(\d+)-l(\d+)\.md$/);
      if (m) out[`${slug}:${m[1]}:${m[2]}`] = readFileSync(join(p, f), "utf8");
    }
  }
}
writeFileSync(
  join(root, "src/content/full.ts"),
  "// Генериран файл – не редактирай. Източник: lessons/*.md\nexport const full: Record<string, string> = " + JSON.stringify(out) + ";\n"
);
console.log("пълни уроци:", Object.keys(out).length);
