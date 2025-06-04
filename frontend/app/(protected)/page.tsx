"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedHome() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile as the default protected route
    router.replace("/profile");
  }, [router]);

  return null;
}