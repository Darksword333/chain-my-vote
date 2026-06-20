"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { 
  BrowserProvider, 
  Contract, 
  encodeBytes32String, 
  decodeBytes32String, 
  Interface,
  solidityPackedKeccak256,
  getBytes,
  type Eip1193Provider,
  type Signer
} from "ethers";
import compiled from "@/lib/compiled.json";
import { getGlobalBallots } from "@/lib/db";

interface BallotResult {
  id: string;
  title: string;
  options: string[];
  voteCounts: number[];
}

interface WalletContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  address: string | null;
  connect: () => Promise<{ provider: BrowserProvider; signer: Signer; address: string }>;
  disconnect: () => void;
  vote: (contractAddress: string, choiceName: string) => Promise<{ taskId: string }>;
  getBallots: () => Promise<BallotResult[]>;
  getBallot: (contractAddress: string) => Promise<BallotResult>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const initEthers = useCallback(async (ethProvider: Eip1193Provider) => {
    try {
      const p = new BrowserProvider(ethProvider);
      setProvider(p);
      const accounts = await p.listAccounts();
      if (accounts.length > 0) {
        const s = await p.getSigner();
        const a = await s.getAddress();
        setSigner(s);
        setAddress(a);
      }
    } catch (error) {
      console.error("Error initializing ethers:", error);
    }
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum as Eip1193Provider | undefined;
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

      (eth as any).on?.("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
      (eth as any).on?.("chainChanged", handleChainChanged as (...args: unknown[]) => void);

      return () => {
        (eth as any).removeListener?.("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
        (eth as any).removeListener?.("chainChanged", handleChainChanged as (...args: unknown[]) => void);
      };
    }
  }, [initEthers]);

  const connect = useCallback(async () => {
    try {
      const eth = (window as any).ethereum as Eip1193Provider | undefined;
      if (!eth) throw new Error("MetaMask not found");
      
      // Ensure we are on Sepolia Testnet
      const SEPOLIA_CHAIN_ID = "0xaa36a7";
      const currentChainId = await eth.request?.({ method: "eth_chainId" });
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        try {
          await eth.request?.({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError: unknown) {
          const sError = switchError as { code: number };
          if (sError.code === 4902) {
            await eth.request?.({
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
      
      // Force account selection via permissions
      await eth.request?.({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      await eth.request?.({ method: "eth_requestAccounts" });
      
      await initEthers(eth);
      
      localStorage.setItem("walletConnected", "true");
      
      const p = new BrowserProvider(eth);
      const s = await p.getSigner();
      const a = await s.getAddress();
      
      return { provider: p, signer: s, address: a };
    } catch (e) {
      console.error("Connection error:", e);
      throw e;
    }
  }, [initEthers]);

  const disconnect = useCallback(() => {
    localStorage.removeItem("walletConnected");
    setProvider(null);
    setSigner(null);
    setAddress(null);
    try {
      window.location.reload();
    } catch (e) {
      console.error("Reload failed:", e);
    }
  }, []);

  const vote = useCallback(
    async (contractAddress: string, choiceName: string) => {
      if (!signer || !address) throw new Error("Wallet not connected!");

      // 1. Compute message hash exactly like the smart contract:
      // keccak256(abi.encodePacked(choiceName, address(this)))
      const encodedChoice = encodeBytes32String(choiceName);
      const messageHash = solidityPackedKeccak256(
        ["bytes32", "address"],
        [encodedChoice, contractAddress]
      );

      console.log("Signing choice payload with wallet...", { choiceName, messageHash });
      
      // 2. Request signature of the binary message (EIP-191 personal_sign)
      const signature = await signer.signMessage(getBytes(messageHash));
      console.log("Signature generated:", signature);

      const contractInterface = new Interface(compiled.abi);
      
      // Encode function data: vote(bytes32 choiceName, bytes signature)
      const data = contractInterface.encodeFunctionData("vote", [
          encodedChoice,
          signature
      ]);

      try {
        console.log("Attempting Gelato SyncFee call...");
        
        const request = {
          chainId: 11155111,
          target: contractAddress,
          data: data,
          feeToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          isRelayContext: true
        };

        const response = await fetch("https://relay.gelato.digital/relays/v2/call-with-sync-fee", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
          if (!response.ok) throw new Error(result.message || "Gelato SyncFee Error");
          console.log("Vote sent via Gelato! Task ID:", result.taskId);
          return result as { taskId: string };
        } catch {
          console.warn("Gelato Relay unavailable or failed. Falling back to direct transaction...");
          // Fallback to direct transaction
          const tx = await signer.sendTransaction({
            to: contractAddress,
            data: data
          });
          console.log("Vote sent directly! Hash:", tx.hash);
          return { taskId: tx.hash };
        }
      } catch (err) {
        console.error("Error during voting:", err);
        throw err;
      }
    },
    [signer, address]
  );

  const getBallots = useCallback(async () => {
    if (!provider && !signer) return [];
    const connection = signer || provider;
    
    try {
      const ballots = await getGlobalBallots();

      const results = await Promise.all(
        ballots.map(async (b) => {
          try {
            const contract = new Contract(b.address, compiled.abi, connection);
            const rawResults = await contract.getAllResults();
            const [names, counts] = rawResults as [string[], bigint[]];
            
            return {
              id: b.address,
              title: b.title,
              options: names.map((n: string) => decodeBytes32String(n)),
              voteCounts: counts.map((c) => Number(c)),
            };
          } catch (e) {
            console.warn("Failed to fetch ballot", b.address, e);
            return null;
          }
        })
      );

      return results.filter((r): r is BallotResult => r !== null);
    } catch (e) {
      console.error("getBallots failed:", e);
      return [];
    }
  }, [provider, signer]);

  const getBallot = useCallback(async (contractAddress: string) => {
    if (!provider && !signer) throw new Error("Wallet not connected!");
    const connection = signer || provider;

    try {
      // Find ballot title in global registry
      const ballots = await getGlobalBallots();
      let title = "Unknown Ballot";
      const match = ballots.find(
        (b) => b.address.toLowerCase() === contractAddress.toLowerCase()
      );
      if (match) {
        title = match.title;
      }

      const contract = new Contract(contractAddress, compiled.abi, connection);
      const rawResults = await contract.getAllResults();
      const [names, counts] = rawResults as [string[], bigint[]];

      return {
        id: contractAddress,
        title: title,
        options: names.map((n: string) => decodeBytes32String(n)),
        voteCounts: counts.map((c) => Number(c)),
      };
    } catch (e) {
      console.error(`getBallot failed for address ${contractAddress}:`, e);
      throw e;
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
        getBallot,
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
