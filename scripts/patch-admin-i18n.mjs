/**
 * Patches admin TSX files to add useTranslation import if missing.
 * Run: node scripts/patch-admin-i18n.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "src/pages/AdminDashboard.tsx",
  ...fs
    .readdirSync(path.join(root, "src/features/admin/pages"))
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .map((f) => `src/features/admin/pages/${f}`),
  ...fs
    .readdirSync(path.join(root, "src/features/admin/components"))
    .filter((f) => f.endsWith(".tsx") && f !== "AdminPageHeader.tsx" && f !== "AdminLayout.tsx")
    .map((f) => `src/features/admin/components/${f}`),
];

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (src.includes("useTranslation")) {
    console.log("skip (already has useTranslation):", rel);
    continue;
  }

  // Add import after first import block
  if (!src.includes('from "react-i18next"')) {
    const lines = src.split("\n");
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ")) insertAt = i + 1;
      else if (insertAt > 0 && !lines[i].startsWith("import ") && lines[i].trim() !== "") break;
    }
    lines.splice(insertAt, 0, 'import { useTranslation } from "react-i18next";');
    src = lines.join("\n");
  }

  // Add const { t } = useTranslation(); after function/component opening
  const patterns = [
    /export default function \w+\([^)]*\) \{\n/,
    /export function \w+\([^)]*\) \{\n/,
    /const \w+ = \(\) => \{\n/,
  ];
  let patched = false;
  for (const pat of patterns) {
    if (pat.test(src) && !src.includes("const { t } = useTranslation()")) {
      src = src.replace(pat, (m) => `${m}  const { t } = useTranslation();\n`);
      patched = true;
      break;
    }
  }

  if (patched || src.includes('from "react-i18next"')) {
    fs.writeFileSync(file, src);
    console.log("patched import/hook:", rel);
  } else {
    console.log("WARN could not patch hook:", rel);
  }
}
