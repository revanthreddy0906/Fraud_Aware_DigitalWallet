import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import InteractiveBackground from "@/components/InteractiveBackground";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Money Square - Digital Wallet",
  description: "Money Square - India's secure digital wallet with AI-powered fraud detection, real-time alerts, and auto-freeze protection",
  keywords: ["digital wallet", "fraud detection", "secure payments", "UPI", "INR", "India"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased min-h-screen">
        <InteractiveBackground />
        {children}
      </body>
    </html>
  );
}
