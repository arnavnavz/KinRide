"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { PageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Navbar } from "@/components/Navbar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  driverProfile: {
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    vehicleColor: string;
    licensePlate: string;
    kinCode: string;
    isVerified: boolean;
  } | null;
  riderLoyalty: {
    credits: number;
    lifetimeRides: number;
    streakWeeks: number;
  } | null;
  _count: {
    rideRequests: number;
    ridesAsDriver: number;
    favorites: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [emailPrefs, setEmailPrefs] = useState({
    tripReceipts: true,
    weeklySummary: true,
    promotions: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kayu-email-prefs");
      if (saved) setEmailPrefs(JSON.parse(saved));
    } catch {}
  }, []);

  const updateEmailPref = (key: keyof typeof emailPrefs, value: boolean) => {
    const updated = { ...emailPrefs, [key]: value };
    setEmailPrefs(updated);
    localStorage.setItem("kayu-email-prefs", JSON.stringify(updated));
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setProfile(data);
        setEditName(data.name);
        setEditPhone(data.phone || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      toast("Name must be at least 2 characters", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to update", "error");
        return;
      }
      setProfile((prev) => (prev ? { ...prev, name: data.name, phone: data.phone } : prev));
      setEditing(false);
      toast("Profile updated!", "success");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast("Enter your current password", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("New password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Passwords don't match", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to change password", "error");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      toast("Password changed successfully!", "success");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
          <PageSkeleton />
        </div>
      </>
    );
  }

  if (!session?.user) return null;

  const isDriver = session.user.role === "DRIVER";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <Avatar name={profile?.name || session.user.name || "U"} size="lg" className="mb-4" />
            <h1 className="text-2xl font-bold text-foreground">{profile?.name || session.user.name}</h1>
            <p className="text-sm text-foreground/50 mt-1">{profile?.email || session.user.email}</p>
            <span className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs uppercase font-semibold tracking-wide">
              {profile?.role || session.user.role}
            </span>
            {memberSince && (
              <p className="text-xs text-foreground/40 mt-2">Member since {memberSince}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-card rounded-xl border border-card-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{profile?._count.rideRequests ?? 0}</p>
              <p className="text-xs text-foreground/50 mt-1">Total Rides</p>
            </div>
            <div className="bg-card rounded-xl border border-card-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{profile?._count.favorites ?? 0}</p>
              <p className="text-xs text-foreground/50 mt-1">Kin Drivers</p>
            </div>
            {!isDriver && profile?.riderLoyalty && (
              <div className="bg-card rounded-xl border border-card-border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{profile.riderLoyalty.credits}</p>
                <p className="text-xs text-foreground/50 mt-1">Loyalty Credits</p>
              </div>
            )}
            {isDriver && (
              <div className="bg-card rounded-xl border border-card-border p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{profile?._count.ridesAsDriver ?? 0}</p>
                <p className="text-xs text-foreground/50 mt-1">Completed Rides</p>
              </div>
            )}
            {!isDriver && profile?.riderLoyalty && (
              <div className="bg-card rounded-xl border border-card-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{profile.riderLoyalty.streakWeeks}</p>
                <p className="text-xs text-foreground/50 mt-1">Week Streak</p>
              </div>
            )}
          </div>

          {/* Edit Profile */}
          <div className="bg-card rounded-2xl border border-card-border p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Profile Details</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-primary font-medium hover:text-primary-dark transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditName(profile?.name || "");
                    setEditPhone(profile?.phone || "");
                  }}
                  className="text-xs text-foreground/50 hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-xs text-foreground/50">Name</span>
                  <span className="text-sm text-foreground font-medium">{profile?.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-xs text-foreground/50">Email</span>
                  <span className="text-sm text-foreground font-medium">{profile?.email}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-foreground/50">Phone</span>
                  <span className="text-sm text-foreground font-medium">{profile?.phone || "Not set"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment methods */}
          <Link
            href="/profile/payment-methods"
            className="flex items-center justify-between bg-card rounded-2xl border border-card-border p-5 mb-4 hover:border-primary/30 transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Payment methods</h2>
                <p className="text-xs text-foreground/50">Add a card for rides and tips</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Change Password */}
          <div className="bg-card rounded-2xl border border-card-border p-5 mb-4">
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
              <svg
                className={`w-4 h-4 text-foreground/40 transition-transform ${showPasswordSection ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-subtle border border-card-border rounded-xl text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {changingPassword ? "Changing..." : "Update Password"}
                </button>
              </div>
            )}
          </div>

          {/* Email Preferences */}
          <div className="bg-card rounded-2xl border border-card-border p-5 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Email Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-foreground">Trip receipts</p>
                  <p className="text-xs text-foreground/40">Receive a receipt after each ride</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailPrefs.tripReceipts}
                  onClick={() => updateEmailPref("tripReceipts", !emailPrefs.tripReceipts)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.tripReceipts ? "bg-primary" : "bg-foreground/20"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.tripReceipts ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </label>

              {isDriver && (
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-foreground">Weekly earnings summary</p>
                    <p className="text-xs text-foreground/40">Get a weekly earnings report every Monday</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailPrefs.weeklySummary}
                    onClick={() => updateEmailPref("weeklySummary", !emailPrefs.weeklySummary)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.weeklySummary ? "bg-primary" : "bg-foreground/20"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.weeklySummary ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </label>
              )}

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-foreground">Promotional offers</p>
                  <p className="text-xs text-foreground/40">Deals, discounts, and new features</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailPrefs.promotions}
                  onClick={() => updateEmailPref("promotions", !emailPrefs.promotions)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.promotions ? "bg-primary" : "bg-foreground/20"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.promotions ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Language */}
          <div className="bg-card rounded-2xl border border-card-border p-5 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Language</h2>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Driver Info */}
          {isDriver && profile?.driverProfile && (
            <div className="bg-card rounded-2xl border border-card-border p-5 mb-4">
              <h2 className="text-sm font-semibold text-foreground mb-4">Driver Info</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-xs text-foreground/50">Vehicle</span>
                  <span className="text-sm text-foreground font-medium">
                    {profile.driverProfile.vehicleColor} {profile.driverProfile.vehicleYear}{" "}
                    {profile.driverProfile.vehicleMake} {profile.driverProfile.vehicleModel}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-xs text-foreground/50">License Plate</span>
                  <span className="text-sm text-foreground font-medium">{profile.driverProfile.licensePlate}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-xs text-foreground/50">Kin Code</span>
                  <span className="text-sm text-primary font-bold tracking-wider">{profile.driverProfile.kinCode}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-foreground/50">Verification</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      profile.driverProfile.isVerified
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {profile.driverProfile.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full mt-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors active:scale-[0.98]"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
