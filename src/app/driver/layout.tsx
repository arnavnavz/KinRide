"use client";

import { Navbar } from "@/components/Navbar";
import { DriverNotificationGate } from "@/components/DriverNotificationGate";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <DriverNotificationGate>
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      </DriverNotificationGate>
    </>
  );
}
