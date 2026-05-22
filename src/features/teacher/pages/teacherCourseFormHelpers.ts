// Worker for PDF.js (used for reading-time estimation). Vite resolves ?url in app code.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ScheduleProposalResponse } from "@/api/eduhubTypes";
import type { ClassMeetingSlot } from "../types";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";

export function parseDurationMinutes(duration?: string): number | undefined {
  if (!duration?.trim()) return undefined;
  const m = duration.trim().match(/^(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Format seconds as "X min" or "X min Y sec" */
export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min} min ${sec} sec` : `${min} min`;
}

/** Extract YouTube video ID from URL. */
export function getYouTubeVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Get embed URL and type for video preview (YouTube, Vimeo, or direct). */
export function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "direct"; src: string } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const ytId = getYouTubeVideoId(trimmed);
  if (ytId) return { type: "youtube", src: `https://www.youtube.com/embed/${ytId}` };
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  if (/^https?:\/\//i.test(trimmed)) return { type: "direct", src: trimmed };
  return null;
}

/** Get PDF preview URL. Converts Google Drive links to embeddable /preview form. */
export function getPdfPreviewUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  return trimmed;
}

/** Get URL suitable for fetching PDF bytes (e.g. for page count). Drive → export=download. */
export function getPdfDocumentUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  return trimmed;
}

const MIN_PER_PAGE = 1.5;

export function parseOptionalPositiveInt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

/** Pad / trim session rows to length `n` (course form + admin/teacher schedule views). */
export function padMeetingSlotsForCourse(n: number, raw?: ClassMeetingSlot[]): ClassMeetingSlot[] {
  const base = Array.isArray(raw)
    ? raw.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }))
    : [];
  const out = base.slice(0, Math.max(0, n));
  while (out.length < n) {
    out.push({ title: "", sessionDate: "", sessionTime: "" });
  }
  return out;
}

/**
 * API often omits `classMeetingsInSixMonths` while still returning `classMeetingSlots` / `classMeetingTitles`.
 * Derive count + rows so instructors see the admin-proposed schedule.
 */
export function deriveClassScheduleFormState(course: {
  classMeetingsInSixMonths?: number | null;
  classMeetingSlots?: ClassMeetingSlot[];
  classMeetingTitles?: string[];
}): { meetingsSixMonthsStr: string; slots: ClassMeetingSlot[] } {
  const slotsIn = course.classMeetingSlots;
  const titlesRaw = course.classMeetingTitles;
  let n = typeof course.classMeetingsInSixMonths === "number" ? course.classMeetingsInSixMonths : 0;
  if (slotsIn?.length) n = Math.max(n, slotsIn.length);
  if (titlesRaw?.length) n = Math.max(n, titlesRaw.length);

  if (slotsIn?.length) {
    const slots = padMeetingSlotsForCourse(n, slotsIn);
    return { meetingsSixMonthsStr: n > 0 ? String(n) : "", slots };
  }
  if (titlesRaw?.length) {
    const fromTitles = titlesRaw.map((t) => ({
      title: t ?? "",
      sessionDate: "",
      sessionTime: "",
    }));
    const slots = padMeetingSlotsForCourse(n, fromTitles);
    return { meetingsSixMonthsStr: n > 0 ? String(n) : "", slots };
  }
  return {
    meetingsSixMonthsStr: n > 0 ? String(n) : "",
    slots: padMeetingSlotsForCourse(n, []),
  };
}

/**
 * Merge API course with last admin proposal saved in this browser when GET omits slot details.
 */
