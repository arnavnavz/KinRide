"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

type Tab = "new" | "tickets";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  rideRequestId: string | null;
  createdAt: string;
}

interface RideOption {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "fare_dispute", label: "Fare Dispute" },
  { value: "safety", label: "Safety Concern" },
  { value: "lost_item", label: "Lost Item" },
  { value: "driver_issue", label: "Driver Issue" },
  { value: "app_issue", label: "App Issue" },
  { value: "other", label: "Other" },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Open" },
  in_review: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "In Review" },
  resolved: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Resolved" },
  closed: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: "Closed" },
};

const CATEGORY_LABELS: Record<string, string> = {
  fare_dispute: "Fare Dispute",
  safety: "Safety Concern",
  lost_item: "Lost Item",
  driver_issue: "Driver Issue",
  app_issue: "App Issue",
  other: "Other",
};

export default function SupportPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("new");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rides, setRides] = useState<RideOption[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [rideRequestId, setRideRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus, router]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support");
      if (res.ok) setTickets(await res.json());
    } catch { /* ignore */ }
    setLoadingTickets(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    fetch("/api/rides/request")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRides(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !description.trim()) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
          rideRequestId: rideRequestId || undefined,
        }),
      });
      if (res.ok) {
        toast("Support ticket created!", "success");
        setCategory("");
        setSubject("");
        setDescription("");
        setRideRequestId("");
        setTab("tickets");
        loadTickets();
      } else {
        const data = await res.json();
        toast(data.error?.toString() || "Failed to create ticket", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "RIDER") {
    return <div className="text-center py-20 text-foreground/60">This page is for riders only.</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/rider/request"
          className="p-2 text-foreground/50 hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Support</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-subtle rounded-xl p-1">
        <button
          onClick={() => setTab("new")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            tab === "new"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground/50 hover:text-foreground/70"
          }`}
        >
          New Ticket
        </button>
        <button
          onClick={() => { setTab("tickets"); loadTickets(); }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            tab === "tickets"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground/50 hover:text-foreground/70"
          }`}
        >
          My Tickets
          {tickets.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-bold">
              {tickets.length}
            </span>
          )}
        </button>
      </div>

      {/* New Ticket Tab */}
      {tab === "new" && (
        <div className="space-y-4 animate-fade-in">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={200}
              className="w-full bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              maxLength={2000}
              className="w-full bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <div className="flex justify-end">
              <span className={`text-xs ${description.length >= 1800 ? "text-red-400" : "text-foreground/30"}`}>
                {description.length}/2000
              </span>
            </div>
          </div>

          {/* Related ride */}
          {rides.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Related Ride (optional)</label>
              <select
                value={rideRequestId}
                onChange={(e) => setRideRequestId(e.target.value)}
                className="w-full bg-subtle border border-card-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none"
              >
                <option value="">None</option>
                {rides.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.createdAt).toLocaleDateString()} — {r.pickupAddress.split(",")[0]} → {r.dropoffAddress.split(",")[0]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !category || !subject.trim() || !description.trim()}
            className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 shadow-sm active:scale-[0.98]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      )}

      {/* My Tickets Tab */}
      {tab === "tickets" && (
        <div className="space-y-3 animate-fade-in">
          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <svg className="w-12 h-12 text-foreground/20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-foreground/40">No tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const statusStyle = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open;
              return (
                <div
                  key={ticket.id}
                  className="bg-card border border-card-border rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                      <p className="text-xs text-foreground/40 mt-0.5">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        {" · "}
                        {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60 line-clamp-2">{ticket.description}</p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
