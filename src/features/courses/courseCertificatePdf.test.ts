import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateCourseCertificatePdfBytes } from "@/features/courses/courseCertificatePdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../../../public");

function readPublic(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(publicDir, rel)));
}

describe("generateCourseCertificatePdfBytes", () => {
  it("fills the template with Outfit + Savoye Let and returns a valid two-page PDF", async () => {
    const templateBytes = readPublic("certificate-template.pdf");
    const fontFiles: Record<string, Uint8Array> = {
      "/certificate-template.pdf": templateBytes,
      "/fonts/SavoyeLet-Regular.ttf": readPublic("fonts/SavoyeLet-Regular.ttf"),
      "/fonts/outfit/Outfit-Regular.ttf": readPublic("fonts/outfit/Outfit-Regular.ttf"),
      "/fonts/outfit/Outfit-SemiBold.ttf": readPublic("fonts/outfit/Outfit-SemiBold.ttf"),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const key = path.includes("/fonts/") ? path.slice(path.indexOf("/fonts/")) : path;
      const templateKey = path.endsWith("certificate-template.pdf") ? "/certificate-template.pdf" : key;
      const bytes = fontFiles[templateKey] ?? fontFiles[key];
      if (!bytes) {
        return new Response(null, { status: 404 });
      }
      return new Response(bytes, { status: 200 });
    };

    try {
      const bytes = await generateCourseCertificatePdfBytes({
        studentName: "Denna Rahmatillah",
        courseTitle: "General English Course - Beginner Level (A1)",
        examScorePercent: 100,
        instructorName: "Indiana Ayu",
        issuedAtIso: "2026-02-19T12:00:00.000Z",
      });

      expect(bytes.byteLength).toBeGreaterThan(templateBytes.length * 0.9);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
