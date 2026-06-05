"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WalletStatus from "@/components/ui/wallet-status";
import { Button } from "@/components/ui/button";
import { Wallet, CheckSquare, ShieldCheck, Activity, Users } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function Home() {
  const router = useRouter();
  const { address, getBallots } = useWallet();
  const isConnected = Boolean(address);
  const [stats, setStats] = useState({ ballots: 0, votes: 0 });

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const b = await getBallots();
        if (!mounted) return;
        const totalVotes = b.reduce((acc, curr) => {
          return acc + curr.voteCounts.reduce((sum, count) => sum + count, 0);
        }, 0);
        setStats({ ballots: b.length, votes: totalVotes });
      } catch (e) {
        console.error(e);
      }
    };
    if (isConnected) {
        loadStats();
    }
    return () => { mounted = false; };
  }, [getBallots, isConnected]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 h-full flex flex-col p-8">
      <header className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">
            Chain My Vote
          </h1>
          <p className="text-muted-foreground mt-2">
            Secure & Anonymous Elections
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Network state */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Blockchain Network
            </CardTitle>
            <Activity className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sepolia Testnet</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected ? "Connected and ready" : "Waiting for the crypto wallet"}
            </p>
          </CardContent>
        </Card>

        {/* Active Ballots */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Active Elections
            </CardTitle>
            <CheckSquare className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? stats.ballots : "-"}
            </div>
            {isConnected ? (
               <p className="text-xs text-muted-foreground mt-1">
                 Ballots available on-chain
               </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Connect to view active ballots
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total Votes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
            <Users className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? stats.votes : "-"}
            </div>
            {isConnected ? (
              <p className="text-xs text-muted-foreground mt-1">
                Anonymized via Zero-Knowledge
              </p>
            ) : (
               <p className="text-xs text-muted-foreground mt-1">
                 Data hidden until connected
               </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center mt-8 flex flex-col items-center justify-center">
        {!isConnected ? (
          <>
            <Wallet className="size-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Authentication required
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              To ensure the secrecy of your vote and prevent double voting, please link your crypto wallet. Your ID will be requested at the time of voting to generate your ZK proof.
            </p>
            <WalletStatus />
          </>
        ) : (
          <>
            <ShieldCheck className="size-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              The ballot box is open
            </h2>
            <p className="text-muted-foreground mb-6">
              Your wallet is connected. You can now cast your vote anonymously using your ID card. Gas fees are sponsored.
            </p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => router.push("/vote")}>
                Vote Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push("/organize")}>
                Organize an Election
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}