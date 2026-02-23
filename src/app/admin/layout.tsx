"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") return null;
  if (session?.user?.role !== "ADMIN") return null;

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
