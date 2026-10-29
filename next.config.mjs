/** @type {import('next').NextConfig} */
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  // Inject our custom push notification handler into the generated SW
  importScripts: ["/sw-custom.js"],
});

const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
