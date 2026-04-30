import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vision Consulting Group | Client Portal",
  description: "Premium Insurance & Financial Strategy Portal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VCG Portal",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>{children}</body>
    </html>
  );
}
