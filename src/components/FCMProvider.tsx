"use client";

import { useSession } from "next-auth/react";
import { useFCMToken } from "@/lib/useFCMToken";

/**
 * Registers the device for FCM push notifications once the user is signed in.
 * Renders nothing — purely side-effect.
 */
export default function FCMProvider() {
  const { status } = useSession();
  // Only register when authenticated; the hook is a no-op if Firebase env vars are missing
  if (status !== "authenticated") return null;
  return <FCMTokenRegistrar />;
}

function FCMTokenRegistrar() {
  useFCMToken();
  return null;
}
