// Записва видео урок от спецификация: node scripts/video/render.mjs videos/<slug>/m0-l0.json
// Резултат до спецификацията: .mp4 (видео със субтитри във кадъра) и .meta.json (заглавие, времетраене, субтитри за текстовия вариант).
// Нужни: Playwright (Chromium) и ffmpeg. Записът върви в реално време.
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "../..");

const specPath = resolve(process.argv[2]);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const base = specPath.replace(/\.json$/, "");
const tpl = readFileSync(join(here, "template.html"), "utf8")
  .replaceAll("FONTS", "file://" + join(root, "vendor/fonts"))
  .replace("__SPEC__", () => JSON.stringify(spec).replaceAll("</", "<\\/"));
const tmp = mkdtempSync(join(tmpdir(), "vid-"));
const html = join(tmp, "page.html");
writeFileSync(html, tpl);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
const startedAt = Date.now();
const page = await ctx.newPage();
await page.exposeFunction("__key", async (key, hold) => { await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key); });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.__done === true, null, { timeout: 15 * 60 * 1000, polling: 500 });
const t0 = await page.evaluate(() => window.__t0);
const cues = await page.evaluate(() => window.__cues);
await ctx.close();
await browser.close();
const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"));
const off = Math.max(0, (t0 - startedAt) / 1000);
const mp4 = base + ".mp4";
execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", off.toFixed(2), "-i", join(tmp, webm), "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-r", "25", "-movflags", "+faststart", "-an", mp4]);
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim());
const meta = { title: spec.title, dur: Math.round(dur), size: statSync(mp4).size, cues: cues.filter((c) => c[2]) };
writeFileSync(base + ".meta.json", JSON.stringify(meta, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(`${basename(mp4)}: ${Math.round(dur)} s, ${(meta.size / 1024).toFixed(0)} KB, ${meta.cues.length} реда субтитри${errs.length ? ", грешки в страницата: " + errs.join("; ") : ""}`);
