"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>K</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", marginBottom: 24, maxWidth: 400 }}>
            We hit an unexpected error. Our team has been notified and is looking into it.
          </p>
          <button
            onClick={reset}
            style={{ background: "#6366f1", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
