import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import AppWalletProvider from "@/components/AppWalletProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "viralmint | Solana Only",
  description: "Find Solana tokens from TikTok and Instagram Reels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-green-500/30 selection:text-green-200`}>
        <AppWalletProvider>{children}</AppWalletProvider>
        <Script src="https://terminal.jup.ag/main-v4.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
