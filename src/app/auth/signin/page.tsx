"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
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
          <p className="text-foreground/50 text-sm">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="animate-fade-in bg-card rounded-2xl shadow-sm border border-card-border p-6 space-y-4">
          {searchParams.get("verified") === "true" && (
            <div className="bg-green-50 text-green-700 text-sm px-4 py-2.5 rounded-lg">
              Email verified! You can now sign in.
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="you@kayu.com"
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
              placeholder="password123"
              required
            />
            <div className="mt-1 text-right">
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Signing in...
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center animate-fade-in">
            <p className="text-sm text-foreground/50">
            Want to drive?{" "}
            <Link href="/auth/driver-signup" className="text-primary font-medium hover:underline">
              Sign up as a driver
            </Link>
          </p>
        </div>

        <div className="mt-4 bg-card rounded-2xl shadow-sm border border-card-border p-4">
          <p className="text-xs text-foreground/50 mb-2 font-medium">Demo Accounts (password: password123)</p>
          <div className="space-y-1 text-xs text-foreground/70">
            <p><span className="font-medium">Riders:</span> alice@kayu.com, bob@kayu.com</p>
            <p><span className="font-medium">Drivers:</span> driver.carlos@kayu.com, driver.diana@kayu.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
