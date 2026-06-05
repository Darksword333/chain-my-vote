"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Users, Clock } from "lucide-react";
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

    // Process whitelist (ID numbers)
    const idNumbers = whitelistInput
      .split(/\r?\n/)
      .map(id => id.trim())
      .filter(id => id.length > 0 && /^\d+$/.test(id)); // Allow only numeric strings

    if (idNumbers.length === 0) {
      return alert("Please provide at least one valid ID number (numeric).");
    }

    try {
      let activeSigner = signer;
      if (!address || !activeSigner) {
        const connRes = await connect();
        activeSigner = connRes.signer;
      }
      setDeploying(true);
      const res = await deployBallot(title, options, idNumbers, deadlineTimestamp, fundingAmount, activeSigner);
      setResult(res);
    } catch (e: unknown) {
      const error = e as Error;
      alert("Deployment failed: " + (error?.message || String(e)));
    } finally {
      setDeploying(false);
    }
  };

  const colorClasses = [
    "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "bg-sky-500/10 text-sky-500 border-sky-500/20",
    "bg-violet-500/10 text-violet-500 border-violet-500/20",
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Organize a Vote</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Ballot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ballot Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Best Framework 2024" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Clock className="size-4 text-sky-500" />
                Voting Deadline
              </label>
              <Input 
                type="datetime-local" 
                value={deadline} 
                onChange={(e) => setDeadline(e.target.value)} 
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                The date and time when the vote will be closed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gas Sponsorship Funding (ETH)</label>
              <Input 
                type="number" 
                step="0.005"
                min="0.001"
                value={fundingAmount} 
                onChange={(e) => setFundingAmount(e.target.value)} 
                placeholder="e.g. 0.02" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                This amount of ETH is deposited into the contract to fund voters' gas fees via Gelato Relay. Recommended: 0.02 ETH or more.
              </p>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="size-4 text-emerald-500" />
                  Authorized ID Cards (ZKP Merkle Tree)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                    <Upload className="size-4" />
                    Upload .txt
                  </Button>
                </div>
              </div>
              <Textarea 
                placeholder="Paste 8-digit ID numbers here, one per line (e.g., 12345678)" 
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                className="min-h-[120px] font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                These numeric IDs will be hashed into a Merkle Tree. Voters will use their exact ID to generate an anonymous Zero-Knowledge proof locally.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Options</label>
              <div className="grid grid-cols-1 gap-3">
                {options.map((opt, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-3 p-3 border rounded-2xl ${colorClasses[idx % colorClasses.length]}`}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{idx + 1}</Badge>
                      <div className="px-4 py-2 rounded-full bg-transparent">
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          className="bg-transparent border-0 p-0 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:border-transparent outline-none shadow-none rounded-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => removeOption(idx)} disabled={options.length <= 2} aria-label={`Remove option ${idx + 1}`} className="rounded-full">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <Button onClick={addOption} variant="ghost">
                  <Plus />
                  Add option
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleDeploy} disabled={deploying}>
                {deploying ? "Deploying..." : "Deploy Vote Contract"}
              </Button>
              <Link href="/" className="text-sm text-muted-foreground">Cancel</Link>
            </div>

            {result && (
              <div className="p-4 border rounded">
                <div>Deployed address: <span className="font-mono">{result.address}</span>{result.mocked ? " (mocked)" : ""}</div>
                {result.txHash && <div>Tx: <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noreferrer">{result.txHash}</a></div>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
