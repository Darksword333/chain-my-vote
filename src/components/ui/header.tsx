"use client";

import React from "react";
import WalletStatus from "@/components/ui/wallet-status";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
      <div className="text-sm font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2 select-none">
        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        Election Portal
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <WalletStatus />
      </div>
    </header>
  );
}
