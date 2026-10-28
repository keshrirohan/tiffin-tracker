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
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.png",
  },
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
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
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
            <div id="offline-banner" className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm font-medium" style={{display:'none'}}>
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
              (function() {
                function updateBanner() {
                  var b = document.getElementById('offline-banner');
                  if (!b) return;
                  b.style.display = navigator.onLine ? 'none' : 'block';
                }
                updateBanner();
                window.addEventListener('online', updateBanner);
                window.addEventListener('offline', updateBanner);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