export function resolveClassScheduleFormState(
  course: {
    classMeetingsInSixMonths?: number | null;
    classMeetingSlots?: ClassMeetingSlot[];
    classMeetingTitles?: string[];
  },
  courseId?: string,
): { meetingsSixMonthsStr: string; slots: ClassMeetingSlot[] } {
  const fromApi = deriveClassScheduleFormState(course);
  if (!courseId) return fromApi;

  const proposal = courseScheduleProposalStore.get(courseId);
  if (!proposal) return fromApi;

  const fromProposal = deriveClassScheduleFormState({
    classMeetingsInSixMonths: proposal.classMeetingsInSixMonths,
    classMeetingSlots: proposal.classMeetingSlots,
  });

  const apiHasFilledSlot = fromApi.slots.some(
    (s) =>
      (s.title?.trim() ?? "") !== "" ||
      (s.sessionDate?.trim() ?? "") !== "" ||
      (s.sessionTime?.trim() ?? "") !== "",
  );
  if (apiHasFilledSlot) return fromApi;

  const proposalHasUseful =
    fromProposal.slots.some(
      (s) =>
        (s.title?.trim() ?? "") !== "" ||
        (s.sessionDate?.trim() ?? "") !== "" ||
        (s.sessionTime?.trim() ?? "") !== "",
    ) || parseOptionalPositiveInt(fromProposal.meetingsSixMonthsStr) != null;

  if (proposalHasUseful) return fromProposal;

  return fromApi;
}

type CourseScheduleSource = {
  classMeetingsInSixMonths?: number | null;
  classMeetingSlots?: ClassMeetingSlot[];
  classMeetingTitles?: string[];
};

/**
 * Planned sessions for pickers (resume, attendance, substitutes) — prefers live schedule proposal from API,
 * then approved course fields / admin proposal cached in this browser.
 */
export function formatClassMeetingSlotLabel(slot: ClassMeetingSlot, index: number): string {
  const title = slot.title?.trim() || `Session ${index + 1}`;
  const date = slot.sessionDate?.trim();
  const time = slot.sessionTime?.trim();
  const tail = [date, time].filter(Boolean).join(" ");
  return tail ? `${title} · ${tail}` : title;
}

const SUBSTITUTE_INVITE_SESSION_VALUE = "__substitute_invite_session__";

export type ScheduleSessionSelectOption = { value: string; label: string };

/** Resolve the session a substitute was approved to cover from invite + current schedule rows. */
export function resolveSubstituteAssignedSessionFromInvite(
  invite: { sessionSlotKey?: string; sessionNote?: string } | null | undefined,
  scheduleSlots: ClassMeetingSlot[],
): ScheduleSessionSelectOption | null {
  if (!invite) return null;

  const slotKey = invite.sessionSlotKey?.trim();
  if (slotKey?.startsWith("slot-")) {
    const idx = Number.parseInt(slotKey.slice("slot-".length), 10);
    if (!Number.isNaN(idx) && scheduleSlots[idx]) {
      return { value: slotKey, label: formatClassMeetingSlotLabel(scheduleSlots[idx], idx) };
    }
  }

  const note = invite.sessionNote?.trim();
  if (!note) return null;

  for (let i = 0; i < scheduleSlots.length; i++) {
    const label = formatClassMeetingSlotLabel(scheduleSlots[i], i);
    if (label.trim() === note) {
      return { value: `slot-${i}`, label };
    }
  }

  return { value: SUBSTITUTE_INVITE_SESSION_VALUE, label: note };
}

export function buildCourseScheduleSlotsForPicker(
  courseId: string,
  course: CourseScheduleSource,
  apiProposal?: ScheduleProposalResponse | null,
): ClassMeetingSlot[] {
  if (apiProposal?.sessions?.length) {
    const rawSlots = apiProposal.sessions.map((s) => ({
      title: s.title ?? "",
      sessionDate: s.sessionDate ?? "",
      sessionTime: s.sessionTime ?? "",
    }));
    const n = Math.max(apiProposal.sessionCount, rawSlots.length);
    return padMeetingSlotsForCourse(n, rawSlots);
  }

  const resolved = resolveClassScheduleFormState(course, courseId);
  const fromStr = parseOptionalPositiveInt(resolved.meetingsSixMonthsStr);
  const fromCourse = typeof course.classMeetingsInSixMonths === "number" ? course.classMeetingsInSixMonths : 0;
  const n = Math.max(fromStr ?? 0, fromCourse, resolved.slots.length);
  return padMeetingSlotsForCourse(n, resolved.slots);
}

