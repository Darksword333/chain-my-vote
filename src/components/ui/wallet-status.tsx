"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, LogOut } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import React from "react";

export default function WalletStatus({ className }: { className?: string }) {
  const { address, connect, disconnect } = useWallet();

  if (!address) {
    return (
      <Button onClick={() => connect()} className={className} variant="outline">
        <Wallet className="size-4 mr-2" />
        Connect MetaMask
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Badge variant="outline" className="px-4 py-2 text-sm gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </Badge>
      <Button onClick={() => disconnect()} variant="ghost" size="icon" title="Disconnect Wallet">
        <LogOut className="size-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
