import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SessionWrapper from "@/components/SessionWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import PWAInstallBanner from "@/components/PWAInstallBanner";

export const metadata: Metadata = {
  title: "Tiffin Tracker",
  description: "Track your daily tiffin meals and billing",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tiffin Tracker",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <SessionWrapper>
          <ThemeProvider>
            {/* Offline banner */}
            <div id="offline-banner" className="hidden fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm font-medium">
              📡 You are offline. Some features may not work.
            </div>
            <main className="max-w-lg mx-auto min-h-screen pb-20">
              {children}
            </main>
            <BottomNav />
            <PWAInstallBanner />
          </ThemeProvider>
        </SessionWrapper>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('online', function() {
                var b = document.getElementById('offline-banner');
                if (b) b.classList.add('hidden');
              });
              window.addEventListener('offline', function() {
                var b = document.getElementById('offline-banner');
                if (b) b.classList.remove('hidden');
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