/** Fetch PDF bytes from URL; try direct fetch then CORS proxy. */
async function fetchPdfAsArrayBuffer(docUrl: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(docUrl, { mode: "cors" });
    if (res.ok && res.headers.get("content-type")?.toLowerCase().includes("pdf")) {
      return await res.arrayBuffer();
    }
  } catch {
    // CORS or network error
  }
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(docUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return await res.arrayBuffer();
  } catch {
    // ignore
  }
  return null;
}

/** Estimate reading time from PDF URL (page count × ~1.5 min). Returns e.g. "5 min read" or null. */
export async function fetchPdfReadingTimeEstimate(url: string): Promise<string | null> {
  const docUrl = getPdfDocumentUrl(url);
  if (!docUrl) return null;
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const data = await fetchPdfAsArrayBuffer(docUrl);
    const src = data ? { data } : { url: docUrl };
    const loading = pdfjs.getDocument(src);
    const pdf = await loading.promise;
    const numPages = pdf.numPages;
    await pdf.destroy();
    if (numPages < 1) return null;
    const minutes = Math.max(1, Math.round(numPages * MIN_PER_PAGE));
    return `${minutes} min read`;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width?: number;
          height?: number;
          events?: { onReady?: (e: { target: YTPlayer }) => void };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  getDuration: () => number;
  destroy: () => void;
}

/** Load YouTube IFrame API and return when ready. */
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      if (window.YT?.Player) resolve();
      else reject(new Error("YT not ready"));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YT API"));
    document.head.appendChild(script);
  });
}

/** Get YouTube video duration in seconds using IFrame API (works in browser, no API key). */
async function getYouTubeDurationSeconds(videoId: string): Promise<number | null> {
  try {
    await loadYouTubeAPI();
  } catch {
    return null;
  }
  const YT = window.YT;
  if (!YT?.Player) return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(container);

    const hardOut = window.setTimeout(() => {
      try {
        container.remove();
      } catch {
        // ignore
      }
      finish(null);
    }, 10_000);

    let player: YTPlayer | undefined;
    try {
      player = new YT.Player(container, {
        videoId,
        width: 1,
        height: 1,
        events: {
          onReady(ev: { target: YTPlayer }) {
            const target = ev.target;
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds
            const interval = setInterval(() => {
              const sec = target.getDuration?.() ?? 0;
              if (sec > 0 || attempts >= maxAttempts) {
                clearInterval(interval);
                window.clearTimeout(hardOut);
                try {
                  target.destroy?.();
                } catch {
                  // ignore
                }
                try {
                  container.remove();
                } catch {
                  // ignore
                }
                finish(sec > 0 ? Math.round(sec) : null);
              }
              attempts++;
            }, 100);
          },
        },
      }) as unknown as YTPlayer;
    } catch {
      window.clearTimeout(hardOut);
      try {
        container.remove();
      } catch {
        // ignore
      }
      finish(null);
      return;
    }

    window.setTimeout(() => {
      if (!settled && container.parentNode) {
        window.clearTimeout(hardOut);
        try {
          player?.destroy?.();
        } catch {
          // ignore
        }
        try {
          container.remove();
        } catch {
          // ignore
        }
        finish(null);
      }
    }, 6000);
  });
}

/** Fetch JSON from URL; if CORS fails, try via CORS proxy. */
async function fetchJsonWithCorsFallback(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as Record<string, unknown>;
  } catch {
    // CORS or network error – try proxy
  }
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const text = await res.text();
      return JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Fetch video duration from URL. YouTube = IFrame API; Vimeo = oEmbed (with CORS fallback). */
export async function fetchVideoDurationFromUrl(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const ytId = getYouTubeVideoId(trimmed);
  if (ytId) {
    const sec = await getYouTubeDurationSeconds(ytId);
    if (sec != null && sec > 0) return formatDurationSeconds(sec);
    return null;
  }

  if (/vimeo\.com\//i.test(trimmed)) {
    const vimeoUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(trimmed)}`;
    const data = await fetchJsonWithCorsFallback(vimeoUrl);
    if (data && typeof (data as { duration?: number }).duration === "number") {
      const sec = (data as { duration: number }).duration;
      if (sec > 0) return formatDurationSeconds(sec);
    }
  }

  return null;
}
