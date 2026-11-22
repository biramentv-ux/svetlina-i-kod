// Вгражда шрифтовете като base64 в src/fonts.css, за да остане сайтът един файл без външни зависимости.
import fs from "fs";
const R = {
  cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
};
const faces = [
  ["Literata", "literata", [700]],
  ["Inter", "inter", [400, 600]],
  ["JetBrains Mono", "jetbrains-mono", [400]],
];
let css = "/* генерирано от scripts/gen-fonts.mjs – не редактирай */\n";
for (const [family, pkg, weights] of faces)
  for (const w of weights)
    for (const sub of ["cyrillic", "latin"]) {
      const f = `vendor/fonts/${pkg}-${sub}-${w}-normal.woff2`;
      const b64 = fs.readFileSync(f).toString("base64");
      css += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${R[sub]}}\n`;
    }
fs.writeFileSync("src/fonts.css", css);
console.log("fonts.css:", (css.length / 1024).toFixed(0), "KB");
