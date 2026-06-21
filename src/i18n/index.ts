import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  getUiLanguage,
  UI_LANGUAGE_CHANGED_EVENT,
  type UiLanguageCode,
} from "@/features/settings/languagePreference";
import { mergeLocales } from "@/i18n/mergeLocales";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enStudent from "./locales/en/student.json";
import enTeacher from "./locales/en/teacher.json";
import enAdmin from "./locales/en/admin.json";
import enPublic from "./locales/en/public.json";

import uzCommon from "./locales/uz/common.json";
import uzAuth from "./locales/uz/auth.json";
import uzStudent from "./locales/uz/student.json";
import uzTeacher from "./locales/uz/teacher.json";
import uzAdmin from "./locales/uz/admin.json";
import uzPublic from "./locales/uz/public.json";

import ruCommon from "./locales/ru/common.json";
import ruAuth from "./locales/ru/auth.json";
import ruStudent from "./locales/ru/student.json";
import ruTeacher from "./locales/ru/teacher.json";
import ruAdmin from "./locales/ru/admin.json";
import ruPublic from "./locales/ru/public.json";

import zhCommon from "./locales/zh/common.json";
import zhAuth from "./locales/zh/auth.json";
import zhStudent from "./locales/zh/student.json";
import zhTeacher from "./locales/zh/teacher.json";
import zhAdmin from "./locales/zh/admin.json";
import zhPublic from "./locales/zh/public.json";

const resources = {
  en: {
    translation: mergeLocales(enCommon, enAuth, enStudent, enTeacher, enAdmin, enPublic),
  },
  uz: {
    translation: mergeLocales(uzCommon, uzAuth, uzStudent, uzTeacher, uzAdmin, uzPublic),
  },
  ru: {
    translation: mergeLocales(ruCommon, ruAuth, ruStudent, ruTeacher, ruAdmin, ruPublic),
  },
  zh: {
    translation: mergeLocales(zhCommon, zhAuth, zhStudent, zhTeacher, zhAdmin, zhPublic),
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: getUiLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== "undefined") {
  window.addEventListener(UI_LANGUAGE_CHANGED_EVENT, (event) => {
    const code = (event as CustomEvent<{ code: UiLanguageCode }>).detail?.code;
    if (code) void i18n.changeLanguage(code);
  });
}

export default i18n;
