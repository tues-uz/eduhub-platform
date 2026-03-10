import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, FileText, Video, Loader2, Upload, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore, createEmptyLesson } from "../data/teacherCoursesStore";
import { eduhubCourses, eduhubModules, eduhubLessons, eduhubUploadFile } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { TeacherCourse, TeacherLesson, LessonContentType } from "../types";
import { toast } from "sonner";

// Worker for PDF.js (used for reading-time estimation). Vite resolves ?url in app code.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function parseDurationMinutes(duration?: string): number | undefined {
  if (!duration?.trim()) return undefined;
  const m = duration.trim().match(/^(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Format seconds as "X min" or "X min Y sec" */
function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min} min ${sec} sec` : `${min} min`;
}

/** Extract YouTube video ID from URL. */
function getYouTubeVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Get embed URL and type for video preview (YouTube, Vimeo, or direct). */
function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "direct"; src: string } | null {
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
function getPdfPreviewUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  // Google Drive: .../file/d/FILE_ID/view or /open?id=FILE_ID → .../file/d/FILE_ID/preview
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  return trimmed;
}

/** Get URL suitable for fetching PDF bytes (e.g. for page count). Drive → export=download. */
function getPdfDocumentUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  return trimmed;
}

const MIN_PER_PAGE = 1.5;

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
async function fetchPdfReadingTimeEstimate(url: string): Promise<string | null> {
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
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(container);

    const player = new YT.Player(container, {
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
              try {
                target.destroy?.();
              } catch {
                // ignore
              }
              container.remove();
              resolve(sec > 0 ? Math.round(sec) : null);
            }
            attempts++;
          }, 100);
        },
      },
    });

    // Fallback: if onReady never fires (e.g. invalid ID), cleanup after 6s
    setTimeout(() => {
      if (container.parentNode) {
        try {
          (player as YTPlayer).destroy?.();
        } catch {
          // ignore
        }
        container.remove();
        resolve(null);
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
async function fetchVideoDurationFromUrl(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube: use IFrame API (no API key, works in browser)
  const ytId = getYouTubeVideoId(trimmed);
  if (ytId) {
    const sec = await getYouTubeDurationSeconds(ytId);
    if (sec != null && sec > 0) return formatDurationSeconds(sec);
    return null;
  }

  // Vimeo: oEmbed (returns duration in seconds)
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

const TeacherCourseFormPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const isEdit = !!courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [durationLoadingIndex, setDurationLoadingIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [collapsedLessonIds, setCollapsedLessonIds] = useState<Set<string>>(() => new Set());
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [lessonToRemoveIndex, setLessonToRemoveIndex] = useState<number | null>(null);

  // Auto-fill duration from video URL when teacher pastes or enters a link (debounced 1s)
  const videoUrlKey = lessons.map((l) => `${l.contentType}:${l.contentUrl ?? ""}`).join("|");
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    lessons.forEach((lesson, index) => {
      if (lesson.contentType !== "video" || !lesson.contentUrl?.trim()) return;
      const url = lesson.contentUrl.trim();
      const t = setTimeout(() => {
        setDurationLoadingIndex((prev) => (prev === null ? index : prev));
        fetchVideoDurationFromUrl(url).then((formatted) => {
          if (formatted) {
            setLessons((prev) =>
              prev.map((l, i) => (i === index ? { ...l, duration: formatted, order: i } : { ...l, order: i }))
            );
          }
        }).finally(() => setDurationLoadingIndex((prev) => (prev === index ? null : prev)));
      }, 1000);
      timeouts.push(t);
    });
    return () => timeouts.forEach((id) => clearTimeout(id));
  }, [videoUrlKey]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isEdit && courseId) {
      if (isUuid(courseId)) {
        eduhubCourses.getById(courseId).then((course) => {
          setTitle(course.title);
          setDescription(course.description ?? "");
          return eduhubModules.getByCourse(courseId);
        }).then((modules) => {
          if (modules.length === 0) {
            setLessons([createEmptyLesson(0)]);
            return;
          }
          return eduhubLessons.getByModule(courseId, modules[0].id).then((apiLessons) => {
            const mapped: TeacherLesson[] = apiLessons.map((l, i) => ({
              id: l.id,
              title: l.title,
              contentType: l.type === "DOCUMENT" ? "pdf" : "video",
              contentUrl: l.contentUrl ?? "",
              duration: l.durationMinutes
                ? l.type === "DOCUMENT"
                  ? `${l.durationMinutes} min read`
                  : `${l.durationMinutes} min`
                : undefined,
              order: l.orderIndex ?? i,
            }));
            setLessons(mapped.length ? mapped : [createEmptyLesson(0)]);
          });
        }).catch(() => setError("Course not found."));
      } else {
        const course = teacherCoursesStore.getById(courseId);
        if (course) {
          setTitle(course.title);
          setDescription(course.description ?? "");
          setPrice(course.price != null && course.price > 0 ? String(course.price) : "");
          setLessons(
            course.lessons.length > 0
              ? [...course.lessons].sort((a, b) => a.order - b.order)
              : [createEmptyLesson(0)]
          );
        } else {
          setError("Course not found.");
        }
      }
    } else {
      setLessons([createEmptyLesson(0)]);
    }
  }, [courseId, isEdit]);

  const addLesson = () => {
    setLessons((prev) => [...prev, createEmptyLesson(prev.length)]);
  };

  const isLessonComplete = (lesson: TeacherLesson): boolean => {
    const hasTitle = !!lesson.title?.trim();
    const hasContent = !!lesson.contentUrl?.trim();
    return hasTitle && hasContent;
  };

  const handleAddLessonClick = () => {
    const incomplete = lessons.find((l) => !isLessonComplete(l));
    if (incomplete) {
      setShowAddLessonModal(true);
      return;
    }
    addLesson();
  };

  const removeLesson = (index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, updates: Partial<TeacherLesson>) => {
    setLessons((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates, order: i } : { ...l, order: i }))
    );
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const folder = lessons[index].contentType === "video_upload" ? "videos" : "materials";
      const { url } = await eduhubUploadFile(file, folder);
      updateLesson(index, { contentUrl: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleGetDurationFromUrl = async (index: number) => {
    const lesson = lessons[index];
    if (lesson.contentType !== "video" || !lesson.contentUrl?.trim()) return;
    setDurationLoadingIndex(index);
    try {
      const formatted = await fetchVideoDurationFromUrl(lesson.contentUrl);
      if (formatted) updateLesson(index, { duration: formatted });
    } finally {
      setDurationLoadingIndex(null);
    }
  };

  const handleGetPdfReadingTime = async (index: number) => {
    const lesson = lessons[index];
    const isPdf =
      lesson.contentType === "pdf" || lesson.contentType === "pdf_upload";
    if (!isPdf || !lesson.contentUrl?.trim()) return;
    setDurationLoadingIndex(index);
    try {
      const formatted = await fetchPdfReadingTimeEstimate(lesson.contentUrl);
      if (formatted) {
        updateLesson(index, { duration: formatted });
      } else {
        toast.error(
          "Could not estimate reading time (link may be private or unsupported). Enter it manually (e.g. 5 min read)."
        );
      }
    } finally {
      setDurationLoadingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Course title is required.");
      return;
    }
    const validLessons = lessons
      .map((l, i) => ({ ...l, title: l.title.trim(), order: i }))
      .filter((l) => l.title || l.contentUrl);
    if (validLessons.length === 0) {
      setError("Add at least one lesson with a title and PDF or video URL.");
      return;
    }

    setSaving(true);
    try {
      const instructorName = user.name?.trim() || "Teacher";

      if (user.id && !isEdit) {
        const course = await eduhubCourses.create({
          title: trimmedTitle,
          description: description.trim() || "—",
          category: "General",
          status: "DRAFT",
        });
        const module = await eduhubModules.create(course.id, { title: "Main", orderIndex: 0 });
        for (let i = 0; i < validLessons.length; i++) {
          const l = validLessons[i];
          await eduhubLessons.create(course.id, module.id, {
            title: l.title,
            type: l.contentType === "pdf" || l.contentType === "pdf_upload" ? "DOCUMENT" : "VIDEO",
            contentUrl: l.contentUrl || undefined,
            orderIndex: i,
            durationMinutes: parseDurationMinutes(l.duration),
          });
        }
        navigate("/dashboard/teacher/courses");
        return;
      }

      if (user.id && isEdit && courseId && isUuid(courseId)) {
        await eduhubCourses.update(courseId, {
          title: trimmedTitle,
          description: description.trim() || "—",
          category: "General",
          status: "DRAFT",
        });
        const modules = await eduhubModules.getByCourse(courseId);
        if (modules.length > 0) {
          const moduleId = modules[0].id;
          const existing = await eduhubLessons.getByModule(courseId, moduleId);
          for (let i = 0; i < validLessons.length; i++) {
            const l = validLessons[i];
            const body = {
              title: l.title,
              type: (l.contentType === "pdf" || l.contentType === "pdf_upload" ? "DOCUMENT" : "VIDEO") as "DOCUMENT" | "VIDEO",
              contentUrl: l.contentUrl || undefined,
              orderIndex: i,
              durationMinutes: parseDurationMinutes(l.duration),
            };
            if (isUuid(l.id) && existing.some((e) => e.id === l.id)) {
              await eduhubLessons.update(courseId, moduleId, l.id, body);
            } else {
              await eduhubLessons.create(courseId, moduleId, body);
            }
          }
        }
        navigate("/dashboard/teacher/courses");
        return;
      }

      const priceNum = price.trim() ? parseFloat(price.trim()) : undefined;
      const coursePrice = priceNum != null && !Number.isNaN(priceNum) && priceNum >= 0 ? priceNum : undefined;

      if (isEdit && courseId) {
        teacherCoursesStore.update(courseId, {
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          price: coursePrice,
          lessons: validLessons,
        });
      } else {
        teacherCoursesStore.create({
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          price: coursePrice,
          lessons: validLessons,
        });
      }
      navigate("/dashboard/teacher/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher/courses"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Courses
          </Link>

          <h1
            className="text-2xl font-bold text-foreground mb-6"
            style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
          >
            {isEdit ? "Edit course" : "Add new course"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Introduction to Economics"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the course"
                    rows={3}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={user.name || "Teacher"}
                    readOnly
                    className="rounded-lg bg-muted/50 cursor-not-allowed border-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (optional)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 49.99 (leave empty for free)"
                    className="rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">Students will see this on the Available Courses page. Use 0 or leave empty for free.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Lessons (PDF or video link)</CardTitle>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={handleAddLessonClick}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add lesson
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lessons.map((lesson, index) => {
                  const isExpanded = !collapsedLessonIds.has(lesson.id);
                  return (
                  <div
                    key={lesson.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-foreground/60 hover:text-foreground"
                        onClick={() => {
                          setCollapsedLessonIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(lesson.id)) next.delete(lesson.id);
                            else next.add(lesson.id);
                            return next;
                          });
                        }}
                        title={isExpanded ? "Minimize" : "Expand"}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <GripVertical className="h-4 w-4 text-foreground/40 shrink-0" />
                      <span className="text-sm font-medium text-foreground/70">Lesson {index + 1}</span>
                      {lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLessonToRemoveIndex(index);
                          }}
                          title="Remove lesson"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {isExpanded && (
                    <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Lesson title</Label>
                        <Input
                          value={lesson.title}
                          onChange={(e) => updateLesson(index, { title: e.target.value })}
                          placeholder="e.g. Supply and Demand"
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content type</Label>
                        <Select
                          value={lesson.contentType}
                          onValueChange={(v: LessonContentType) => {
                            updateLesson(index, {
                              contentType: v,
                              contentUrl: "",
                              duration: undefined,
                            });
                          }}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video" className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Video link
                            </SelectItem>
                            <SelectItem value="video_upload" className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Video upload
                            </SelectItem>
                            <SelectItem value="pdf" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              PDF link
                            </SelectItem>
                            <SelectItem value="pdf_upload" className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              PDF upload
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>
                          {lesson.contentType === "video" && "Video URL"}
                          {lesson.contentType === "video_upload" && "Video upload"}
                          {lesson.contentType === "pdf" && "PDF URL"}
                          {lesson.contentType === "pdf_upload" && "PDF upload"}
                        </Label>
                        {(lesson.contentType === "video_upload" || lesson.contentType === "pdf_upload") ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                type="file"
                                accept={lesson.contentType === "video_upload" ? "video/*" : "application/pdf"}
                                className="rounded-lg max-w-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground file:font-medium"
                                disabled={uploadingIndex === index}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(index, file);
                                  e.target.value = "";
                                }}
                              />
                              {uploadingIndex === index && (
                                <span className="text-sm text-foreground/60 inline-flex items-center gap-1">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Uploading…
                                </span>
                              )}
                            </div>
                            {uploadError && uploadingIndex === null && (
                              <p className="text-sm text-red-600">{uploadError}</p>
                            )}
                            {lesson.contentUrl && (
                              <p className="text-xs text-foreground/60 truncate">
                                Uploaded: <a href={lesson.contentUrl} target="_blank" rel="noopener noreferrer" className="underline">{lesson.contentUrl}</a>
                              </p>
                            )}
                          </div>
                        ) : (
                          <Input
                            value={lesson.contentUrl}
                            onChange={(e) => updateLesson(index, { contentUrl: e.target.value })}
                            placeholder={
                              lesson.contentType === "video"
                                ? "https://youtube.com/... or direct video URL"
                                : "https://... or Google Drive PDF link"
                            }
                            type="url"
                            className="rounded-lg"
                          />
                        )}
                        {(lesson.contentType === "video" || lesson.contentType === "video_upload") && lesson.contentUrl?.trim() && (() => {
                          const embed = lesson.contentType === "video_upload"
                            ? getVideoEmbed(lesson.contentUrl!) ?? (lesson.contentUrl ? { type: "direct" as const, src: lesson.contentUrl } : null)
                            : getVideoEmbed(lesson.contentUrl!);
                          if (!embed) return null;
                          return (
                            <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-black/5">
                              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white/80">
                                <p className="text-xs font-medium text-foreground/60">Preview</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-foreground/60 hover:text-red-600 hover:bg-red-50"
                                  title="Remove video link"
                                  onClick={() => updateLesson(index, { contentUrl: "", duration: undefined })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="aspect-video w-full">
                                {embed.type === "direct" ? (
                                  <video
                                    src={embed.src}
                                    controls
                                    className="w-full h-full object-contain"
                                    title="Video preview"
                                  />
                                ) : (
                                  <iframe
                                    src={embed.src}
                                    title="Video preview"
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {(lesson.contentType === "pdf" || lesson.contentType === "pdf_upload") && lesson.contentUrl?.trim() && (
                          <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-black/5">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white/80">
                              <p className="text-xs font-medium text-foreground/60">PDF Preview</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-foreground/60 hover:text-red-600 hover:bg-red-50"
                                title="Remove PDF link"
                                onClick={() => updateLesson(index, { contentUrl: "", duration: undefined })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="w-full min-h-[360px] bg-white">
                              <iframe
                                src={getPdfPreviewUrl(lesson.contentUrl)}
                                title="PDF preview"
                                className="w-full h-[360px] border-0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (optional)</Label>
                      <p className="text-xs text-foreground/50">
                        {(lesson.contentType === "pdf" || lesson.contentType === "pdf_upload")
                          ? "Estimated time for this material (e.g. 5 min read)."
                          : "Video length or estimated time."}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={lesson.duration ?? ""}
                          onChange={(e) => updateLesson(index, { duration: e.target.value })}
                          placeholder={
                            lesson.contentType === "pdf" || lesson.contentType === "pdf_upload"
                              ? "e.g. 5 min read"
                              : "e.g. 12 min"
                          }
                          className="rounded-lg max-w-[140px]"
                        />
                        {(lesson.contentType === "video" || lesson.contentType === "video_upload") && lesson.contentUrl?.trim() && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg shrink-0"
                            disabled={durationLoadingIndex === index}
                            onClick={() => handleGetDurationFromUrl(index)}
                            title="Get duration from video link (YouTube/Vimeo)"
                          >
                            {durationLoadingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Get from link"
                            )}
                          </Button>
                        )}
                        {(lesson.contentType === "pdf" || lesson.contentType === "pdf_upload") && lesson.contentUrl?.trim() && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg shrink-0"
                            disabled={durationLoadingIndex === index}
                            onClick={() => handleGetPdfReadingTime(index)}
                            title="Estimate reading time from PDF (page count)"
                          >
                            {durationLoadingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Estimate"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full"
                style={{ backgroundColor: "#1e40af" }}
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create course"}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" asChild>
                <Link to="/dashboard/teacher/courses">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </main>

      <AlertDialog open={showAddLessonModal} onOpenChange={setShowAddLessonModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete the current lesson first</AlertDialogTitle>
            <AlertDialogDescription>
              Please add a title and video or PDF content to the current lesson before adding another. This keeps your lessons organized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAddLessonModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={lessonToRemoveIndex !== null} onOpenChange={(open) => !open && setLessonToRemoveIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the lesson from the course. You can add it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (lessonToRemoveIndex !== null) {
                  removeLesson(lessonToRemoveIndex);
                  setLessonToRemoveIndex(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherCourseFormPage;
