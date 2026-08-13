import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { eduhubCourses, eduhubUploadFile } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import {
  CLASS_PHOTOS_CHANGED_EVENT,
  MAX_CLASS_PHOTOS,
  classPhotoStore,
  resolveClassPhotoUrls,
} from "@/features/courses/classPhotoStore";
import { Image, Loader2, Upload, X } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  courseId: string;
  apiPhotoUrls?: string[] | null;
};

const MAX_BYTES = 8 * 1024 * 1024;

async function persistToApi(courseId: string, urls: string[]) {
  if (!isUuid(courseId)) return;
  const course = await eduhubCourses.getById(courseId);
  await eduhubCourses.update(courseId, {
    title: course.title,
    description: course.description || "—",
    category: course.category,
    level: course.level,
    status: course.status,
    classMeetingsInSixMonths: course.classMeetingsInSixMonths,
    classMeetingTitles: course.classMeetingTitles,
    classMeetingSlots: course.classMeetingSlots,
    classStartDate: course.classStartDate,
    classEndDate: course.classEndDate,
    ...(course.thumbnailUrl?.trim() ? { thumbnailUrl: course.thumbnailUrl.trim() } : {}),
    classPhotoUrls: urls,
  });
}

export function TeacherClassPhotosPanel({ courseId, apiPhotoUrls }: Props) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<string[]>(() => resolveClassPhotoUrls(courseId, apiPhotoUrls));
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number | null>(null);

  useEffect(() => {
    setUrls(resolveClassPhotoUrls(courseId, apiPhotoUrls));
  }, [courseId, apiPhotoUrls]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ courseId?: string }>).detail;
      if (detail?.courseId && detail.courseId !== courseId) return;
      setUrls(resolveClassPhotoUrls(courseId, apiPhotoUrls));
    };
    window.addEventListener(CLASS_PHOTOS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CLASS_PHOTOS_CHANGED_EVENT, onChanged);
  }, [courseId, apiPhotoUrls]);

  const saveUrls = async (next: string[]) => {
    const saved = classPhotoStore.set(courseId, next);
    setUrls(saved);
    try {
      await persistToApi(courseId, saved);
    } catch {
      // Local store is enough for student/public preview in this browser.
    }
  };

  const openPicker = (slotIndex: number) => {
    if (uploadingIndex !== null) return;
    pendingSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotIndex = pendingSlotRef.current;
    e.target.value = "";
    pendingSlotRef.current = null;
    if (!file || slotIndex == null) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("teacher.roster.photos.toastInvalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("teacher.roster.photos.toastTooLarge"));
      return;
    }

    setUploadingIndex(slotIndex);
    try {
      const { url } = await eduhubUploadFile(file, "images");
      const next = [...urls];
      if (slotIndex < next.length) next[slotIndex] = url;
      else next.push(url);
      await saveUrls(next);
      toast.success(t("teacher.roster.photos.toastUploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("teacher.roster.photos.toastUploadFailed"));
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeAt = async (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    await saveUrls(next);
    toast.message(t("teacher.roster.photos.toastRemoved"));
  };

  const slots = Array.from({ length: MAX_CLASS_PHOTOS }, (_, i) => urls[i] ?? null);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {t("teacher.roster.photos.title")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("teacher.roster.photos.intro")}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void onFileChange(e)}
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("teacher.roster.photos.galleryAria")}>
        {slots.map((url, index) => {
          const busy = url
            ? uploadingIndex === index
            : uploadingIndex === urls.length && index === urls.length;
          return (
            <li key={`class-photo-slot-${index}`} className="min-w-0">
              {url ? (
                <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={url}
                    alt={t("teacher.roster.photos.photoAlt", { n: index + 1 })}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/55 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={busy || uploadingIndex !== null}
                      onClick={() => openPicker(index)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-medium text-foreground"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {t("teacher.roster.photos.replace")}
                    </button>
                    <button
                      type="button"
                      disabled={busy || uploadingIndex !== null}
                      onClick={() => void removeAt(index)}
                      className="inline-flex items-center justify-center rounded-md bg-white/95 px-2 py-1.5 text-muted-foreground"
                      aria-label={t("teacher.roster.photos.removeAria", { n: index + 1 })}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingIndex !== null}
                  onClick={() => openPicker(urls.length)}
                  className={cn(
                    "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 text-center transition-colors",
                    "hover:border-teal-600/40 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30",
                    (busy || uploadingIndex !== null) && "pointer-events-none opacity-60",
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full border border-border bg-background">
                      <Image className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <span className="text-xs font-medium text-foreground">
                    {busy ? t("teacher.roster.photos.uploading") : t("teacher.roster.photos.addSlot", { n: urls.length + 1 })}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {t("teacher.roster.photos.countHint", { count: urls.length, max: MAX_CLASS_PHOTOS })}
      </p>
    </div>
  );
}
