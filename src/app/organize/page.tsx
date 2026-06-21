"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Users, Clock, Flame, ArrowRight } from "lucide-react";
import { useDeployer } from "@/hooks/useDeployer";
import { useWallet } from "@/hooks/useWallet";
import { Textarea } from "@/components/ui/textarea";

interface DeployResult {
  address: string;
  txHash: string | null;
  mocked?: boolean;
}

export default function OrganizePage() {
  const { address, connect, signer } = useWallet();
  const { deployBallot } = useDeployer();

  const [title, setTitle] = useState("");
  const [fundingAmount, setFundingAmount] = useState("0.02");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [whitelistInput, setWhitelistInput] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);

  const addOption = () => setOptions((s) => [...s, `Option ${s.length + 1}`]);
  const updateOption = (i: number, v: string) => setOptions((s) => s.map((x, idx) => (idx === i ? v : x)));
  const removeOption = (i: number) => setOptions((s) => s.filter((_, idx) => idx !== i));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setWhitelistInput(text);
    };
    reader.readAsText(file);
  };

  const handleDeploy = async () => {
    if (!title || options.length < 2) return alert("Provide a title and at least two options.");
    if (!deadline) return alert("Please set a voting deadline.");
    
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) return alert("Deadline must be in the future.");

    const secrets = whitelistInput
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && /^\d+$/.test(s));

    if (secrets.length === 0) {
      return alert("Veuillez fournir au moins un code secret valide (uniquement des chiffres, ex: 12345678).");
    }

    try {
      let activeSigner = signer;
      if (!address || !activeSigner) {
        const connRes = await connect();
        activeSigner = connRes.signer;
      }
      setDeploying(true);
      const res = await deployBallot(title, options, secrets, deadlineTimestamp, fundingAmount, activeSigner);
      setResult(res);
    } catch (e: unknown) {
      const error = e as Error;
      alert("Deployment failed: " + (error?.message || String(e)));
    } finally {
      setDeploying(false);
    }
  };

  const colorClasses = [
    "bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 border-amber-500/20",
    "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "bg-sky-500/5 hover:bg-sky-500/10 text-sky-500 border-sky-500/20",
    "bg-violet-500/5 hover:bg-violet-500/10 text-violet-500 border-violet-500/20",
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Organize an Election</h1>
          <p className="text-muted-foreground mt-1 text-sm">Set up a new ballot and sponsor voting gas fees.</p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">Back</Link>
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Ballot Details</CardTitle>
          <CardDescription>Fill in the configuration details of your ballot contract.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ballot Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Best Framework 2026" className="bg-background/50" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="size-4 text-sky-500" />
                  Voting Deadline
                </label>
                <Input 
                  type="datetime-local" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)} 
                  className="bg-background/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Flame className="size-4 text-amber-500 animate-pulse" />
                Gas Sponsorship Funding (ETH)
              </label>
              <Input 
                type="number" 
                step="0.005"
                min="0.001"
                value={fundingAmount} 
                onChange={(e) => setFundingAmount(e.target.value)} 
                placeholder="e.g., 0.02" 
                className="bg-background/50"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                This amount of ETH is deposited into the contract to sponsor your voters' transactions via Gelato. Recommended: 0.02 ETH.
              </p>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-4 text-emerald-500" />
                  Codes Secrets des Votants (ZKP Merkle Tree)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <Button variant="outline" size="sm" className="gap-2 hover:bg-accent cursor-pointer">
                    <Upload className="size-4" />
                    Upload .txt
                  </Button>
                </div>
              </div>
              <Textarea 
                placeholder="Saisissez les codes secrets numériques des électeurs autorisés, un par ligne (ex: 12345678)" 
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                className="min-h-[120px] font-mono text-xs bg-background/30 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                Fournissez des codes numériques (ex: identifiants uniques à 8 chiffres). Ils seront hachés localement dans l'arbre de Merkle ZKP. Conservez ces codes confidentiellement pour les transmettre à vos votants.
              </p>
            </div>

            <div className="pt-6 border-t border-border">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Election Options</label>
              <div className="grid grid-cols-1 gap-3">
                {options.map((opt, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-3 p-3 border rounded-xl transition-all duration-200 ${colorClasses[idx % colorClasses.length]}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        className="bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:border-transparent outline-none shadow-none h-auto py-1"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeOption(idx)} 
                      disabled={options.length <= 2} 
                      aria-label={`Remove option ${idx + 1}`}
                      className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button onClick={addOption} variant="ghost" size="sm" className="gap-1.5">
                  <Plus className="size-4" />
                  Add Option
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button onClick={handleDeploy} disabled={deploying} className="shadow-sm">
                {deploying ? "Deploying..." : "Deploy Ballot Contract"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Cancel</Link>
              </Button>
            </div>

            {result && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 mt-4">
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Ballot Deployed Successfully!</div>
                <div className="text-xs">Contract Address: <span className="font-mono text-foreground break-all">{result.address}</span></div>
                {result.txHash && (
                  <div className="text-xs">
                    Transaction: <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono break-all">{result.txHash}</a>
                  </div>
                )}
                <div className="pt-1">
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm">
                    <Link href={`/vote/${result.address}`}>
                      Go to Voting Booth
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
