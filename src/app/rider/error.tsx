"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RiderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {error.message?.slice(0, 200) || "An unexpected error occurred."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white transition hover:bg-indigo-700 flex items-center justify-center"
          >
            Try again
          </button>
          <Link href="/rider/request" className="inline-flex items-center min-h-[44px] px-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
