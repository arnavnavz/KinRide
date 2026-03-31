"use client";

import { useState, useEffect } from "react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("kayu-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("kayu-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !deferredPrompt) {
      const timer = setTimeout(() => setShowBanner(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt]);

  async function handleInstall() {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as any).prompt();
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function dismiss() {
    setShowBanner(false);
    localStorage.setItem("kayu-install-dismissed", "1");
  }

  if (!showBanner) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed left-4 right-4 z-50 bg-card border border-card-border rounded-2xl shadow-lg p-4 animate-fade-in max-w-md mx-auto" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Add KinRide to Home Screen</p>
          <p className="text-xs text-foreground/50 mt-0.5">
            {isIOS ? "Tap the share button, then \u2018Add to Home Screen\u2019" : "Get quick access and a better experience"}
          </p>
        </div>
        <button onClick={dismiss} className="text-foreground/30 hover:text-foreground/60 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1.5 -mt-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {!isIOS && deferredPrompt && (
        <button onClick={handleInstall} className="w-full mt-3 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all active:scale-[0.98]">
          Install App
        </button>
      )}
    </div>
  );
}
