import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, ChevronDown } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getUiLanguage,
  setUiLanguage,
  UI_LANGUAGE_CHANGED_EVENT,
  UI_LANGUAGE_OPTIONS,
  uiLanguageOption,
  type UiLanguageCode,
} from "@/features/settings/languagePreference";
import i18n from "@/i18n";
import { appRoutes } from "@/app/routes";

const SHORT_LANGUAGE_LABEL: Record<UiLanguageCode, string> = {
  en: "En",
  uz: "Uz",
  ru: "Ru",
  zh: "中文",
};

const EduHubHeader = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<UiLanguageCode>(() => getUiLanguage());
  const currentLanguage = uiLanguageOption(language);

  useEffect(() => {
    const sync = () => setLanguage(getUiLanguage());
    window.addEventListener(UI_LANGUAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(UI_LANGUAGE_CHANGED_EVENT, sync);
  }, []);

  const handleLanguageChange = (code: UiLanguageCode) => {
    setLanguage(code);
    setUiLanguage(code);
    void i18n.changeLanguage(code);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-[5px]"
      style={{ fontFamily: "'DM Sans', sans-serif", backgroundColor: "rgba(255, 255, 255, 0.6)" }}
    >
      <nav className="px-6 lg:px-20">
        <div className="flex items-center justify-between h-[80px] relative">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to={appRoutes.home} className="flex items-center py-1">
              <img
                src="/logo-eduhub.png"
                alt="EduHub Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Framer Links style: 8px padding, gray default, blue hover */}
          <nav className="hidden lg:flex items-center gap-10 absolute left-1/2 transform -translate-x-1/2" data-framer-name="Links">
            <div>
              <Link
                to={appRoutes.home}
                className="block py-2 px-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "rgb(109, 109, 109)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgb(101, 155, 255)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgb(109, 109, 109)";
                }}
              >
                {t("nav.home")}
              </Link>
            </div>
            <div>
              <Link
                to={appRoutes.about}
                className="block py-2 px-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "rgb(109, 109, 109)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgb(101, 155, 255)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgb(109, 109, 109)";
                }}
              >
                {t("nav.about")}
              </Link>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="py-2 px-2 text-base font-medium transition-colors flex items-center gap-1 hover:opacity-80"
                    style={{ color: "rgb(109, 109, 109)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgb(101, 155, 255)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgb(109, 109, 109)";
                    }}
                  >
                    {t("nav.program")}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border border-foreground/10 rounded-2xl">
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                    <Link to={appRoutes.programsLanguageTraining}>{t("nav.languageTraining")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                    <Link to={appRoutes.programsAcademicServices}>{t("nav.academicServices")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-transparent text-foreground border border-foreground/20 hover:bg-gray-100 hover:border-foreground/40 rounded-full text-sm h-9 px-3"
                >
                  <span className="mr-0">{currentLanguage.flag}</span>
                  <ChevronDown className="ml-0 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="bg-white border border-foreground/10 !w-[100px] min-w-[100px] max-w-[100px] rounded-2xl"
                align="end"
              >
                {UI_LANGUAGE_OPTIONS.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {SHORT_LANGUAGE_LABEL[lang.code]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Link to="/register">
                <Button className="text-sm font-semibold bg-transparent text-foreground rounded-full border-0 hover:bg-gray-100 transition-all duration-300 h-10 px-6">
                  {t("nav.register")}
                </Button>
              </Link>
              <Link to="/signin">
                <Button
                  variant="ghost"
                  className="text-sm font-semibold text-white border-0 rounded-full h-10 px-6 hover:bg-[#3954d0] hover:text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#3954d0" }}
                >
                  {t("nav.signIn")}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-foreground/10">
            <nav className="flex flex-col gap-4">
              <Link
                to={appRoutes.home}
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.home")}
              </Link>
              <Link
                to={appRoutes.about}
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.about")}
              </Link>
              <Link
                to={appRoutes.programsLanguageTraining}
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors pl-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.languageTraining")}
              </Link>
              <Link
                to={appRoutes.programsAcademicServices}
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors pl-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.academicServices")}
              </Link>
              <div className="pt-4 border-t border-foreground/10 space-y-3">
                {/* Language Switcher - Mobile */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-foreground/70">{t("language.title")}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-transparent text-foreground border border-foreground/20 hover:bg-gray-100 hover:border-foreground/40 rounded-full text-sm h-9 px-3"
                      >
                        <span className="mr-0">{currentLanguage.flag}</span>
                        <ChevronDown className="ml-0 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="bg-white border border-foreground/10 !w-[100px] min-w-[100px] max-w-[100px] rounded-2xl"
                      align="end"
                    >
                      {UI_LANGUAGE_OPTIONS.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleLanguageChange(lang.code)}
                        >
                          <span className="mr-2">{lang.flag}</span>
                          {SHORT_LANGUAGE_LABEL[lang.code]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full text-sm font-semibold bg-transparent text-foreground rounded-full border-0 hover:bg-gray-100 transition-all duration-300 h-10">
                    {t("nav.register")}
                  </Button>
                </Link>
                <Link to="/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    className="w-full text-sm font-semibold text-white rounded-full h-10 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#3954d0" }}
                  >
                    {t("nav.signIn")}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </nav>
    </header>
  );
};

export default EduHubHeader;
