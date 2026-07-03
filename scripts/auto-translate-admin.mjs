/**
 * Auto-replace user-visible English strings in admin TSX with t("key").
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en/admin.json"), "utf8"));
const common = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en/common.json"), "utf8"));

function flatten(obj, prefix, acc = new Map()) {
  if (typeof obj === "string") {
    if (!acc.has(obj)) acc.set(obj, prefix);
    return acc;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, acc);
  }
  return acc;
}

const valueToKey = flatten(en, "");
for (const [k, v] of Object.entries(common.adminNav ?? {})) {
  if (typeof v === "string" && !valueToKey.has(v)) valueToKey.set(v, `adminNav.${k}`);
}
flatten(common.common ?? {}, "common", valueToKey);

const entries = [...valueToKey.entries()]
  .filter(([v]) => v.length >= 4 && !v.includes("{{") && v !== "—")
  .sort((a, b) => b[0].length - a[0].length);

const files = [
  "src/pages/AdminDashboard.tsx",
  ...fs.readdirSync(path.join(root, "src/features/admin/pages"))
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .map((f) => `src/features/admin/pages/${f}`),
  ...fs.readdirSync(path.join(root, "src/features/admin/components"))
    .filter((f) => f.endsWith(".tsx") && !["AdminPageHeader.tsx", "AdminLayout.tsx"].includes(f))
    .map((f) => `src/features/admin/components/${f}`),
];

function alreadyHasKey(src, key) {
  return src.includes(`t("${key}")`) || src.includes(`t('${key}')`);
}

for (const rel of files) {
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("useTranslation")) continue;

  let count = 0;
  for (const [value, key] of entries) {
    if (alreadyHasKey(src, key)) continue;

    // JSX text nodes
    const jsxFrom = `>${value}<`;
    const jsxTo = `>{t("${key}")}<`;
    if (src.includes(jsxFrom)) {
      src = src.split(jsxFrom).join(jsxTo);
      count++;
      continue;
    }

    // String attributes for UI
    for (const attr of ["title", "description", "placeholder", "aria-label", "label"]) {
      const attrFrom = `${attr}="${value}"`;
      const attrTo = `${attr}={t("${key}")}`;
      if (src.includes(attrFrom)) {
        src = src.split(attrFrom).join(attrTo);
        count++;
      }
    }

    // toast.success/error/message("...")
    for (const method of ["toast.success", "toast.error", "toast.message", "toast.info"]) {
      const toastFrom = `${method}("${value}"`;
      const toastTo = `${method}(t("${key}")`;
      if (src.includes(toastFrom)) {
        src = src.split(toastFrom).join(toastTo);
        count++;
      }
    }

    // toast({ title: "..." })
    const toastTitleFrom = `title: "${value}"`;
    const toastTitleTo = `title: t("${key}")`;
    if (src.includes(toastTitleFrom)) {
      src = src.split(toastTitleFrom).join(toastTitleTo);
      count++;
    }

    // err.message || "..."
    const errFrom = `|| "${value}"`;
    const errTo = `|| t("${key}")`;
    if (src.includes(errFrom)) {
      src = src.split(errFrom).join(errTo);
      count++;
    }

    // throw new Error("...")
    const throwFrom = `throw new Error("${value}")`;
    const throwTo = `throw new Error(t("${key}"))`;
    if (src.includes(throwFrom)) {
      src = src.split(throwFrom).join(throwTo);
      count++;
    }

    // Ternary string literals in JSX: ? "..." :
    const ternaryFrom = `? "${value}" :`;
    const ternaryTo = `? t("${key}") :`;
    if (src.includes(ternaryFrom)) {
      src = src.split(ternaryFrom).join(ternaryTo);
      count++;
    }

    // : "..." } in ternary ending
    const ternaryEndFrom = `: "${value}"}`;
    const ternaryEndTo = `: t("${key}")}`;
    if (src.includes(ternaryEndFrom)) {
      src = src.split(ternaryEndFrom).join(ternaryEndTo);
      count++;
    }
  }

  // Fix back link
  if (src.includes("Back to dashboard") && !src.includes('t("admin.shared.backToDashboard")')) {
    src = src.split("Back to dashboard").join('{t("admin.shared.backToDashboard")}');
    count++;
  }

  if (count > 0) {
    fs.writeFileSync(file, src);
    console.log(`${rel}: ${count}`);
  }
}
