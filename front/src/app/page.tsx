"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, CheckSquare, ShieldCheck, Activity, Zap } from "lucide-react";

export default function Home() {
  // States
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const router = useRouter();

  // Fonction factice pour l'interface (à remplacer par la vraie logique ethers/web3.js)
  const handleConnect = () => {
    setIsConnected(true);
    setWalletAddress("0x71C...976F");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 h-full flex flex-col p-8">
      <header className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">
            Chain My Vote
          </h1>
          <p className="text-muted-foreground mt-2">
            Elections
          </p>
        </div>
        
        {/* MetaMask connect */}
        {!isConnected ? (
          <Button onClick={handleConnect} className="gap-2">
            <Wallet className="size-4" />
            Connect MetaMask
          </Button>
        ) : (
          <Badge variant="outline" className="px-4 py-2 text-sm gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Logged in : {walletAddress}
          </Badge>
        )}
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
            <div className="text-2xl font-bold">Sepolia</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected ? "Connected to the network" : "Waiting for the crypto wallet"}
            </p>
          </CardContent>
        </Card>

        {/* ZKP */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Anonymous Status
            </CardTitle>
            <ShieldCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? "Protected" : "Inactive"}
            </div>
            {isConnected ? (
              <Badge variant="secondary" className="mt-1">
                ZKP proof generated
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Identity not verified
              </p>
            )}
          </CardContent>
        </Card>

        {/* Paymaster */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Voting Fees</CardTitle>
            <Zap className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00 ETH</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Active Paymaster
            </p>
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
              To ensure the secrecy of your vote and prevent double voting, please link your crypto wallet.
            </p>
            <Button onClick={handleConnect} variant="outline">
              Connect my Wallet
            </Button>
          </>
        ) : (
          <>
            <CheckSquare className="size-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              The ballot box is open
            </h2>
            <p className="text-muted-foreground mb-6">
              Your identity has been verified. You can now cast your vote in complete confidence.
            </p>
            <Button size="lg" onClick={() => router.push("/vote")}>
              Access the ballots
            </Button>
          </>
        )}
      </div>
    </div>
  );
}