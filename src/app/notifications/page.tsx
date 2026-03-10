"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "ride_update", label: "Rides" },
  { key: "message", label: "Messages" },
  { key: "system", label: "System" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ride_update: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0h4m-4 0H9m5-10h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16h-2" />
    </svg>
  ),
  message: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  promo: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  loyalty: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  ride_update: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  message: "text-green-500 bg-green-50 dark:bg-green-900/20",
  loyalty: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  promo: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  system: "text-gray-500 bg-gray-100 dark:bg-gray-800",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const fetchNotifications = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
        if (activeFilter !== "all") params.set("type", activeFilter);

        const res = await fetch(`/api/notifications?${params}`);
        if (!res.ok) return;

        const data: NotificationsResponse = await res.json();
        setNotifications((prev) => (append ? [...prev, ...data.notifications] : data.notifications));
        setUnreadCount(data.unreadCount);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch {
        /* network error — silently ignore */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeFilter],
  );

  useEffect(() => {
    setPage(1);
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const loadMore = () => {
    if (page < totalPages) fetchNotifications(page + 1, true);
  };

  const markAllRead = async () => {
    setMarkingRead(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        const data = await res.json();
        setUnreadCount(data.unreadCount);
      }
    } catch {
      /* ignore */
    }
    setMarkingRead(false);
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        if (res.ok) {
          setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch {
        /* ignore */
      }
    }
    if (notif.linkUrl) router.push(notif.linkUrl);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            {!loading && (
              <p className="text-sm text-foreground/50 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                {total > 0 && ` · ${total} total`}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 px-3 py-2 min-h-[44px] rounded-lg hover:bg-primary/5 flex items-center justify-center"
            >
              {markingRead ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-foreground/60 hover:text-foreground border border-card-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-card-border p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-foreground/10 rounded w-2/3" />
                    <div className="h-3 bg-foreground/10 rounded w-full" />
                    <div className="h-3 bg-foreground/10 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-card rounded-2xl border border-card-border flex flex-col items-center justify-center py-16 text-foreground/40">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-base font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {activeFilter === "all" ? "You're all caught up!" : "Nothing here for this filter."}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-card-border overflow-hidden divide-y divide-card-border">
            {notifications.map((notif) => {
              const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.system;
              const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.system;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-4 transition-colors ${
                    notif.read
                      ? "hover:bg-subtle"
                      : "bg-primary/[0.03] hover:bg-primary/[0.06] border-l-[3px] border-l-primary"
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${colorClass}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold truncate ${notif.read ? "text-foreground/70" : "text-foreground"}`}>
                        {notif.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                        <span className="text-xs text-foreground/40">{timeAgo(notif.createdAt)}</span>
                      </div>
                    </div>
                    <p className={`text-sm mt-0.5 line-clamp-2 ${notif.read ? "text-foreground/40" : "text-foreground/60"}`}>
                      {notif.body}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && page < totalPages && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-card border border-card-border rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </span>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
