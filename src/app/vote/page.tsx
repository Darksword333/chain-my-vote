"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Ballot {
  id: string;
  title: string;
  options: string[];
  voteCounts: number[];
}

export default function VotePage() {
  const { getBallots, vote } = useWallet();
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [votingFor, setVotingFor] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const b = await getBallots();
      if (mounted) setBallots(b);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [getBallots]);

  const handleVote = async (contractAddress: string, choiceName: string) => {
    if (!idNumber || !/^\d+$/.test(idNumber)) {
        return alert("Please enter your exact numeric ID number first.");
    }

    try {
      setVotingFor(`${contractAddress}-${choiceName}`);
      await vote(contractAddress, choiceName, idNumber);
      alert("Vote submitted! Your Zero-Knowledge Proof was verified on-chain.");
    } catch (e: unknown) {
      const error = e as Error;
      alert("Failed to submit vote: " + (error?.message || String(e)));
    } finally {
      setVotingFor(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vote Anonymously (ZKP)</h1>
        <p className="text-muted-foreground mt-2">
          Your ID will be used to generate a local cryptographic proof. 
          The smart contract will verify the proof without ever knowing your identity.
        </p>
      </div>

      <Card className="mb-8 border-emerald-500/20 shadow-sm bg-emerald-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Your Identity</CardTitle>
          <CardDescription>Enter your registered ID card number to authenticate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            placeholder="e.g. 12345678" 
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="max-w-sm font-mono"
            type="password"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8">
            <div className="animate-spin size-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : ballots.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">No active ballots found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ballots.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <CardTitle>{b.title}</CardTitle>
                <CardDescription className="font-mono text-xs break-all">{b.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {b.options.map((opt, idx) => {
                    const isVoting = votingFor === `${b.id}-${opt}`;
                    return (
                        <Button 
                            key={idx} 
                            onClick={() => handleVote(b.id, opt)}
                            disabled={votingFor !== null}
                            variant="secondary"
                            className="flex-1 min-w-[120px]"
                        >
                        {isVoting ? "Generating Proof..." : opt}
                        </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">Back to Home</Link>
      </div>
    </div>
  );
}
