"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Vote, FileText, Loader2, ArrowRight, Copy, Check, ExternalLink, HelpCircle } from "lucide-react";
import { getGlobalBallots } from "@/lib/db";

interface DeployedBallot {
  address: string;
  title: string;
}

export default function BallotDiscoveryPage() {
  const [ballots, setBallots] = useState<DeployedBallot[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchBallots = async () => {
      try {
        setLoading(true);
        const data = await getGlobalBallots();
        if (mounted) setBallots(data);
      } catch (e) {
        console.error("Failed to fetch ballots from registry API", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBallots();
    return () => {
      mounted = false;
    };
  }, []);

  const copyToClipboard = (e: React.MouseEvent, address: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Vote className="size-8 text-primary" />
            Elections Hub
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Discover active cryptographic ballots deployed on Sepolia. Select an election to enter its voting booth, verify your eligibility, and submit your signature.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/organize">Create New Ballot</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Back</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 space-y-4">
          <Loader2 className="animate-spin size-9 text-primary" />
          <p className="text-sm text-muted-foreground">Retrieving active ballots from registry...</p>
        </div>
      ) : ballots.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-3xl bg-card/10 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="p-4 bg-muted/20 rounded-full text-muted-foreground">
            <FileText className="size-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No Ballots Found</h3>
            <p className="text-muted-foreground text-xs max-w-xs mx-auto">
              There are no voting contracts registered in the global index database.
            </p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/organize">Deploy a Voting Ballot</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ballots.map((b) => (
            <Card 
              key={b.address} 
              className="group border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      {b.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/75 border border-border/40 px-2 py-1 rounded-lg w-fit transition-colors">
                      <span className="font-mono">{truncateAddress(b.address)}</span>
                      <button
                        onClick={(e) => copyToClipboard(e, b.address)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        title="Copy contract address"
                      >
                        {copiedAddress === b.address ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                    Live
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  Cryptographic voting ballot deployed on Sepolia network. Contains on-chain whitelisted voters list.
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/45">
                  <a 
                    href={`https://sepolia.etherscan.io/address/${b.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Etherscan
                    <ExternalLink className="size-2.5" />
                  </a>
                  
                  <Button 
                    asChild 
                    size="sm" 
                    className="gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground group/btn"
                  >
                    <Link href={`/vote/${b.address}`}>
                      Enter Booth
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Help Panel */}
      <div className="p-5 rounded-2xl border border-border/40 bg-muted/10 text-xs text-muted-foreground flex gap-3 leading-relaxed">
        <HelpCircle className="size-5 text-muted-foreground/70 shrink-0" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground block">How it works</span>
          <p>
            When you enter a voting booth, the application connects directly to the smart contract on the Sepolia network. Whitelisted voters will be prompted to sign their choice using their private key. The cryptographic signature is sent to Gelato Relay, which pays the gas cost and writes the vote to the blockchain.
          </p>
        </div>
      </div>
    </div>
  );
}
