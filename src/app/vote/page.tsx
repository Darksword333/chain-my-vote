"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Vote, FileText, CheckCircle2, Loader2 } from "lucide-react";

interface Ballot {
  id: string;
  title: string;
  options: string[];
  voteCounts: number[];
}

export default function VotePage() {
  const { getBallots, vote, address } = useWallet();
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (!address) {
      return alert("Please connect your wallet first.");
    }

    try {
      setVotingFor(`${contractAddress}-${choiceName}`);
      await vote(contractAddress, choiceName);
      alert("Vote submitted successfully! Gas fees were fully sponsored.");
    } catch (e: unknown) {
      const error = e as Error;
      alert("Failed to submit vote: " + (error?.message || String(e)));
    } finally {
      setVotingFor(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Vote className="size-8 text-primary" />
            Wallet Voting Box
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cast your vote securely by signing with your wallet. Sponsoring is active.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">Back</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin size-8 text-primary" />
            <p className="text-sm text-muted-foreground">Fetching ballots on-chain...</p>
        </div>
      ) : !address ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/20 flex flex-col items-center justify-center p-6">
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">Please connect your wallet to view eligible ballots.</p>
        </div>
      ) : ballots.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/20 flex flex-col items-center justify-center p-6">
          <FileText className="size-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No active ballots discovered on-chain.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ballots.map((b) => (
            <Card key={b.id} className="transition-all duration-300 hover:shadow-md border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold tracking-tight">{b.title}</CardTitle>
                <CardDescription className="font-mono text-[10px] text-muted-foreground/60 break-all select-all">
                  {b.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {b.options.map((opt, idx) => {
                    const isVoting = votingFor === `${b.id}-${opt}`;
                    return (
                      <Button 
                        key={idx} 
                        onClick={() => handleVote(b.id, opt)}
                        disabled={votingFor !== null}
                        variant="outline"
                        className="flex items-center justify-between p-4 h-auto rounded-xl hover:bg-primary/5 hover:border-primary/40 transition-all text-left font-medium select-none group"
                      >
                        <span className="truncate pr-2">{opt}</span>
                        {isVoting ? (
                          <Loader2 className="animate-spin size-4 text-primary shrink-0" />
                        ) : (
                          <CheckCircle2 className="size-4 opacity-0 group-hover:opacity-100 text-primary shrink-0 transition-opacity" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
