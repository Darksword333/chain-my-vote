"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  contract: ethers.Contract | null;
  connect: () => Promise<any>;
  disconnect: () => void;
  vote: (ballotId: number, choice: number) => Promise<any>;
  getBallots: () => Promise<any[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const initEthers = useCallback(async (ethProvider: any) => {
    try {
      const p = new ethers.BrowserProvider(ethProvider);
      setProvider(p);
      const accounts = await p.listAccounts();
      if (accounts.length > 0) {
        const s = await p.getSigner();
        const a = await s.getAddress();
        setSigner(s);
        setAddress(a);
        const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);
        setContract(c);
      }
    } catch (error) {
      console.error("Failed to initialize ethers", error);
    }
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (eth) {
      const isConnected = localStorage.getItem("walletConnected") === "true";
      if (isConnected) {
        initEthers(eth);
      }

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // Disconnected
          localStorage.removeItem("walletConnected");
          setProvider(null);
          setSigner(null);
          setAddress(null);
          setContract(null);
        } else {
          initEthers(eth);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [initEthers]);

  const connect = useCallback(async () => {
    try {
      if (!(window as any).ethereum) throw new Error("MetaMask not found");
      const eth = (window as any).ethereum;
      
      // Force MetaMask to open the account selection dialog
      await eth.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      
      await initEthers(eth);
      
      localStorage.setItem("walletConnected", "true");
      
      // Let's get the values immediately to return them, even though state updates will follow
      const p = new ethers.BrowserProvider(eth);
      const s = await p.getSigner();
      const a = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);
      
      return { provider: p, signer: s, address: a, contract: c };
    } catch (e) {
      console.error("connect error", e);
      throw e;
    }
  }, [initEthers]);

  const disconnect = useCallback(() => {
    localStorage.removeItem("walletConnected");
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setContract(null);
    // Reloading is still the safest way to ensure state is completely cleared on disconnect in Next.js
    try {
      window.location.reload();
    } catch (e) {}
  }, []);

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
      return raw.map((b: any) => ({ id: Number(b.id), title: b.title, options: b.options }));
    } catch (e) {
      console.warn("getBallots failed", e);
      return [];
    }
  }, [contract]);

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        contract,
        connect,
        disconnect,
        vote,
        getBallots,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
