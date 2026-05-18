"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

export function useWallet() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!(window as any).ethereum) throw new Error("MetaMask not found");
      const p = new ethers.BrowserProvider((window as any).ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const a = await s.getAddress();
      setProvider(p);
      setSigner(s);
      setAddress(a);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);
      setContract(c);
      return { provider: p, signer: s, address: a, contract: c };
    } catch (e) {
      console.error("connect error", e);
      throw e;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Try to politely request permission revocation (not all wallets support this).
    try {
      const eth = (window as any).ethereum;
      if (eth?.request) {
        eth.request?.({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }

    setProvider(null);
    setSigner(null);
    setAddress(null);
    setContract(null);

    try {
      // Clear any stored flags we might have used
      localStorage.removeItem("connected_wallet_address");
    } catch (e) {}

    // Reload the page so the dApp fully resets its state (MetaMask still controls connection at extension level).
    try {
      window.location.reload();
    } catch (e) {}
  }, []);

  useEffect(() => {
    if ((window as any).ethereum && !provider) {
      const p = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(p);
      p.listAccounts().then((addrs) => {
        if (addrs.length > 0) {
          p.getSigner().then((s) => s.getAddress().then((a) => setAddress(a)));
        }
      });
    }
  }, [provider]);

  const vote = useCallback(
    async (ballotId: number, choice: number) => {
      if (!contract) throw new Error("Contract not connected");
      const tx = await contract.vote(ballotId, choice);
      return tx;
    },
    [contract]
  );

  const getBallots = useCallback(async () => {
    if (!contract) return [];
    try {
      const raw = await contract.getBallots();
      // Map to a friendly shape
      return raw.map((b: any) => ({ id: Number(b.id), title: b.title, options: b.options }));
    } catch (e) {
      console.warn("getBallots failed", e);
      return [];
    }
  }, [contract]);

  return {
    provider,
    signer,
    address,
    contract,
    connect,
    disconnect,
    vote,
    getBallots,
  };
}
