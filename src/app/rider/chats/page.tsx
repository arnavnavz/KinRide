"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DirectChatView } from "@/components/DirectChatView";

export default function RiderChatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  if (status === "loading") {
    return <div className="text-center py-20 text-gray-400">Loading...</div>;
  }

  if (session?.user?.role !== "RIDER") {
    return <div className="text-center py-20 text-gray-500">This page is for riders only.</div>;
  }

  return <DirectChatView backHref="/rider/request" />;
}
