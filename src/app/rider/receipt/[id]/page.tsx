"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ReceiptData {
  id: string;
  date: string;
  status: string;
  pickup: string;
  dropoff: string;
  fare: number | null;
  platformFee: number | null;
  isKinRide: boolean;
  rideType: string;
  rider: { name: string; email: string };
  driver: {
    name: string;
    driverProfile: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
    } | null;
  } | null;
  payment: {
    total: number;
    walletUsed: number;
    cardCharged: number;
    status: string;
  } | null;
  rating: number | null;
  tip: number | null;
}

export default function PrintableReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = params.id as string;
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rides/${rideId}/receipt`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load receipt");
        return r.json();
      })
      .then(setReceipt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rideId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <p className="text-red-500 text-sm">{error ?? "Receipt not found"}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const fare = receipt.fare ?? 0;
  const platformFee = receipt.platformFee ?? 0;
  const tip = receipt.tip ?? 0;
  const kinDiscount = receipt.isKinRide ? platformFee * 0.5 : 0;
  const total = receipt.payment?.total ?? fare;

  const rideDate = new Date(receipt.date);
  const formattedDate = rideDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = rideDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const stars = receipt.rating;

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-receipt { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        {/* Action buttons */}
        <div className="no-print max-w-lg mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Download PDF
          </button>
        </div>

        {/* Receipt */}
        <div className="print-receipt max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Kayu</span>
            </div>
            <h1 className="text-white/90 text-sm font-medium uppercase tracking-widest">Trip Receipt</h1>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Receipt number + date */}
            <div className="text-center space-y-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                #{receipt.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formattedDate}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formattedTime}</p>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* Route */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                  <div className="w-3 h-3 bg-green-400 rounded-full ring-4 ring-green-400/20" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Pickup</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{receipt.pickup}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-gray-200 dark:border-gray-700 h-4" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-indigo-500/20" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Dropoff</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{receipt.dropoff}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* Driver info */}
            {receipt.driver && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {receipt.driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{receipt.driver.name}</p>
                    {receipt.driver.driverProfile && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {receipt.driver.driverProfile.vehicleColor}{" "}
                        {receipt.driver.driverProfile.vehicleMake}{" "}
                        {receipt.driver.driverProfile.vehicleModel}
                        {" · "}
                        <span className="font-mono">{receipt.driver.driverProfile.licensePlate}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
              </>
            )}

            {/* Fare breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Fare Breakdown
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Trip fare</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">${fare.toFixed(2)}</span>
                </div>
                {platformFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Platform fee</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">${platformFee.toFixed(2)}</span>
                  </div>
                )}
                {receipt.isKinRide && kinDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Kin discount
                    </span>
                    <span className="font-medium">-${kinDiscount.toFixed(2)}</span>
                  </div>
                )}
                {tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Tip</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">${tip.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">Total Charged</span>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span>
            </div>

            {/* Payment method breakdown */}
            {receipt.payment && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
                {receipt.payment.walletUsed > 0 && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Wallet</span>
                    <span className="font-medium">${receipt.payment.walletUsed.toFixed(2)}</span>
                  </div>
                )}
                {receipt.payment.cardCharged > 0 && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Card</span>
                    <span className="font-medium">${receipt.payment.cardCharged.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-600">
                  <span>Payment status</span>
                  <span className="capitalize font-medium">{receipt.payment.status}</span>
                </div>
              </div>
            )}

            {/* Rating */}
            {stars !== null && (
              <>
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                <div className="text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
                    Your Rating
                  </p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg
                        key={n}
                        className={`w-5 h-5 ${n <= stars ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* Footer */}
            <div className="text-center space-y-1 pt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Thank you for riding with <span className="font-semibold text-indigo-600 dark:text-indigo-400">Kayu</span></p>
              <p className="text-[11px] text-gray-300 dark:text-gray-600">support@kayuride.com</p>
            </div>

            {/* Trip ID */}
            <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center font-mono">
              Trip ID: {receipt.id}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
