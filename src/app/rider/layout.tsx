"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRequestPage = pathname === "/rider/request";

  return (
    <>
      {!isRequestPage && <Navbar />}
      <main className={isRequestPage ? "" : "max-w-5xl mx-auto px-4 py-6"}>
        {children}
      </main>
    </>
  );
}
