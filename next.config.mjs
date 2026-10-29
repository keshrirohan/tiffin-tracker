/** @type {import('next').NextConfig} */
import withPWAInit from "next-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  // Merge custom push notification handler into the generated SW
  customWorkerSrc: path.join(__dirname, "src", "sw-push.js"),
});

const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
