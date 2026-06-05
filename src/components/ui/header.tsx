"use client";

import WalletStatus from "@/components/ui/wallet-status";
import React from "react";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="text-lg font-semibold">Chain My Vote</div>
      <div>
        <WalletStatus />
      </div>
    </header>
  );
}
