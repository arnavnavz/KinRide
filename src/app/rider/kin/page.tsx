"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";
import { PageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

interface Favorite {
  id: string;
  driver: {
    id: string;
    name: string;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      kinCode: string;
      isVerified: boolean;
      isOnline: boolean;
    } | null;
  };
}

interface LoyaltyInfo {
  credits: number;
  creditsDollars: number;
  streakWeeks: number;
  lifetimeRides: number;
}

export default function KinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [kinCode, setKinCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  const loadFavorites = async () => {
    const res = await fetch("/api/favorites");
    if (res.ok) setFavorites(await res.json());
  };

  useEffect(() => {
    loadFavorites();
    fetch("/api/rider/loyalty").then((r) => r.json()).then(setLoyalty).catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinCode: kinCode.toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to add", "error");
      } else {
        toast(`Added ${data.driver.name} to your Kin!`, "success");
        setKinCode("");
        loadFavorites();
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (driverId: string) => {
    setRemovingId(driverId);
    try {
      const res = await fetch(`/api/favorites?driverId=${driverId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Driver removed from Kin", "info");
        loadFavorites();
      } else {
        toast("Failed to remove driver", "error");
      }
    } catch {
      toast("Failed to remove driver", "error");
    } finally {
      setRemovingId(null);
      setRemoveTarget(null);
    }
  };

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (session?.user?.role !== "RIDER") {
    return <div className="text-center py-20 text-gray-500">This page is for riders only.</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Kin Driver?"
        message={`Are you sure you want to remove ${removeTarget?.name || "this driver"} from your Kin list?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => removeTarget && handleRemove(removeTarget.id)}
        onCancel={() => setRemoveTarget(null)}
      />

      <div>
        <h1 className="text-2xl font-bold">My Kin</h1>
        <p className="text-gray-500 text-sm mt-1">Your trusted driver network</p>
      </div>

      {/* Loyalty stats */}
      {loyalty && (
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border border-primary/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Kayu Rewards</h2>
            <span className="text-sm font-bold text-primary">{loyalty.credits} credits</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">${loyalty.creditsDollars.toFixed(2)}</p>
              <p className="text-[11px] text-gray-500">Available</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{loyalty.lifetimeRides}</p>
              <p className="text-[11px] text-gray-500">Total rides</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">
                {loyalty.streakWeeks > 0 ? `${loyalty.streakWeeks}w` : "—"}
              </p>
              <p className="text-[11px] text-gray-500">Streak</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-primary/10">
            Earn 10 credits per ride + streak bonuses. Rides with Kin drivers help them keep more of the fare.
          </p>
        </div>
      )}

      {/* Add by Kin Code */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold mb-3">Add a driver by Kin Code</h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={kinCode}
            onChange={(e) => setKinCode(e.target.value.toUpperCase())}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            placeholder="Enter Kin Code (e.g. CARLOS1)"
            required
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "Add"}
          </button>
        </div>
      </form>

      {/* Favorites list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Your Kin Drivers ({favorites.length})
        </h2>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-400 text-sm">No Kin drivers yet.</p>
            <p className="text-gray-300 text-xs mt-1">Add a driver using their Kin Code above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between card-hover"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={f.driver.name}
                    size="md"
                    online={f.driver.driverProfile?.isOnline}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{f.driver.name}</span>
                      {f.driver.driverProfile?.isVerified && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {f.driver.driverProfile?.vehicleColor}{" "}
                      {f.driver.driverProfile?.vehicleMake}{" "}
                      {f.driver.driverProfile?.vehicleModel}
                      {" · "}
                      Code: {f.driver.driverProfile?.kinCode}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setRemoveTarget({ id: f.driver.id, name: f.driver.name })}
                  disabled={removingId === f.driver.id}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {removingId === f.driver.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
