"use client";

import Link from "next/link";
import WalletStatus from "@/components/ui/wallet-status";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { address, disconnect } = useWallet();

  const short = (addr?: string | null) => {
    if (!addr) return "Not connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Wallet</h2>
          <p className="text-sm text-muted-foreground mb-4">Connected account: <span className="font-mono">{short(address)}</span></p>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => disconnect()}>
              Disconnect
            </Button>
            <Link href="/" className="text-sm text-muted-foreground self-center">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
