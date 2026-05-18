"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Users } from "lucide-react";
import { useDeployer } from "@/hooks/useDeployer";
import { useWallet } from "@/hooks/useWallet";
import WalletStatus from "@/components/ui/wallet-status";
import { Textarea } from "@/components/ui/textarea";

export default function OrganizePage() {
  const { address, connect, signer } = useWallet();
  const { deployBallot } = useDeployer();

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [whitelistInput, setWhitelistInput] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<any>(null);

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
    
    // Process whitelist
    const authorizedVoters = whitelistInput
      .split(/\r?\n/)
      .map(addr => addr.trim())
      .filter(addr => addr.startsWith("0x") && addr.length === 42);

    if (authorizedVoters.length === 0) {
      return alert("Please provide at least one valid authorized wallet address.");
    }

    try {
      let activeSigner = signer;
      if (!address || !activeSigner) {
        const connRes = await connect();
        activeSigner = connRes.signer;
      }
      setDeploying(true);
      const res = await deployBallot(title, options, authorizedVoters, activeSigner);
      setResult(res);
    } catch (e: any) {
      alert("Deployment failed: " + (e?.message || e));
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
              <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. Best Framework 2024" />
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="size-4 text-emerald-500" />
                  Authorized Voters (Whitelist)
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
                placeholder="Paste addresses here (0x...), one per line" 
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                className="min-h-[120px] font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Only these addresses will be allowed to vote in this contract.
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
                          onChange={(e: any) => updateOption(idx, e.target.value)}
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
