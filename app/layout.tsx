import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import AppWalletProvider from "@/components/AppWalletProvider";
import Script from "next/script";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Searchrot AI",
  description: "Terminal for the terminally online. Find the coins behind the brain rot.",
};

import { Analytics } from "@vercel/analytics/react";
import { AmbientBackground } from "@/components/AmbientBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans bg-[#050505] text-[#e0e0e0] min-h-screen antialiased selection:bg-[#9d00ff]/30 selection:text-[#d0ff00]`}>
        <AmbientBackground />
        <AppWalletProvider>{children}</AppWalletProvider>
        <Script src="https://terminal.jup.ag/main-v4.js" strategy="afterInteractive" />
        <Analytics />
      </body>
    </html>
  );
}
