"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getLocale, setLocale as persistLocale, getTranslation, isRTL, type Locale } from "./i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = getLocale();
    setLocaleState(saved);
    document.documentElement.lang = saved;
    document.documentElement.dir = isRTL(saved) ? "rtl" : "ltr";
  }, []);

  const changeLocale = useCallback((newLocale: Locale) => {
    persistLocale(newLocale);
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = isRTL(newLocale) ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string) => getTranslation(locale, key),
    [locale]
  );

  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
