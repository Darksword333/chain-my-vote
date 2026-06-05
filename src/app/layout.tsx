// Imports
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import Script from "next/script";

// Lazy load
const Sidebar = dynamic(() => import("@/app/_components/layout/sidebar"), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-xl" />,
});

import Header from "@/components/ui/header";
import { WalletProvider } from "@/hooks/useWallet";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chain My Vote",
  description: "Personal operating system by Shawn Franceus",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground flex h-screen overflow-hidden`}
        suppressHydrationWarning={true}
      >
        <Script src="/snarkjs.min.js" strategy="beforeInteractive" />
        <WalletProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-4">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
