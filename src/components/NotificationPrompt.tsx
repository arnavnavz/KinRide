"use client";

import { useState, useEffect } from "react";
import { requestNotificationPermission, subscribeToPush, getNotificationPermission } from "@/lib/notifications";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("kayu-notif-dismissed");
    const perm = getNotificationPermission();
    if (!dismissed && perm === "default") {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeToPush();
    }
    setShow(false);
    localStorage.setItem("kayu-notif-dismissed", "true");
    setEnabling(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("kayu-notif-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] max-w-sm mx-auto bg-card border border-card-border rounded-2xl shadow-xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Stay updated</p>
          <p className="text-xs text-foreground/60 mt-0.5">Get notified when your driver arrives, ride status changes, and new messages.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={enabling}
              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {enabling ? "Enabling..." : "Enable"}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-foreground/50 text-xs font-medium hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
