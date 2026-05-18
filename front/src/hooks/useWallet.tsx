"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import compiled from "@/lib/compiled.json";

interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  connect: () => Promise<any>;
  disconnect: () => void;
  vote: (contractAddress: string, choiceName: string) => Promise<any>;
  getBallots: () => Promise<any[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);

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
      
      // Ensure we are on Sepolia Testnet
      const SEPOLIA_CHAIN_ID = "0xaa36a7";
      const currentChainId = await eth.request({ method: "eth_chainId" });
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: "Sepolia test network",
                  rpcUrls: ["https://rpc.sepolia.org"],
                  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
      
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
      
      return { provider: p, signer: s, address: a };
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
    // Reloading is still the safest way to ensure state is completely cleared on disconnect in Next.js
    try {
      window.location.reload();
    } catch (e) {}
  }, []);

  const vote = useCallback(
    async (contractAddress: string, choiceName: string) => {
      if (!signer) throw new Error("Wallet not connected");
      const contract = new ethers.Contract(contractAddress, compiled.abi, signer);
      const tx = await contract.vote(ethers.encodeBytes32String(choiceName));
      return tx;
    },
    [signer]
  );

  const getBallots = useCallback(async () => {
    if (!provider && !signer) return [];
    const connection = signer || provider;
    
    try {
      const ballotsStr = localStorage.getItem("deployedBallots");
      if (!ballotsStr) return [];
      const ballots = JSON.parse(ballotsStr);

      const results = await Promise.all(
        ballots.map(async (b: any) => {
          try {
            const contract = new ethers.Contract(b.address, compiled.abi, connection);
            const [names, counts] = await contract.getAllResults();
            
            return {
              id: b.address, // Use address as ID
              title: b.title,
              options: names.map((n: string) => ethers.decodeBytes32String(n)),
              voteCounts: counts.map((c: any) => Number(c)),
            };
          } catch (e) {
            console.warn("Failed to fetch ballot", b.address, e);
            return null;
          }
        })
      );

      return results.filter((r) => r !== null);
    } catch (e) {
      console.error("getBallots failed", e);
      return [];
    }
  }, [provider, signer]);

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
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
