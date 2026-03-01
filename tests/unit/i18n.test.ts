import { describe, it, expect } from "vitest";
import { getTranslation, getSupportedLocales, isRTL, type Locale } from "@/lib/i18n";

describe("getTranslation", () => {
  it("returns English translation by default", () => {
    expect(getTranslation("en", "nav.request_ride")).toBe("Request Ride");
  });

  it("returns Spanish translation", () => {
    expect(getTranslation("es", "nav.request_ride")).toBe("Pedir Viaje");
  });

  it("returns key itself for missing translations", () => {
    expect(getTranslation("en", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("works for all supported locales", () => {
    const locales: Locale[] = ["en", "es", "fr", "hi", "zh", "ar", "pt"];
    for (const locale of locales) {
      const val = getTranslation(locale, "nav.request_ride");
      expect(val).toBeTruthy();
      expect(val).not.toBe("");
    }
  });
});

describe("getSupportedLocales", () => {
  it("returns all 7 supported locales", () => {
    const locales = getSupportedLocales();
    expect(locales.length).toBe(7);
  });

  it("includes English", () => {
    const locales = getSupportedLocales();
    const en = locales.find((l) => l.code === "en");
    expect(en).toBeDefined();
    expect(en!.label).toBe("English");
  });

  it("each locale has code, label, and flag", () => {
    const locales = getSupportedLocales();
    for (const locale of locales) {
      expect(locale.code).toBeTruthy();
      expect(locale.label).toBeTruthy();
      expect(locale.flag).toBeTruthy();
    }
  });
});

describe("isRTL", () => {
  it("returns true for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
  });

  it("returns false for English", () => {
    expect(isRTL("en")).toBe(false);
  });

  it("returns false for all non-Arabic locales", () => {
    expect(isRTL("es")).toBe(false);
    expect(isRTL("fr")).toBe(false);
    expect(isRTL("hi")).toBe(false);
    expect(isRTL("zh")).toBe(false);
    expect(isRTL("pt")).toBe(false);
  });
});
