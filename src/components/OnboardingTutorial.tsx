"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "kinride-onboarding-done";

function WelcomeIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <circle cx="40" cy="40" r="38" className="stroke-primary" strokeWidth="3" />
      <path
        d="M26 48c0-7.732 6.268-14 14-14s14 6.268 14 14"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="40" cy="28" r="6" className="fill-primary" />
      <path
        d="M32 56l3-6h10l3 6"
        className="stroke-primary-light"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <rect x="8" y="36" width="64" height="24" rx="8" className="stroke-primary" strokeWidth="3" />
      <circle cx="24" cy="60" r="6" className="stroke-primary" strokeWidth="2.5" />
      <circle cx="56" cy="60" r="6" className="stroke-primary" strokeWidth="2.5" />
      <path
        d="M14 36l6-14h20l8 14"
        className="stroke-primary-light"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="30" y="26" width="8" height="10" rx="1.5" className="fill-primary/20 stroke-primary" strokeWidth="1.5" />
      <circle cx="58" cy="18" r="4" className="fill-accent" />
      <path d="M58 14v-4M56 12l2 2 2-2" className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <circle cx="28" cy="26" r="8" className="stroke-primary" strokeWidth="2.5" />
      <circle cx="52" cy="26" r="8" className="stroke-primary-light" strokeWidth="2.5" />
      <path
        d="M16 50c0-6.627 5.373-12 12-12 2.87 0 5.505 1.008 7.57 2.69"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M40 50c0-6.627 5.373-12 12-12s12 5.373 12 12"
        className="stroke-primary-light"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M40 56l2.47 5.01L48 61.97l-4 3.9.94 5.5L40 68.62l-4.94 2.74.94-5.5-4-3.9 5.53-.96z"
        className="fill-accent"
      />
    </svg>
  );
}

function RewardsIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
      <rect x="12" y="24" width="56" height="36" rx="6" className="stroke-primary" strokeWidth="3" />
      <path d="M12 36h56" className="stroke-primary" strokeWidth="2.5" />
      <rect x="20" y="44" width="18" height="4" rx="2" className="fill-primary/30" />
      <circle cx="56" cy="18" r="10" className="fill-accent" />
      <path
        d="M56 12l1.76 3.56 3.93.57-2.84 2.77.67 3.92L56 20.82l-3.52 1.99.67-3.92-2.84-2.77 3.93-.57z"
        className="fill-white"
      />
      <circle cx="22" cy="18" r="6" className="stroke-success" strokeWidth="2" />
      <path d="M19.5 18l1.5 1.5 3-3" className="stroke-success" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const steps = [
  {
    title: "Welcome to KinRide",
    subtitle: "Your trusted ride network",
    description:
      "A smarter way to ride — built around the people you trust. Book rides, build your network, and earn rewards along the way.",
    icon: <WelcomeIcon />,
  },
  {
    title: "Book a Ride",
    subtitle: "Map-first, hassle-free",
    description:
      "Tap where you're going, choose your ride type, and confirm. Your driver is on the way in seconds.",
    icon: <CarIcon />,
  },
  {
    title: "Build Your Kin",
    subtitle: "Ride with people you trust",
    description:
      "Favorite the drivers you trust. They get lower fees, you get priority matching.",
    icon: <PeopleIcon />,
  },
  {
    title: "Earn Rewards",
    subtitle: "Every ride pays off",
    description:
      "Get loyalty credits on every ride. Refer friends for bonus credits.",
    icon: <RewardsIcon />,
  },
];

export function OnboardingTutorial() {
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [status, session]);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (animating) return;
      setDirection(next > step ? "next" : "prev");
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setAnimating(false);
      }, 280);
    },
    [step, animating],
  );

  if (!visible) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const slideClass = animating
    ? direction === "next"
      ? "-translate-x-16 opacity-0"
      : "translate-x-16 opacity-0"
    : "translate-x-0 opacity-100";

  const textSlideClass = animating
    ? direction === "next"
      ? "-translate-x-12 opacity-0"
      : "translate-x-12 opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-animate">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-[min(92vw,400px)] rounded-3xl bg-card/80 backdrop-blur-xl border border-card-border shadow-2xl overflow-hidden">
        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <div className={`mb-6 transition-all duration-300 ease-out ${slideClass}`}>
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              {current.icon}
            </div>
          </div>

          <div className={`transition-all duration-300 ease-out delay-75 ${textSlideClass}`}>
            <h2 className="text-2xl font-bold text-foreground">{current.title}</h2>
            <p className="text-sm font-medium text-primary-light mt-1">{current.subtitle}</p>
            <p className="text-sm text-foreground/60 mt-3 leading-relaxed max-w-[300px]">
              {current.description}
            </p>
          </div>
        </div>

        <div className="px-8 pb-8 flex flex-col items-center gap-5">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-primary"
                    : "w-2 bg-foreground/20 hover:bg-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between w-full">
            <button
              onClick={finish}
              className="text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              Skip
            </button>

            <button
              onClick={() => (isLast ? finish() : goTo(step + 1))}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.97] transition-all"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
