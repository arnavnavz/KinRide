"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const SUBJECTS = [
  { value: "general", label: "General Question" },
  { value: "ride", label: "Ride Issue" },
  { value: "payment", label: "Payment" },
  { value: "safety", label: "Safety Concern" },
  { value: "account", label: "Account" },
  { value: "driver", label: "Driver Support" },
];

const FAQ = [
  { q: "How do I request a ride?", a: "Open KinRide, enter your destination in the search bar, choose your ride type, and tap Request. You\u2019ll be matched with a nearby driver." },
  { q: "How do verification codes work?", a: "When your driver arrives, you\u2019ll see a 4-digit code on your screen. Share it with your driver \u2014 they must enter it to start the ride. This ensures you get in the right car." },
  { q: "How do I add a favorite (Kin) driver?", a: "After completing a ride, tap \u2018Add to Kin\u2019 on the ride summary. You can also go to the Kin page and add a driver using their Kin code." },
  { q: "How do I become a driver?", a: "Tap \u2018Want to drive?\u2019 on the sign-in page, or go to the driver signup page. You\u2019ll need to provide your vehicle info, upload documents, and pass a background check." },
  { q: "How do refunds work?", a: "If you believe you were overcharged or had a ride issue, contact us through this support page. Our team reviews refund requests within 24-48 hours." },
  { q: "How do I delete my account?", a: "Go to your Profile page, scroll to the bottom, and tap \u2018Delete Account.\u2019 You\u2019ll need to confirm by typing DELETE. This action is permanent." },
];

export default function SupportPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) { setError("Please fill in all fields."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to send"); }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSending(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-8">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Help & Support</h1>
      <p className="text-sm text-foreground/40 mb-10">We&apos;re here to help. Send us a message or check the FAQ below.</p>

      {sent ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center animate-fade-in">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Message Sent</h2>
          <p className="text-sm text-foreground/60">We&apos;ll get back to you within 24 hours at <strong>{email}</strong>.</p>
          <button onClick={() => { setSent(false); setMessage(""); }} className="mt-4 text-sm text-primary font-medium hover:underline">Send another message</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Your name" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Describe your issue or question..." required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={sending} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-[0.98]">{sending ? "Sending..." : "Send Message"}</button>
        </form>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full px-4 py-3.5 flex items-center justify-between text-left min-h-[44px]">
                <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                <svg className={`w-4 h-4 text-foreground/40 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {openFaq === i && <div className="px-4 pb-4"><p className="text-sm text-foreground/60 leading-relaxed">{item.a}</p></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Emergency</h3>
        <p className="text-sm text-red-600/80 dark:text-red-400/70">For emergencies, call <a href="tel:911" className="font-bold underline">911</a>. During active rides, use the SOS button in the app.</p>
      </div>

      <div className="mt-8 text-center text-sm text-foreground/40">
        <p>Email us at <a href="mailto:support@kinride.com" className="text-primary hover:underline">support@kinride.com</a></p>
      </div>

      <div className="mt-10 pt-8 border-t border-card-border text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-foreground/40">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
