"use client";

import { useState, useEffect } from "react";
import { getLocale, setLocale, getSupportedLocales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const [current, setCurrent] = useState<Locale>("en");

  useEffect(() => {
    setCurrent(getLocale());
  }, []);

  const handleChange = (locale: Locale) => {
    setLocale(locale);
    setCurrent(locale);
    window.location.reload();
  };

  const locales = getSupportedLocales();

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            current === l.code
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
