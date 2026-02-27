"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeToggle";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { I18nProvider } from "@/lib/i18n-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
          <NotificationPrompt />
          <OnboardingTutorial />
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
