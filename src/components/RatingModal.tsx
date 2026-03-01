"use client";

import { useState } from "react";

export interface PendingRide {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number | null;
  driver: { name: string | null } | null;
  updatedAt: string;
}

interface RatingModalProps {
  ride: PendingRide;
  onClose: () => void;
  onSubmit: () => void;
}

export function RatingModal({ ride, onClose, onSubmit }: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (stars === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/rides/${ride.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit rating");
        return;
      }
      onSubmit();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const displayStar = hoveredStar || stars;
  const driverName = ride.driver?.name || "your driver";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-card rounded-2xl border border-card-border shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Rate your ride</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors text-foreground/50 hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-foreground/70">
              How was your ride with <span className="font-semibold text-foreground">{driverName}</span>?
            </p>
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <span className="truncate max-w-[120px]">{ride.pickupAddress}</span>
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="truncate max-w-[120px]">{ride.dropoffAddress}</span>
            </div>
            {ride.estimatedFare != null && (
              <p className="text-xs text-foreground/40">
                Fare: <span className="font-medium text-foreground/60">${ride.estimatedFare.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHoveredStar(s)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setStars(s)}
                className="transition-transform duration-150 hover:scale-125 active:scale-95"
              >
                <svg
                  className={`w-10 h-10 transition-colors duration-150 ${
                    s <= displayStar
                      ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                      : "text-foreground/15"
                  }`}
                  fill={s <= displayStar ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            ))}
          </div>

          {stars > 0 && (
            <p className="text-center text-sm font-medium text-foreground/60">
              {stars === 1 && "Poor"}
              {stars === 2 && "Fair"}
              {stars === 3 && "Good"}
              {stars === 4 && "Great"}
              {stars === 5 && "Excellent!"}
            </p>
          )}

          <textarea
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= 500) setComment(e.target.value);
            }}
            placeholder="Leave a comment (optional)"
            rows={3}
            className="w-full bg-subtle border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
          />

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={stars === 0 || submitting}
            className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-40 shadow-sm active:scale-[0.98]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (
              "Submit Rating"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
