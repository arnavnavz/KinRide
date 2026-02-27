"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n-context";

interface DriverProfile {
  kinCode: string;
  isOnline: boolean;
  isVerified: boolean;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  licensePlate: string;
}

interface RideOffer {
  id: string;
  rideRequestId: string;
  expiresAt: string;
  rideRequest: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    preferKin: boolean;
    estimatedFare: number | null;
    isKinRide: boolean;
    rider: { id: string; name: string };
  };
}

interface ActiveRide {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  rider: { id: string; name: string; phone: string | null };
}

interface EarningsSummary {
  plan: string;
  summary: {
    today: { gross: number; fees: number; net: number };
    week: { gross: number; fees: number; net: number };
  };
}

function OfferTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isUrgent = timeLeft <= 15;
  const isCritical = timeLeft <= 5;

  return (
    <span className={`text-xs font-medium tabular-nums transition-colors ${
      isCritical ? "text-red-600 animate-pulse" : isUrgent ? "text-amber-600" : "text-gray-400"
    }`}>
      {timeLeft}s
    </span>
  );
}

export default function DriverDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [toggling, setToggling] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { joinUser, onEvent } = useSocket();

  const loadData = useCallback(async () => {
    const [profRes, offersRes, ridesRes, earningsRes] = await Promise.all([
      fetch("/api/driver/profile"),
      fetch("/api/driver/offers"),
      fetch("/api/driver/rides"),
      fetch("/api/driver/earnings"),
    ]);
    if (profRes.ok) setProfile(await profRes.json());
    if (offersRes.ok) setOffers(await offersRes.json());
    if (ridesRes.ok) setActiveRides(await ridesRes.json());
    if (earningsRes.ok) setEarnings(await earningsRes.json());
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    loadData();
    if (session?.user?.id) {
      joinUser(session.user.id);
    }
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData, session?.user?.id, joinUser]);

  useEffect(() => {
    const unsub = onEvent("ride:offer", () => {
      loadData();
      toast("New ride offer!", "info");
    });
    return unsub;
  }, [onEvent, loadData, toast]);

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/driver/toggle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => p ? { ...p, isOnline: data.isOnline } : null);
        toast(data.isOnline ? "You're now online" : "You're now offline", "info");
      } else {
        toast("Failed to toggle status", "error");
      }
    } catch {
      toast("Failed to toggle status", "error");
    } finally {
      setToggling(false);
    }
  };

  const acceptOffer = async (rideId: string) => {
    setAcceptingId(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/accept`, { method: "POST" });
      if (res.ok) {
        toast("Offer accepted!", "success");
        router.push(`/driver/ride/${rideId}`);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to accept offer", "error");
        loadData();
      }
    } catch {
      toast("Failed to accept offer", "error");
    } finally {
      setAcceptingId(null);
    }
  };

  const declineOffer = async (rideId: string) => {
    setDecliningId(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/decline`, { method: "POST" });
      if (res.ok) {
        toast("Offer declined", "info");
        loadData();
      } else {
        toast("Failed to decline offer", "error");
      }
    } catch {
      toast("Failed to decline offer", "error");
    } finally {
      setDecliningId(null);
      setDeclineTarget(null);
    }
  };

  const upgradeToKinPro = async () => {
    setUpgradingPlan(true);
    try {
      const res = await fetch("/api/driver/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "KIN_PRO" }),
      });
      if (res.ok) {
        toast("Upgraded to KinPro!", "success");
        loadData();
      } else {
        toast("Failed to upgrade", "error");
      }
    } catch {
      toast("Failed to upgrade", "error");
    } finally {
      setUpgradingPlan(false);
    }
  };

  if (status === "loading" || !dataLoaded) {
    return <DashboardSkeleton />;
  }

  if (session?.user?.role !== "DRIVER") {
    return <div className="text-center py-20 text-gray-500">This page is for drivers only.</div>;
  }

  const isKinPro = earnings?.plan === "KIN_PRO";

  return (
    <div className="space-y-6 animate-fade-in">
      <ConfirmDialog
        open={!!declineTarget}
        title="Decline Offer?"
        message="Are you sure you want to decline this ride offer?"
        confirmLabel="Decline"
        variant="danger"
        onConfirm={() => declineTarget && declineOffer(declineTarget)}
        onCancel={() => setDeclineTarget(null)}
      />

      {/* Profile & Online Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={session?.user?.name || "D"} size="md" online={profile?.isOnline} />
            <div>
              <h1 className="text-xl font-bold">{t("driver.dashboard")}</h1>
              {profile && (
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">
                    {profile.vehicleColor} {profile.vehicleMake} {profile.vehicleModel}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {profile.kinCode}
                  </span>
                  {profile.isVerified && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      {t("driver.verified")}
                    </span>
                  )}
                  {isKinPro && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      KinPro
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 active:scale-[0.97] ${
              profile?.isOnline
                ? "bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-200"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {toggling ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : profile?.isOnline ? t("driver.go_offline") : t("driver.go_online")}
          </button>
        </div>
      </div>

      {/* Earnings Summary */}
      {earnings && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{t("driver.earnings")}</h2>
            <button
              onClick={() => router.push("/driver/earnings")}
              className="text-xs text-primary hover:underline"
            >
              {t("driver.view_details")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t("driver.today")}</p>
              <p className="text-xl font-bold text-gray-800">${earnings.summary.today.net.toFixed(2)}</p>
              {earnings.summary.today.fees > 0 && (
                <p className="text-[10px] text-gray-400">
                  ${earnings.summary.today.gross.toFixed(2)} ${t("driver.gross")} · ${earnings.summary.today.fees.toFixed(2)} ${t("driver.fees")}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t("driver.this_week")}</p>
              <p className="text-xl font-bold text-gray-800">${earnings.summary.week.net.toFixed(2)}</p>
              {earnings.summary.week.fees > 0 && (
                <p className="text-[10px] text-gray-400">
                  ${earnings.summary.week.gross.toFixed(2)} ${t("driver.gross")} · ${earnings.summary.week.fees.toFixed(2)} ${t("driver.fees")}
                </p>
              )}
            </div>
          </div>

          {!isKinPro && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{t("driver.upgrade_kinpro")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t("driver.kinpro_desc")}</p>
                  </div>
                  <button
                    onClick={upgradeToKinPro}
                    disabled={upgradingPlan}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 shrink-0 active:scale-[0.97]"
                  >
                    {upgradingPlan ? "..." : t("driver.upgrade")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incoming Offers */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {t("driver.incoming_offers")} ({offers.length})
        </h2>

        {!profile?.isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700 mb-3 animate-fade-in">
            {t("driver.offline_warning")}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            {t("driver.no_offers")}
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const isKinRide = offer.rideRequest.preferKin || offer.rideRequest.isKinRide;
              const commissionLabel = isKinRide
                ? isKinPro ? "0% commission" : "8% commission"
                : isKinPro ? "10% commission" : "15% commission";
              const commissionColor = isKinRide
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500";

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 animate-fade-in card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={offer.rideRequest.rider.name} size="sm" />
                      <span className="font-medium text-sm">
                        {offer.rideRequest.rider.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${commissionColor}`}>
                        {commissionLabel}
                      </span>
                      {isKinRide && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          Kin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-gray-600 truncate">{offer.rideRequest.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-gray-600 truncate">{offer.rideRequest.dropoffAddress}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {offer.rideRequest.estimatedFare && (
                        <span className="text-sm font-semibold text-gray-700">
                          ${offer.rideRequest.estimatedFare.toFixed(2)}
                        </span>
                      )}
                      <OfferTimer expiresAt={offer.expiresAt} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeclineTarget(offer.rideRequestId)}
                        disabled={decliningId === offer.rideRequestId}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 active:scale-[0.97]"
                      >
                        {decliningId === offer.rideRequestId ? "..." : t("driver.decline")}
                      </button>
                      <button
                        onClick={() => acceptOffer(offer.rideRequestId)}
                        disabled={acceptingId === offer.rideRequestId}
                        className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 active:scale-[0.97]"
                      >
                        {acceptingId === offer.rideRequestId ? "Accepting..." : t("driver.accept")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Rides */}
      {activeRides.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("driver.active_rides")}</h2>
          <div className="space-y-2">
            {activeRides.map((ride) => (
              <button
                key={ride.id}
                onClick={() => router.push(`/driver/ride/${ride.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 card-hover"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={ride.rider.name} size="xs" />
                    <span className="text-sm font-medium truncate">
                      {ride.pickupAddress} → {ride.dropoffAddress}
                    </span>
                  </div>
                  <RideStatusBadge status={ride.status} />
                </div>
                <div className="text-xs text-gray-400 ml-10">
                  {t("driver.rider")}: {ride.rider.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
