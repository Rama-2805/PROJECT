import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartCampus AI",
  description:
    "Enterprise AI platform for campus management — intelligent scheduling, resource optimization, and real-time analytics.",
  openGraph: {
    title: "SmartCampus AI",
    description:
      "Enterprise AI platform for campus management — intelligent scheduling, resource optimization, and real-time analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased selection:bg-ai-blue/30 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
