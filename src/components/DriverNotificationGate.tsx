"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { requestNotificationPermission, subscribeToPush, getNotificationPermission } from "@/lib/notifications";

export function DriverNotificationGate({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [permState, setPermState] = useState<"loading" | "granted" | "blocked" | "prompt">("loading");
  const [enabling, setEnabling] = useState(false);

  const checkPermission = useCallback(() => {
    if (typeof window === "undefined") return;
    const perm = getNotificationPermission();
    if (perm === "granted") {
      setPermState("granted");
      subscribeToPush().catch(() => {});
    } else if (perm === "denied") {
      setPermState("blocked");
    } else if (perm === "unsupported") {
      setPermState("granted");
    } else {
      setPermState("prompt");
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  if (!session?.user || session.user.role !== "DRIVER") return <>{children}</>;
  if (permState === "loading" || permState === "granted") return <>{children}</>;

  const handleEnable = async () => {
    setEnabling(true);
    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeToPush();
      setPermState("granted");
    } else {
      setPermState("blocked");
    }
    setEnabling(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Enable Notifications</h1>
        <p className="text-sm text-foreground/60 mb-2">
          Notifications are <strong>required</strong> for drivers. You\u2019ll be notified when:
        </p>
        <ul className="text-sm text-foreground/60 text-left space-y-2 mb-6 mx-auto max-w-xs">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">\u2022</span>
            <span>A rider requests a ride from you</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">\u2022</span>
            <span>A rider sends you a message</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">\u2022</span>
            <span>Ride status changes or safety alerts</span>
          </li>
        </ul>

        {permState === "blocked" ? (
          <div>
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Notifications are blocked</p>
              <p className="text-xs text-red-500/70 dark:text-red-400/60">
                Open your browser settings and allow notifications for this site, then refresh the page.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all active:scale-[0.98] min-h-[44px]"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnable}
            disabled={enabling}
            className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-[0.98] min-h-[44px]"
          >
            {enabling ? "Enabling..." : "Enable Notifications"}
          </button>
        )}
      </div>
    </div>
  );
}
