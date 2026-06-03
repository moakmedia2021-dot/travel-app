import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/ui/Toaster";
import PosthogProvider from "@/components/PosthogProvider";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GetGoin",
    template: "%s · GetGoin",
  },
  description: "Plan trips together, find your people, and book the trip. GetGoin.",
  appleWebApp: {
    capable: true,
    title: "GetGoin",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Suspense fallback={null}>
          <PosthogProvider>{children}</PosthogProvider>
        </Suspense>
        <Toaster />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
