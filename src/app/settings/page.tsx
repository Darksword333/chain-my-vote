"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Globe, Settings2 } from "lucide-react";

export default function SettingsPage() {
  const { address, disconnect } = useWallet();
  const [ballots, setBallots] = useState<{ address: string; title: string }[]>([]);
  const [newAddr, setNewAddr] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const loadBallots = () => {
      const stored = localStorage.getItem("deployedBallots");
      if (stored && stored !== "undefined") {
        try {
          setBallots(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse deployedBallots from localStorage", e);
        }
      }
    };
    loadBallots();
  }, []);

  const saveBallots = (updated: { address: string; title: string }[]) => {
    setBallots(updated);
    localStorage.setItem("deployedBallots", JSON.stringify(updated));
    // Trigger a storage event for other components (like Vote/Results) to update if needed
    window.dispatchEvent(new Event("storage"));
  };

  const removeBallot = (addr: string) => {
    const filtered = ballots.filter((b) => b.address.toLowerCase() !== addr.toLowerCase());
    saveBallots(filtered);
  };

  const addBallot = () => {
    if (!newAddr.startsWith("0x") || newAddr.length !== 42) {
      return alert("Please enter a valid contract address.");
    }
    if (!newTitle.trim()) {
      return alert("Please enter a title for this contract.");
    }
    
    // Check if already exists
    if (ballots.some(b => b.address.toLowerCase() === newAddr.toLowerCase())) {
      return alert("This contract is already in your list.");
    }

    const updated = [...ballots, { address: newAddr, title: newTitle }];
    saveBallots(updated);
    setNewAddr("");
    setNewTitle("");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your wallet and contract lists.</p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Wallet Section */}
        <Card className="md:col-span-1 border-border/50 bg-card/50 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="size-4 text-emerald-500" />
              Wallet
            </CardTitle>
            <CardDescription>Network: Sepolia Testnet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Active Account</p>
              <p className="text-sm font-mono break-all">{address || "Disconnected"}</p>
            </div>
            <Button 
              variant="destructive" 
              className="w-full gap-2" 
              onClick={() => disconnect()}
              disabled={!address}
            >
              Disconnect Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Ballot Management */}
        <Card className="md:col-span-2 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="size-4 text-sky-500" />
              Ballot Management
            </CardTitle>
            <CardDescription>Add existing contracts or remove them from local storage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Existing */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="size-4" />
                Import Existing Contract
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input 
                  placeholder="Contract Title (e.g. My Vote)" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-background"
                />
                <Input 
                  placeholder="Contract Address (0x...)" 
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value)}
                  className="bg-background font-mono text-xs"
                />
              </div>
              <Button onClick={addBallot} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500">
                Add to List
              </Button>
            </div>

            {/* List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Tracked Ballots ({ballots.length})
              </h3>
              {ballots.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                  No contracts tracked locally.
                </div>
              ) : (
                <div className="grid gap-2">
                  {ballots.map((b) => (
                    <div 
                      key={b.address} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{b.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{b.address}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeBallot(b.address)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
