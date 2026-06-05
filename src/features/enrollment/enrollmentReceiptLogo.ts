import eduHubHeaderLogoSvgUrl from "@/assets/enrollment/eduhub-logo.svg?url";
import eduHubReceiptStampUrl from "@/assets/enrollment/eduhub-receipt-stamp.png";

/** viewBox 462×342 from eduhub-logo.svg (header). */
export const EDUHUB_RECEIPT_HEADER_LOGO_ASPECT = 342 / 462;

/** Fallback aspect when stamp metadata is unavailable (height / width). */
export const EDUHUB_RECEIPT_STAMP_ASPECT = 1;

export type EduHubReceiptStampAsset = {
  dataUrl: string;
  aspect: number;
};

let headerLogoCache: string | null = null;
let headerLogoPromise: Promise<string | null> | null = null;

let stampLogoCache: EduHubReceiptStampAsset | null = null;
let stampLogoPromise: Promise<EduHubReceiptStampAsset | null> | null = null;

function isStampContentPixel(data: Uint8ClampedArray, offset: number): boolean {
  const alpha = data[offset + 3];
  if (alpha < 16) return false;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return !(r > 246 && g > 246 && b > 246);
}

function trimContentBounds(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (!isStampContentPixel(data, offset)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = 1;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const w = Math.min(width - x, maxX - minX + 1 + pad * 2);
  const h = Math.min(height - y, maxY - minY + 1 + pad * 2);
  return { x, y, width: w, height: h };
}

function cropCanvasToContent(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d");
  if (!ctx) return source;

  const bounds = trimContentBounds(ctx.getImageData(0, 0, source.width, source.height));
  if (!bounds) return source;

  const cropped = document.createElement("canvas");
  cropped.width = bounds.width;
  cropped.height = bounds.height;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) return source;

  croppedCtx.fillStyle = "#ffffff";
  croppedCtx.fillRect(0, 0, bounds.width, bounds.height);
  croppedCtx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );
  return cropped;
}

function keyNearBlackBackgroundFromEdges(imageData: ImageData, threshold = 40): void {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const isBackground = (offset: number) => {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    return r <= threshold && g <= threshold && b <= threshold;
  };

  const pushIfBackground = (x: number, y: number) => {
    const pixel = y * width + x;
    if (visited[pixel]) return;
    const offset = pixel * 4;
    if (!isBackground(offset)) return;
    visited[pixel] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < width; x++) {
    pushIfBackground(x, 0);
    pushIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBackground(0, y);
    pushIfBackground(width - 1, y);
  }

  while (queue.length > 0) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    const offset = (y * width + x) * 4;
    // jsPDF renders PNG transparency as black — flatten to white instead.
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;

    if (x > 0) pushIfBackground(x - 1, y);
    if (x < width - 1) pushIfBackground(x + 1, y);
    if (y > 0) pushIfBackground(x, y - 1);
    if (y < height - 1) pushIfBackground(x, y + 1);
  }
}

function imageUrlToStampAsset(url: string, widthPx: number): Promise<EduHubReceiptStampAsset | null> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise<EduHubReceiptStampAsset | null>((resolve) => {
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
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, widthPx, heightPx);
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            URL.revokeObjectURL(objectUrl);

            const trimmed = cropCanvasToContent(canvas);
            resolve({
              dataUrl: trimmed.toDataURL("image/png"),
              aspect: trimmed.height / trimmed.width,
            });
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

function imageUrlToPngDataUrl(
  url: string,
  widthPx: number,
  options?: { flattenOnWhite?: boolean; flattenBlackBackground?: boolean },
): Promise<string | null> {
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
            if (options?.flattenOnWhite) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, widthPx, heightPx);
            }
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            if (options?.flattenBlackBackground) {
              const imageData = ctx.getImageData(0, 0, widthPx, heightPx);
              keyNearBlackBackgroundFromEdges(imageData);
              ctx.putImageData(imageData, 0, 0);
            }
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

/** Combined stamp + signature image for invoice/receipt footer. */
export function loadEduHubReceiptStampDataUrl(): Promise<EduHubReceiptStampAsset | null> {
  if (stampLogoCache) return Promise.resolve(stampLogoCache);
  if (!stampLogoPromise) {
    stampLogoPromise = imageUrlToStampAsset(eduHubReceiptStampUrl, 512).then((asset) => {
      stampLogoCache = asset;
      return asset;
    });
  }
  return stampLogoPromise;
}

export type EduHubReceiptPdfLogos = {
  header: string | null;
  stamp: EduHubReceiptStampAsset | null;
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
