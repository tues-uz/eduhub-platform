import eduHubHeaderLogoSvgUrl from "@/assets/enrollment/eduhub-logo.svg?url";
import eduHubReceiptStampUrl from "@/assets/enrollment/eduhub-receipt-stamp.png";

/** viewBox 462×342 from eduhub-logo.svg (header). */
export const EDUHUB_RECEIPT_HEADER_LOGO_ASPECT = 342 / 462;

/** Blue stamp above signatory (381×283 px). */
export const EDUHUB_RECEIPT_STAMP_ASPECT = 283 / 381;

let headerLogoCache: string | null = null;
let headerLogoPromise: Promise<string | null> | null = null;

let stampLogoCache: string | null = null;
let stampLogoPromise: Promise<string | null> | null = null;

function imageUrlToPngDataUrl(url: string, widthPx: number): Promise<string | null> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise<string | null>((resolve) => {
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const scale = widthPx / (img.naturalWidth || widthPx);
            const heightPx = Math.round((img.naturalHeight || widthPx) * scale);
            const canvas = document.createElement("canvas");
            canvas.width = widthPx;
            canvas.height = heightPx;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(objectUrl);
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
          };
          img.src = objectUrl;
        }),
    )
    .catch(() => null);
}

/** Rasterize header SVG to PNG for jsPDF. */
function rasterizeSvgToPngDataUrl(svgUrl: string, widthPx = 462): Promise<string | null> {
  return fetch(svgUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
      return res.text();
    })
    .then(
      (svgText) =>
        new Promise<string | null>((resolve) => {
          const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const scale = widthPx / (img.naturalWidth || 462);
            const heightPx = Math.round((img.naturalHeight || 342) * scale);
            const canvas = document.createElement("canvas");
            canvas.width = widthPx;
            canvas.height = heightPx;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(objectUrl);
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
          };
          img.src = objectUrl;
        }),
    )
    .catch(() => null);
}

/** Color EDU HUB logo for receipt header (top-right). */
export function loadEduHubReceiptHeaderLogoDataUrl(): Promise<string | null> {
  if (headerLogoCache) return Promise.resolve(headerLogoCache);
  if (!headerLogoPromise) {
    headerLogoPromise = rasterizeSvgToPngDataUrl(eduHubHeaderLogoSvgUrl).then((dataUrl) => {
      headerLogoCache = dataUrl;
      return dataUrl;
    });
  }
  return headerLogoPromise;
}

/** Blue stamp image above signatory name / title (footer). */
export function loadEduHubReceiptStampDataUrl(): Promise<string | null> {
  if (stampLogoCache) return Promise.resolve(stampLogoCache);
  if (!stampLogoPromise) {
    stampLogoPromise = imageUrlToPngDataUrl(eduHubReceiptStampUrl, 381).then((dataUrl) => {
      stampLogoCache = dataUrl;
      return dataUrl;
    });
  }
  return stampLogoPromise;
}

export type EduHubReceiptPdfLogos = {
  header: string | null;
  stamp: string | null;
};

export async function loadEduHubReceiptPdfLogos(): Promise<EduHubReceiptPdfLogos> {
  const [header, stamp] = await Promise.all([
    loadEduHubReceiptHeaderLogoDataUrl(),
    loadEduHubReceiptStampDataUrl(),
  ]);
  return { header, stamp };
}

/** @deprecated Use loadEduHubReceiptHeaderLogoDataUrl */
export const EDUHUB_RECEIPT_LOGO_ASPECT = EDUHUB_RECEIPT_HEADER_LOGO_ASPECT;

/** @deprecated Use loadEduHubReceiptPdfLogos */
export function loadEduHubReceiptLogoDataUrl(): Promise<string | null> {
  return loadEduHubReceiptHeaderLogoDataUrl();
}
