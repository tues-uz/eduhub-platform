import { Fragment } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "@/lib/icons";
import EduHubHeader from "@/components/EduHubHeader";
import Footer from "@/components/Footer";
import { appRoutes } from "@/app/routes";
import {
  BLOG_ARTICLE_I18N_KEYS,
  BLOG_ARTICLE_INLINE_IMAGES,
  blogArticleHasPage,
  blogPostKeyFromSlug,
} from "@/features/landing/blogPosts";

const PAGE_CONTAINER = "container mx-auto px-6 lg:px-20";
const ARTICLE_MAX = "mx-auto max-w-[680px]";
const INK = "rgb(3, 2, 11)";
const MUTED = "rgb(88, 88, 102)";
const SOFT = "rgb(240, 244, 243)";

function BlogPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5"
      style={{ backgroundColor: SOFT }}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-90"
          style={{ backgroundColor: "rgb(94, 107, 100)", transform: "scale(1.9)" }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: "rgb(19, 38, 27)" }}
        />
      </span>
      <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
        {children}
      </span>
    </span>
  );
}

export default function EduHubBlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  if (!blogArticleHasPage(slug)) {
    return <Navigate to="/journal" replace />;
  }

  const postKey = blogPostKeyFromSlug(slug);
  if (!postKey) {
    return <Navigate to="/journal" replace />;
  }

  const articleKey = BLOG_ARTICLE_I18N_KEYS[slug];
  const title = t(`public.blog.articles.${articleKey}.title`);
  const date = t(`public.blog.articles.${articleKey}.date`);
  const paragraphs = t(`public.blog.articles.${articleKey}.paragraphs`, { returnObjects: true }) as string[];
  const inlineImages = BLOG_ARTICLE_INLINE_IMAGES[slug] ?? [];
  const registrationListRaw = t(`public.blog.articles.${articleKey}.registrationList`, {
    returnObjects: true,
    defaultValue: null,
  }) as
    | {
        afterParagraph: number;
        items: { label: string; text: string; url: string }[];
      }
    | null;
  const registrationList =
    registrationListRaw &&
    typeof registrationListRaw === "object" &&
    "afterParagraph" in registrationListRaw &&
    Array.isArray(registrationListRaw.items)
      ? registrationListRaw
      : null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />

      <main>
        {/* Hero */}
        <section className="bg-white pb-6 pt-[112px] lg:pb-8 lg:pt-[132px]">
          <div className={PAGE_CONTAINER}>
            <Link
              to={appRoutes.home}
              className="mb-10 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: MUTED }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("public.blog.article.backToHome")}
            </Link>

            <div className={`${ARTICLE_MAX} text-center`}>
              <div className="mb-5 flex justify-center">
                <BlogPill>{t("public.blog.badge")}</BlogPill>
              </div>

              <h1
                className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]"
                style={{ color: INK }}
              >
                {title}
              </h1>

              <p className="mt-4 text-base font-medium sm:text-lg" style={{ color: MUTED }}>
                {date}
              </p>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="bg-white pb-12 pt-2 lg:pb-16">
          <div className={PAGE_CONTAINER}>
            <article className={ARTICLE_MAX}>
              <div className="space-y-8">
                {inlineImages
                  .filter((image) => image.afterParagraph === -1)
                  .map((image) => (
                    <figure
                      key={image.src}
                      className="overflow-hidden rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                    >
                      <img
                        src={image.src}
                        alt={t(`public.blog.articles.${articleKey}.${image.altI18nKey}`)}
                        className="h-auto w-full object-cover"
                      />
                    </figure>
                  ))}
                {paragraphs.map((paragraph, index) => (
                  <Fragment key={index}>
                    <p
                      className="text-base leading-[1.85] sm:text-[17px]"
                      style={{ color: "rgb(61, 61, 61)" }}
                    >
                      {paragraph}
                    </p>
                    {inlineImages
                      .filter((image) => image.afterParagraph === index)
                      .map((image) => (
                        <figure
                          key={image.src}
                          className="overflow-hidden rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                        >
                          <img
                            src={image.src}
                            alt={t(`public.blog.articles.${articleKey}.${image.altI18nKey}`)}
                            className="h-auto w-full object-cover"
                          />
                        </figure>
                      ))}
                    {registrationList?.afterParagraph === index ? (
                      <ul className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6">
                        {registrationList.items.map((item) => (
                          <li key={item.label} className="text-base sm:text-[17px]">
                            <span className="font-semibold" style={{ color: INK }}>
                              {item.label}:{" "}
                            </span>
                            <a
                              href={item.url}
                              target={item.url.startsWith("http") ? "_blank" : undefined}
                              rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                              className="break-all underline-offset-2 hover:underline"
                              style={{ color: "rgb(37, 99, 235)" }}
                            >
                              {item.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Fragment>
                ))}
              </div>

              <div
                className="mt-14 flex flex-col items-start gap-4 border-t border-gray-100 pt-10 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm" style={{ color: MUTED }}>
                  {t("public.blog.article.publishedOn", { date })}
                </p>
                <Link
                  to={appRoutes.home}
                  className="inline-flex items-center gap-2 rounded-[40px] px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: INK, color: "#fff" }}
                >
                  {t("public.blog.readMore")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
