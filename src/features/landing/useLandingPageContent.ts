import { useCallback, useEffect, useState } from "react";
import {
  fetchLandingPageContent,
  LANDING_PAGE_CONTENT_CHANGED_EVENT,
  readLandingPageContent,
  type LandingPageContent,
} from "@/features/landing/landingPageContent";

export function useLandingPageContent(): LandingPageContent | null {
  const [content, setContent] = useState<LandingPageContent | null>(() => readLandingPageContent());

  const refresh = useCallback(() => {
    setContent(readLandingPageContent());
  }, []);

  useEffect(() => {
    void fetchLandingPageContent().then((res) => {
      if (res) setContent(res);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === "eduhub_landing_page_content") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LANDING_PAGE_CONTENT_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LANDING_PAGE_CONTENT_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return content;
}
