"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/rider-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-2">
            <span className="text-3xl font-bold text-primary">Ka</span>
            <span className="text-3xl font-light text-foreground">yu</span>
          </div>
          <p className="text-foreground/50 text-sm">Create your account</p>
        </div>

        <div className="animate-fade-in bg-card rounded-2xl shadow-sm border border-card-border p-6 space-y-4">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-foreground font-medium">Check your email to verify your account</p>
              <p className="text-foreground/50 text-sm">
                We sent a verification link to <span className="font-medium text-foreground/70">{email}</span>
              </p>
              <Link
                href="/auth/signin"
                className="inline-block mt-2 text-primary text-sm font-medium hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-4 text-center animate-fade-in">
          <p className="text-sm text-foreground/50">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
