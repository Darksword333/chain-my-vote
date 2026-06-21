"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Contract } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Vote, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  ShieldCheck, 
  ShieldAlert,
  ChevronLeft,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Award,
  ClipboardCheck
} from "lucide-react";
import compiled from "@/lib/compiled.json";
import { poseidon2 } from "poseidon-lite";

interface BallotDetail {
  id: string;
  title: string;
  options: string[];
  voteCounts: number[];
}

export default function SingleBallotPageClient() {
  const params = useParams();
  const router = useRouter();
  const contractAddress = params.contractAddress as string;
  
  const { provider, signer, address, vote, getBallot } = useWallet();
  
  const [ballot, setBallot] = useState<BallotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User status states
  const [secretCode, setSecretCode] = useState("");
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [userHasVoted, setUserHasVoted] = useState<boolean | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadBallotData = useCallback(async () => {
    if (!contractAddress) return;
    
    // Check if the address looks like a valid contract address
    if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      setError("Invalid contract address format.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch basic ballot details (title, options, counts)
      const data = await getBallot(contractAddress);
      setBallot(data);

      // 2. Query other contract variables directly if provider/signer is available
      const connection = signer || provider;
      if (connection) {
        const contract = new Contract(contractAddress, compiled.abi, connection);
        
        // Fetch deadline
        const deadlineVal = await contract.votingDeadline();
        const deadlineNum = Number(deadlineVal);
        setDeadline(deadlineNum);
        
        const now = Math.floor(Date.now() / 1000);
        setIsExpired(now >= deadlineNum);

        // Fetch nullifier check if secret is provided and valid
        if (secretCode && /^\d+$/.test(secretCode)) {
          const ballotsZkDataStr = localStorage.getItem("ballotsZkData") || "{}";
          const ballotsZkData = JSON.parse(ballotsZkDataStr);
          const zkData = ballotsZkData[contractAddress];
          if (zkData) {
            try {
              const nullifier = poseidon2([BigInt(zkData.externalNullifier), BigInt(secretCode)]);
              const voted = await contract.nullifierHashes(nullifier.toString());
              setUserHasVoted(voted);
            } catch (err) {
              console.error("Failed to check nullifier hashes on-chain", err);
            }
          }
        }
      }
    } catch (e: any) {
      console.error("Failed to load ballot details:", e);
      setError(e.message || "Failed to load contract details. Ensure you are on Sepolia Testnet.");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, getBallot, provider, signer, secretCode]);

  useEffect(() => {
    loadBallotData();
  }, [loadBallotData]);

  // Check secret code eligibility when it changes
  useEffect(() => {
    const checkEligibility = async () => {
      if (!contractAddress || !secretCode || !/^\d+$/.test(secretCode)) {
        setIsWhitelisted(null);
        setUserHasVoted(null);
        return;
      }

      try {
        const ballotsZkDataStr = localStorage.getItem("ballotsZkData") || "{}";
        const ballotsZkData = JSON.parse(ballotsZkDataStr);
        const zkData = ballotsZkData[contractAddress];

        if (zkData && zkData.secrets) {
          const secrets = zkData.secrets as string[];
          const inTree = secrets.includes(secretCode);
          setIsWhitelisted(inTree);

          if (inTree) {
            const connection = signer || provider;
            if (connection) {
              const contract = new Contract(contractAddress, compiled.abi, connection);
              const nullifier = poseidon2([BigInt(zkData.externalNullifier), BigInt(secretCode)]);
              const voted = await contract.nullifierHashes(nullifier.toString());
              setUserHasVoted(voted);
            }
          } else {
            setUserHasVoted(false);
          }
        } else {
          setIsWhitelisted(false);
          setUserHasVoted(false);
        }
      } catch (err) {
        console.error("Error checking secret eligibility:", err);
      }
    };
    checkEligibility();
  }, [contractAddress, secretCode, signer, provider]);

  const handleVote = async (choiceName: string) => {
    if (!address) {
      return alert("Please connect your wallet first.");
    }
    if (!secretCode || !/^\d+$/.test(secretCode)) {
      return alert("Please provide a valid secret code.");
    }
    if (isExpired) {
      return alert("This voting ballot has expired.");
    }
    if (isWhitelisted === false) {
      return alert("Your secret code is not whitelisted for this election.");
    }
    if (userHasVoted) {
      return alert("Your secret code has already been used to vote.");
    }

    try {
      setVotingFor(choiceName);
      await vote(contractAddress, choiceName, secretCode);
      alert("Vote submitted successfully! Gas fees were fully sponsored and ZK Proof generated.");
      setSecretCode(""); // clear secret code
      await loadBallotData();
    } catch (e: unknown) {
      const errorVal = e as Error;
      alert("Failed to submit vote: " + (errorVal?.message || String(e)));
    } finally {
      setVotingFor(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colors = [
    "from-indigo-500 to-sky-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-pink-500",
    "from-violet-500 to-purple-500",
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin size-10 text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to contract on Sepolia...</p>
      </div>
    );
  }

  if (error || !ballot) {
    return (
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 font-medium">
            <Link href="/vote">
              <ChevronLeft className="size-4" />
              Back to Elections
            </Link>
          </Button>
        </div>
        <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
          <CardHeader>
            <CardTitle className="text-destructive">Ballot Load Error</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              {error || "We couldn't connect to the voting contract. Make sure you have MetaMask installed, connected to Sepolia, and that this contract address is correct."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button onClick={loadBallotData} className="gap-2">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalVotes = ballot.voteCounts.reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...ballot.voteCounts);
  const leadingOptions = ballot.options.filter(
    (_, idx) => ballot.voteCounts[idx] === maxVotes && maxVotes > 0
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 hover:bg-muted/50 font-medium">
          <Link href="/vote">
            <ChevronLeft className="size-4" />
            Back to Elections
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={loadBallotData} className="gap-1.5 font-medium">
          Refresh On-Chain Data
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Sepolia Testnet
            </span>
            {isExpired ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                <Clock className="size-3" />
                Ended
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <Clock className="size-3 animate-pulse" />
                Active
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">
              ZKP & Gasless
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{ballot.title}</h1>
          
          <div className="flex items-center gap-2 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-xl px-3 py-1.5 w-fit transition-colors group">
            <span className="font-mono text-xs text-muted-foreground select-all break-all pr-1">
              {contractAddress}
            </span>
            <button 
              onClick={copyToClipboard}
              className="text-muted-foreground/60 hover:text-foreground p-1 rounded-md transition-colors shrink-0"
              title="Copy Contract Address"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 md:text-right">
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Total Votes Deployed</span>
          <span className="text-4xl font-extrabold text-foreground">{totalVotes}</span>
          <span className="text-xs text-muted-foreground">Verified cryptographically</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Vote className="size-5 text-primary" />
                Cast Your Vote
              </CardTitle>
              <CardDescription>
                Submit your ZK Proof anonymously. The Gelato network will execute the transaction on-chain for free.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
              
              {/* Voter Status Banner */}
              {!address ? (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-sm flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Wallet Disconnected</span>
                    Connect your web3 wallet to verify eligibility and cast your vote on-chain.
                  </div>
                </div>
              ) : isExpired ? (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Election Expired</span>
                    The deadline for this vote has passed. Voting is closed.
                  </div>
                </div>
              ) : !secretCode ? (
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-muted-foreground text-sm flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5 text-sky-500 animate-pulse" />
                  <div>
                    <span className="font-semibold block mb-0.5">Secret Code Required</span>
                    Enter your secret voter code below to verify eligibility.
                  </div>
                </div>
              ) : isWhitelisted === null ? (
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-muted-foreground text-sm flex items-start gap-3">
                  <Loader2 className="size-5 shrink-0 mt-0.5 animate-spin text-primary" />
                  <div>
                    <span className="font-semibold block mb-0.5">Verifying Voter Status...</span>
                    Generating identity hash and checking in the Merkle Tree...
                  </div>
                </div>
              ) : isWhitelisted === false ? (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Not Whitelisted</span>
                    Your secret code is not whitelisted to vote in this ballot.
                  </div>
                </div>
              ) : userHasVoted ? (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Vote Already Cast</span>
                    This secret code has already been used to vote (nullifier hash detected on-chain).
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-3">
                  <ShieldCheck className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Eligible Voter</span>
                    Your secret code is valid! Select an option below to generate your ZK Proof and vote.
                  </div>
                </div>
              )}

              {/* Secret Code Input Section */}
              {address && !isExpired && (
                <div className="space-y-2 p-4 bg-muted/20 border border-border/40 rounded-xl">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Voter Secret Code
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your secret numeric code (e.g. 12345678)"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
                  />
                  {/* Demo helper to show secrets if available in localStorage */}
                  {(() => {
                    const ballotsZkDataStr = localStorage.getItem("ballotsZkData") || "{}";
                    const ballotsZkData = JSON.parse(ballotsZkDataStr);
                    const zkData = ballotsZkData[contractAddress];
                    if (zkData && zkData.secrets && zkData.secrets.length > 0) {
                      return (
                        <p className="text-[10px] text-amber-500/90 mt-2 leading-normal">
                          💡 <strong>Demo Helper:</strong> Authorised secrets for testing:{" "}
                          <span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded text-amber-400">
                            {zkData.secrets.join(", ")}
                          </span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {deadline && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-medium uppercase tracking-wider">Deadline</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="size-3.5 text-sky-500" />
                      {new Date(deadline * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-medium uppercase tracking-wider">Anonymity</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      Zero-Knowledge Proofs
                    </span>
                  </div>
                </div>
              )}

              {/* Voting Options Grid */}
              <div className="space-y-3 pt-2">
                {ballot.options.map((opt, idx) => {
                  const isVoting = votingFor === opt;
                  const isInteractionDisabled = 
                    votingFor !== null || 
                    !address || 
                    !secretCode ||
                    isWhitelisted === false || 
                    userHasVoted === true || 
                    isExpired;

                  return (
                    <Button
                      key={idx}
                      onClick={() => handleVote(opt)}
                      disabled={isInteractionDisabled}
                      variant={userHasVoted ? "secondary" : "outline"}
                      className={`w-full flex items-center justify-between p-4 h-auto rounded-xl transition-all duration-300 font-medium select-none text-left border relative group overflow-hidden ${
                        userHasVoted ? "border-border" : "hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <span className="truncate pr-4 z-10">{opt}</span>
                      {isVoting ? (
                        <Loader2 className="animate-spin size-4 text-primary shrink-0 z-10" />
                      ) : userHasVoted ? (
                        <CheckCircle2 className="size-4 text-muted-foreground shrink-0 z-10" />
                      ) : (
                        <CheckCircle2 className="size-4 opacity-0 group-hover:opacity-100 text-primary shrink-0 transition-opacity z-10" />
                      )}
                    </Button>
                  );
                })}
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <TrendingUp className="size-5 text-emerald-500" />
                Live Standings
              </CardTitle>
              <CardDescription>
                Real-time vote distribution calculated directly on-chain.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
              
              {totalVotes > 0 && leadingOptions.length > 0 && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                  <Award className="size-5 shrink-0 text-emerald-500" />
                  <div>
                    <span className="font-semibold block uppercase tracking-wider text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Current Leader</span>
                    <span className="font-bold text-sm block">{leadingOptions.join(" & ")}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {ballot.options.map((opt, idx) => {
                  const votes = ballot.voteCounts[idx] || 0;
                  const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                  const colorGradient = colors[idx % colors.length];

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">{opt}</span>
                        <span className="font-bold text-foreground">
                          {votes} {votes === 1 ? "vote" : "votes"} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-muted/55 h-2.5 rounded-full overflow-hidden border border-border/20">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colorGradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalVotes === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 border border-dashed rounded-2xl bg-muted/15">
                  <ClipboardCheck className="size-8 text-muted-foreground/50" />
                  <p className="text-xs font-medium">No votes registered yet.</p>
                  <p className="text-[10px] max-w-[200px] leading-relaxed">Be the first to cast an anonymous Zero-Knowledge vote!</p>
                </div>
              )}

              <div className="pt-4 border-t border-border/40 text-[10px] text-muted-foreground/80 leading-relaxed">
                Voting on Sepolia uses Zero-Knowledge Proofs (ZKP) to ensure voter anonymity. The Gelato relay sponsor pays the gas fee, and the contract handles on-chain verification of the proof.
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
