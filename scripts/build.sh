#!/usr/bin/env bash
# Сглобява школата в един файл: bundle.html и deploy/index.html
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_URL="${SITE_URL:-https://shkola.dyrakarmy.eu/}"
node scripts/gen-fonts.mjs
node scripts/gen-lessons.mjs
# Parcel сглобява приложението, html-inline вгражда всичко в един HTML файл
rm -rf dist bundle.html
pnpm exec parcel build index.html --dist-dir dist --no-source-maps --log-level error
pnpm exec html-inline dist/index.html > bundle.html
# Каноничният адрес се добавя след сглобяването (инструментът иначе се опитва да го вгради като файл).
python3 - "$SITE_URL" <<'PY'
import sys
p = "bundle.html"; s = open(p, encoding="utf8").read()
tag = '<link rel="canonical" href="%s">' % sys.argv[1]
assert "</title>" in s and len(s) > 1_000_000, "сглобяването не е успяло"
assert "\ufffd" not in s, "в някой урок има повреден знак (U+FFFD) – намери го с grep в lessons/"
if 'rel="canonical"' not in s:
    s = s.replace("</title>", "</title>" + tag, 1)
open(p, "w", encoding="utf8").write(s)
open("deploy/index.html", "w", encoding="utf8").write(s)
print("готово:", round(len(s.encode()) / 1e6, 2), "MB")
PY
