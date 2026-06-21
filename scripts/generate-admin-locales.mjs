/**
 * Generates uz/ru/zh admin.json from en/admin.json using embedded translations.
 * Run: node scripts/generate-admin-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en/admin.json"), "utf8"));

/** Recursively walk object and translate leaf strings via locale map or fallback. */
function translateTree(source, map, fallback = source) {
  if (typeof source === "string") {
    return map[source] ?? fallback ?? source;
  }
  if (Array.isArray(source)) {
    return source.map((item, i) => translateTree(item, map, fallback?.[i]));
  }
  if (source && typeof source === "object") {
    const out = {};
    for (const [k, v] of Object.entries(source)) {
      out[k] = translateTree(v, map, fallback?.[k]);
    }
    return out;
  }
  return source;
}

/** Flatten en admin tree to string->path for building translation maps. */
function flattenStrings(obj, prefix = "", acc = {}) {
  if (typeof obj === "string") {
    acc[obj] = prefix;
    return acc;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      flattenStrings(v, prefix ? `${prefix}.${k}` : k, acc);
    }
  }
  return acc;
}

// Import locale-specific string maps (English -> target)
const uzMap = JSON.parse(fs.readFileSync(path.join(__dirname, "admin-locale-uz.json"), "utf8"));
const ruMap = JSON.parse(fs.readFileSync(path.join(__dirname, "admin-locale-ru.json"), "utf8"));
const zhMap = JSON.parse(fs.readFileSync(path.join(__dirname, "admin-locale-zh.json"), "utf8"));

for (const [locale, map] of [
  ["uz", uzMap],
  ["ru", ruMap],
  ["zh", zhMap],
]) {
  const translated = translateTree(en, map, en);
  fs.writeFileSync(
    path.join(root, `src/i18n/locales/${locale}/admin.json`),
    JSON.stringify(translated, null, 2) + "\n"
  );
  console.log(`Written ${locale}/admin.json`);
}
