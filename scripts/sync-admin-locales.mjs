/**
 * Sync uz/ru/zh admin.json from en/admin.json with full translations.
 * Run: node scripts/sync-admin-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en/admin.json"), "utf8"));

// Load pre-built translation maps (English value -> locale string)
const maps = JSON.parse(fs.readFileSync(path.join(root, "scripts/admin-locale-maps.json"), "utf8"));

function translateTree(obj, locale) {
  const map = maps[locale] ?? {};
  if (typeof obj === "string") return map[obj] ?? obj;
  if (Array.isArray(obj)) return obj.map((v) => translateTree(v, locale));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = translateTree(v, locale);
    return out;
  }
  return obj;
}

for (const locale of ["uz", "ru", "zh"]) {
  const translated = translateTree(en, locale);
  fs.writeFileSync(
    path.join(root, `src/i18n/locales/${locale}/admin.json`),
    JSON.stringify(translated, null, 2) + "\n"
  );
  console.log(`Synced ${locale}/admin.json`);
}
