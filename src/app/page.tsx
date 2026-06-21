"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WalletStatus from "@/components/ui/wallet-status";
import { Button } from "@/components/ui/button";
import { Wallet, CheckSquare, ShieldCheck, Activity, Users, ArrowRight } from "lucide-react";
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
    <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col p-6 lg:p-8 animate-fade-in">
      <header className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-foreground text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text">
            Chain My Vote
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Élections décentralisées sécurisées par preuves Zero-Knowledge (ZKP) et entièrement sponsorisées.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Network state */}
        <Card className="transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Blockchain Network
            </CardTitle>
            <Activity className="size-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sepolia Testnet</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected ? "Connected and ready" : "Waiting for wallet connection"}
            </p>
          </CardContent>
        </Card>

        {/* Active Ballots */}
        <Card className="transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Elections
            </CardTitle>
            <CheckSquare className="size-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? stats.ballots : "-"}
            </div>
            {isConnected ? (
               <p className="text-xs text-muted-foreground mt-1">
                 Ballots active on-chain
               </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Connect to view active ballots
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total Votes */}
        <Card className="transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Votes Cast
            </CardTitle>
            <Users className="size-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? stats.votes : "-"}
            </div>
            {isConnected ? (
              <p className="text-xs text-muted-foreground mt-1">
                Anonymisés par Zero-Knowledge (ZKP)
              </p>
            ) : (
               <p className="text-xs text-muted-foreground mt-1">
                 Connect wallet to view results
               </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Action Box */}
      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-8 sm:p-12 text-center mt-6 flex flex-col items-center justify-center transition-all duration-300 hover:border-border-hover shadow-sm">
        {!isConnected ? (
          <>
            <div className="p-4 rounded-full bg-primary/10 mb-5 text-primary">
              <Wallet className="size-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">
              Authentication Required
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base leading-relaxed">
              Pour vérifier votre éligibilité tout en garantissant l'anonymat de votre vote et la résistance au double-vote, veuillez connecter votre portefeuille. Les frais de gaz sont entièrement pris en charge.
            </p>
            <WalletStatus className="scale-105" />
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-emerald-500/10 mb-5 text-emerald-500">
              <ShieldCheck className="size-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">
              Ready to Participate
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base leading-relaxed">
              Votre portefeuille est connecté. Vous pouvez voter anonymement dans les scrutins autorisés via des preuves ZKP locales, ou organiser une nouvelle élection. Tous les frais sont sponsorisés.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => router.push("/vote")} className="gap-2">
                Vote Now
                <ArrowRight className="size-4" />
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