export const BLOG_POST_KEYS = ["languagePrograms", "successStories", "workshops"] as const;

export type BlogPostKey = (typeof BLOG_POST_KEYS)[number];

export const BLOG_POST_SLUGS: Record<BlogPostKey, string> = {
  languagePrograms: "awarding-day",
  successStories: "ielts-british-council",
  workshops: "bloomberg-lab",
};

/** i18n key under `public.blog.articles.*` */
export const BLOG_ARTICLE_I18N_KEYS: Record<string, string> = {
  "awarding-day": "awardingDay",
  "ielts-british-council": "ieltsBritishCouncil",
  "bloomberg-lab": "bloombergLab",
};

export const BLOG_IMAGES: Record<BlogPostKey, string> = {
  languagePrograms: "/eduhub/blog/awarding-day-certificate.png",
  successStories: "/eduhub/blog/ielts-registration-room.png",
  workshops: "/eduhub/blog/bloomberg-lab-certificates.png",
};

/** Inline images inserted after a paragraph index (0-based). Use -1 for before the first paragraph. */
export const BLOG_ARTICLE_INLINE_IMAGES: Record<
  string,
  { afterParagraph: number; src: string; altI18nKey: string }[]
> = {
  "awarding-day": [
    {
      afterParagraph: 0,
      src: "/eduhub/blog/awarding-day-certificate.png",
      altI18nKey: "certificatePhotoAlt",
    },
    {
      afterParagraph: 1,
      src: "/eduhub/blog/awarding-day-group.png",
      altI18nKey: "groupPhotoAlt",
    },
  ],
  "ielts-british-council": [
    {
      afterParagraph: 0,
      src: "/eduhub/blog/ielts-registration-room.png",
      altI18nKey: "registrationRoomPhotoAlt",
    },
  ],
  "bloomberg-lab": [
    {
      afterParagraph: -1,
      src: "/eduhub/blog/bloomberg-lab.png",
      altI18nKey: "labPhotoAlt",
    },
    {
      afterParagraph: 0,
      src: "/eduhub/blog/bloomberg-lab-classroom.png",
      altI18nKey: "labClassroomPhotoAlt",
    },
    {
      afterParagraph: 1,
      src: "/eduhub/blog/bloomberg-lab-certificates.png",
      altI18nKey: "labCertificatesPhotoAlt",
    },
  ],
};

export function blogPostKeyFromSlug(slug: string | undefined): BlogPostKey | null {
  if (!slug) return null;
  const entry = Object.entries(BLOG_POST_SLUGS).find(([, value]) => value === slug);
  return entry ? (entry[0] as BlogPostKey) : null;
}

export function blogArticlePath(key: BlogPostKey): string {
  return `/blog/${BLOG_POST_SLUGS[key]}`;
}

export function blogArticleHasPage(slug: string | undefined): slug is keyof typeof BLOG_ARTICLE_I18N_KEYS {
  return Boolean(slug && slug in BLOG_ARTICLE_I18N_KEYS);
}

export function blogPostHasArticlePage(key: BlogPostKey): boolean {
  return BLOG_POST_SLUGS[key] in BLOG_ARTICLE_I18N_KEYS;
}
