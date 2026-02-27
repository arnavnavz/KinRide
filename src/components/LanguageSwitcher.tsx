"use client";

import { useI18n } from "@/lib/i18n-context";
import { getSupportedLocales } from "@/lib/i18n";

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const locales = getSupportedLocales();

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {locales.map((l) => (
          <button
            key={l.code}
            onClick={(e) => { e.stopPropagation(); setLocale(l.code); }}
            className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              locale === l.code
                ? "bg-primary/15 ring-2 ring-primary/40 scale-110"
                : "hover:bg-subtle opacity-60 hover:opacity-100"
            }`}
            title={l.label}
          >
            {l.flag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider">
        {t("common.language")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {locales.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
              locale === l.code
                ? "bg-primary/10 border-primary/30 border text-primary font-medium ring-1 ring-primary/20"
                : "bg-subtle border border-card-border text-foreground/70 hover:bg-card hover:border-foreground/20"
            }`}
          >
            <span className="text-lg">{l.flag}</span>
            <span className="truncate">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
