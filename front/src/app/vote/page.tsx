"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import WalletStatus from "@/components/ui/wallet-status";
import { Button } from "@/components/ui/button";

export default function VotePage() {
  const { address, connect, getBallots, vote } = useWallet();
  const [ballots, setBallots] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

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

  const handleVote = async (ballotId: number, optionIndex: number) => {
    try {
      await vote(ballotId, optionIndex);
      alert("Vote submitted (transaction sent). Check your wallet for confirmation.");
    } catch (e) {
      alert("Failed to submit vote: " + (e as any).message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vote</h1>
      </div>

      {loading ? (
        <div>Loading ballots...</div>
      ) : ballots.length === 0 ? (
        <div>No ballots found.</div>
      ) : (
        <div className="space-y-4">
          {ballots.map((b) => (
            <div key={b.id} className="border rounded p-4">
              <h2 className="font-semibold text-lg">{b.title}</h2>
              <div className="mt-2 flex gap-2">
                {b.options.map((opt: string, idx: number) => (
                  <Button key={idx} onClick={() => handleVote(b.id, idx)}>
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground">Back to Home</Link>
      </div>
    </div>
  );
}
