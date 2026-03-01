"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            entry.target.classList.remove("opacity-0", "translate-y-4");
          }
        });
      },
      { threshold: 0.1 }
    );
    el.querySelectorAll("[data-reveal]").forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const revealRef = useScrollReveal();

  const dashboardHref =
    session?.user?.role === "DRIVER" ? "/driver/dashboard" : "/rider/request";

  useEffect(() => {
    if (session?.user) {
      router.replace(dashboardHref);
    }
  }, [session, router, dashboardHref]);

  return (
    <div ref={revealRef} className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center py-20 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-primary font-medium">Trusted rides from people you know</span>
          </div>

          <div className="inline-flex items-center gap-1.5 mb-6 animate-fade-in">
            <span className="text-5xl md:text-6xl font-bold text-primary">Kin</span>
            <span className="text-5xl md:text-6xl font-light text-foreground">Ride</span>
          </div>

          <p className="text-xl md:text-2xl text-foreground/70 mb-3 leading-relaxed animate-fade-in">
            Your trusted transportation network.
          </p>
          <p className="text-foreground/50 mb-10 max-w-lg mx-auto animate-fade-in">
            Build a list of trusted drivers — your Kin — and request rides from
            people you know and trust. Lower commissions for drivers, loyalty rewards for riders.
          </p>

          {session ? (
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.97] animate-fade-in"
            >
              Go to Dashboard
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-3 animate-fade-in">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.97]"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-8 mt-12 animate-fade-in" data-reveal>
            {[
              { value: "10%", label: "Kin commission" },
              { value: "0%", label: "KinPro rate" },
              { value: "10pts", label: "per ride reward" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-foreground/50">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-16 text-left">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                bgColor: "bg-primary/10",
                title: "Build Your Kin",
                desc: "Add trusted drivers to your personal network using their unique Kin Code. They keep more of the fare.",
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                bgColor: "bg-accent/10",
                title: "Chat & Plan Ahead",
                desc: "Message your driver before the ride. Plan airport pickups, schedule regular commutes.",
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                bgColor: "bg-success/10",
                title: "Stay Safe",
                desc: "Share your trip link with loved ones. Real-time tracking and SOS features for every ride.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                data-reveal
                className="opacity-0 translate-y-4 bg-card rounded-xl p-5 shadow-sm border border-card-border card-hover transition-all"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1 text-foreground">{feature.title}</h3>
                <p className="text-xs text-foreground/60 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-20" data-reveal>
            <h2 className="text-lg font-bold mb-8 opacity-0 translate-y-4 text-foreground">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              {[
                { step: "1", title: "Sign Up", desc: "Create your rider or driver account" },
                { step: "2", title: "Add Kin", desc: "Share Kin Codes to build your network" },
                { step: "3", title: "Request", desc: "Choose any driver or prefer your Kin" },
                { step: "4", title: "Ride", desc: "Track in real time, chat, and rate" },
              ].map((item, i) => (
                <div key={item.step} data-reveal className="opacity-0 translate-y-4" style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary font-bold text-sm">
                    {item.step}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For drivers CTA */}
          <div
            data-reveal
            className="opacity-0 translate-y-4 mt-16 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-8 text-center"
          >
            <h2 className="text-lg font-bold mb-2 text-foreground">Drive with Kayu</h2>
            <p className="text-sm text-foreground/60 mb-4 max-w-md mx-auto">
              Keep up to 100% of your fares with KinPro. Build loyal riders who request you directly. No surge-chasing — just steady, trusted income.
            </p>
            <Link
              href="/auth/driver-signup"
              className="inline-flex items-center gap-2 bg-card text-primary border border-primary/20 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/10 transition-colors active:scale-[0.97]"
            >
              Start Driving
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 px-6 text-center text-xs text-foreground/40">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="font-bold text-primary">Ka</span>
          <span className="font-light text-foreground">yu</span>
        </div>
        <p className="mb-3">Your trusted ride network</p>
        <div className="flex items-center justify-center gap-4">
          <a href="/legal/terms" className="hover:text-foreground/70 transition-colors">Terms</a>
          <a href="/legal/privacy" className="hover:text-foreground/70 transition-colors">Privacy</a>
          <a href="/legal/driver-agreement" className="hover:text-foreground/70 transition-colors">Driver Agreement</a>
        </div>
      </footer>
    </div>
  );
}
