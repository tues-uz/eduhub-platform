import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, ArrowRight } from "@/lib/icons";
import { useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isPublicLandingPage } from "@/app/routes";

type FooterLinkKey =
  | "about"
  | "contact"
  | "faq"
  | "termsConditions"
  | "privacyPolicy"
  | "paymentMethod"
  | "eduhubTeam"
  | "internationalStudents"
  | "openDays"
  | "contactUs"
  | "alumni"
  | "giving"
  | "jobs"
  | "pressOffice"
  | "conferenceEvents";

type FooterSectionKey = "other" | "information" | "connect";

const FOOTER_SECTIONS: { key: FooterSectionKey; links: FooterLinkKey[] }[] = [
  {
    key: "other",
    links: ["about", "contact", "faq", "termsConditions", "privacyPolicy"],
  },
  {
    key: "information",
    links: ["paymentMethod", "eduhubTeam", "internationalStudents", "openDays", "contactUs"],
  },
  {
    key: "connect",
    links: ["alumni", "giving", "jobs", "pressOffice", "conferenceEvents"],
  },
];

const EDUHUB_HIDDEN_ADMISSIONS_LINKS: FooterLinkKey[] = ["internationalStudents", "openDays", "contactUs"];

const SOCIAL_KEYS = ["facebook", "twitter", "instagram", "linkedin", "youtube"] as const;

const Footer = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isEduHubPage = isPublicLandingPage(location.pathname);
  const isJournalPage = location.pathname === "/journal" || location.pathname.startsWith("/journal/");
  const [email, setEmail] = useState("");

  const socialLinks = useMemo(
    () =>
      SOCIAL_KEYS.map((key) => ({
        key,
        icon: { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin, youtube: Youtube }[key],
        href: "#",
        label: t(`public.footer.social.${key}`),
      })),
    [t],
  );

  const processedFooterSections = useMemo(() => {
    let sections = isEduHubPage
      ? FOOTER_SECTIONS.filter((section) => section.key !== "connect")
      : FOOTER_SECTIONS;

    if (isEduHubPage) {
      sections = sections.map((section) =>
        section.key === "information"
          ? {
              ...section,
              links: section.links.filter((link) => !EDUHUB_HIDDEN_ADMISSIONS_LINKS.includes(link)),
            }
          : section,
      );
    }

    return sections.map((section) => ({
      ...section,
      title: t(`public.footer.sections.${section.key}`),
      links: section.links.map((link) => ({
        key: link,
        label: t(`public.footer.links.${link}`),
      })),
    }));
  }, [isEduHubPage, t]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
  };

  if (isJournalPage) {
    return (
      <footer className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t("public.footer.journal.brand")}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t("public.footer.journal.tagline")}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                {t("public.footer.journal.quickLinks")}
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="/journal" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.home")}
                  </a>
                </li>
                <li>
                  <a href="/journal/articles" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.articles")}
                  </a>
                </li>
                <li>
                  <a href="/journal/authors" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.authors")}
                  </a>
                </li>
                <li>
                  <a href="/journal/topics" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.topics")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                {t("public.footer.journal.about")}
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="/journal/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.aboutUs")}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.editorialTeam")}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.submissionGuidelines")}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    {t("public.footer.journal.contact")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                {t("public.footer.journal.contact")}
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:journal@tues.uz" className="hover:text-gray-900 transition-colors">
                    journal@tues.uz
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+998777029695" className="hover:text-gray-900 transition-colors">
                    +998 777029695
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>38B, Ibn Sino, Termez</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 mt-8 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">{t("public.footer.journal.copyright")}</div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {t("public.footer.links.privacyPolicy")}
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {t("public.footer.journal.termsOfUse")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const cream = "rgb(253, 253, 251)";
  const creamMuted = "rgb(249, 249, 247)";
  const dark = "rgb(38, 41, 46)";

  return (
    <footer className="w-full bg-white">
      <div className="container mx-auto px-6 py-8">
        <div className="rounded-[40px] p-8 lg:p-12" style={{ backgroundColor: dark }}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            {isEduHubPage && (
              <div className="lg:col-span-4">
                <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                  {t("public.footer.subscribe")}
                </p>
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="email"
                      required
                      name="Email"
                      placeholder={t("public.footer.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 min-w-0 rounded-full border px-4 py-3 text-sm placeholder:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/30"
                      style={{
                        backgroundColor: cream,
                        borderColor: "rgba(136, 136, 136, 0.2)",
                        color: dark,
                      }}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-5 text-base font-medium shrink-0 hover:opacity-90 text-white transition-colors"
                      style={{ backgroundColor: "#199eff" }}
                    >
                      {t("public.footer.subscribeButton")}
                      <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cream }}>
                        <ArrowRight className="h-4 w-4" style={{ color: dark }} />
                      </span>
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: creamMuted }}>
                    {t("public.footer.subscribeConsent")}{" "}
                    <a href="#" className="underline hover:opacity-90" style={{ color: cream }}>
                      {t("public.footer.privacyPolicy")}
                    </a>{" "}
                    {t("public.footer.subscribeConsentSuffix")}
                  </p>
                </form>
              </div>
            )}

            <div className={isEduHubPage ? "lg:col-span-3" : "lg:col-span-5"}>
              <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                {t("public.footer.contact")}
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: creamMuted }}>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>38B, Ibn Sino, Termez</span>
                </li>
                <li>
                  <a href="tel:+998777029695" className="hover:opacity-90 transition-opacity">
                    +998 777029695
                  </a>
                </li>
                <li>
                  <a href="mailto:info@ox.ac.uk" className="hover:opacity-90 transition-opacity">
                    info@ox.ac.uk
                  </a>
                </li>
                <li>
                  <a href="https://t.me/eduhub_tisu_admin" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                    Telegram @eduhub_tisu_admin
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/_tisu_eduhub" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                    Instagram @_tisu_eduhub
                  </a>
                </li>
              </ul>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.key}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: creamMuted }}
                    >
                      <Icon className="h-4 w-4" style={{ color: dark }} />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className={isEduHubPage ? "lg:col-span-5" : "lg:col-span-7"}>
              <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                {t("public.footer.menuLinks")}
              </p>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-2.5 sm:gap-x-6 lg:gap-x-10 list-none p-0 m-0 text-left [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                {processedFooterSections.flatMap((section) =>
                  section.links.map((link) => (
                    <li key={`${section.key}-${link.key}`} className="min-w-0">
                      <a
                        href="#"
                        className="block whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  )),
                )}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <a href="/" className="shrink-0">
              <img src="/logo-eduhub.png" alt="EduHub" className="h-8 w-auto object-contain opacity-90" />
            </a>
            <p className="text-sm text-center" style={{ color: creamMuted }}>
              {t("public.footer.copyright")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: creamMuted }}>
              <a href="#" className="hover:opacity-90 transition-opacity">
                {t("public.footer.links.privacyPolicy")}
              </a>
              <a href="#" className="hover:opacity-90 transition-opacity">
                {t("public.footer.termsOfUse")}
              </a>
              <a href="#" className="hover:opacity-90 transition-opacity">
                {t("public.footer.accessibility")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
