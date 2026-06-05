"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { 
  BrowserProvider, 
  Contract, 
  encodeBytes32String, 
  decodeBytes32String, 
  Interface,
  keccak256,
  type Eip1193Provider,
  type Signer
} from "ethers";
import compiled from "@/lib/compiled.json";
import { createMerkleTree } from "@/lib/zkp";

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
  vote: (contractAddress: string, choiceName: string, idNumber: string) => Promise<{ taskId: string }>;
  getBallots: () => Promise<BallotResult[]>;
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
    // Reloading is still the safest way to ensure state is completely cleared on disconnect in Next.js
    try {
      window.location.reload();
    } catch (e) {
      console.error("Reload failed:", e);
    }
  }, []);

  const vote = useCallback(
    async (contractAddress: string, choiceName: string, idNumber: string) => {
      if (!signer || !address) throw new Error("Wallet not connected!");
      
      const snarkjs = (window as any).snarkjs;
      if (!snarkjs) {
        throw new Error("ZK Proof library not loaded yet.");
      }

      // Retrieve local ZK data (the tree configuration created by the organizer)
      const ballotsZkDataStr = localStorage.getItem("ballotsZkData") || "{}";
      const ballotsZkData = JSON.parse(ballotsZkDataStr);
      const zkData = ballotsZkData[contractAddress];

      if (!zkData) {
        throw new Error("ZK Tree data not found for this ballot. Ensure you are using a ballot created with the new ZK system.");
      }

      // Reconstruct the tree
      const idNumbers = zkData.idNumbers as string[];
      const idIndex = idNumbers.indexOf(idNumber);
      
      if (idIndex === -1) {
        throw new Error("Your ID number is not authorized to vote in this ballot.");
      }

      const tree = await createMerkleTree(idNumbers);
      const proofElements = tree.getProof(idIndex);

      // Compute signalHash exactly like the smart contract: uint256(keccak256(abi.encodePacked(choiceName))) >> 8
      const encodedChoice = encodeBytes32String(choiceName);
      // We need to hash the bytes32 value. In solidity `abi.encodePacked(bytes32)` is just the bytes.
      const keccakHash = keccak256(encodedChoice);
      const signalHash = (BigInt(keccakHash) >> BigInt(8)).toString();

      // Input for the circom circuit
      const circuitInput = {
        idCardNumber: idNumber,
        treePathIndices: proofElements.pathIndices,
        treeSiblings: proofElements.siblings.map(s => s.toString()),
        signalHash: signalHash,
        externalNullifier: zkData.externalNullifier
      };

      console.log("Generating ZK Proof...", circuitInput);
      
      // We expect the user to have generated circuit.wasm and circuit_final.zkey in public/zk/
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          circuitInput, 
          "/zk/circuit.wasm", 
          "/zk/circuit_final.zkey"
      );

      console.log("Proof generated!", publicSignals);
      
      const root = publicSignals[0];
      const nullifierHash = publicSignals[1];

      // Format proof for Solidity
      const a = [proof.pi_a[0], proof.pi_a[1]];
      const b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]]
      ];
      const c = [proof.pi_c[0], proof.pi_c[1]];

      const contractInterface = new Interface(compiled.abi);
      
      // function voteZK(bytes32 choiceName, uint256 nullifierHash, uint256 root, uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c)
      const data = contractInterface.encodeFunctionData("voteZK", [
          encodedChoice,
          nullifierHash,
          root,
          a,
          b,
          c
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
          console.warn("Gelato Relay unavailable (404 or error). Falling back to direct mode...");
          // Fallback to direct transaction
          const tx = await signer.sendTransaction({
            to: contractAddress,
            data: data
          });
          console.log("Vote sent directly! Hash:", tx.hash);
          return { taskId: tx.hash }; // Return hash as taskId for compatibility
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
      const ballotsStr = localStorage.getItem("deployedBallots");
      if (!ballotsStr || ballotsStr === "undefined") return [];
      
      let ballots;
      try {
        ballots = JSON.parse(ballotsStr) as { address: string; title: string }[];
      } catch {
        console.error("Failed to parse deployedBallots from localStorage", ballotsStr.slice(0, 100));
        return [];
      }

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
