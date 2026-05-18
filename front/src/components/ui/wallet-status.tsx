"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import React from "react";

export default function WalletStatus({ className }: { className?: string }) {
  const { address, connect } = useWallet();

  if (!address) {
    return (
      <Button onClick={() => connect()} className={className} variant="outline">
        <Wallet className="size-4" />
        Connect MetaMask
      </Button>
    );
  }

  return (
    <Badge variant="outline" className={`px-4 py-2 text-sm gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ${className || ""}`}>
      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
      Logged in : {address}
    </Badge>
  );
}
