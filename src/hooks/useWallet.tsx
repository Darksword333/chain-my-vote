"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { 
  BrowserProvider, 
  Contract, 
  encodeBytes32String, 
  decodeBytes32String, 
  Interface,
  solidityPackedKeccak256,
  type Eip1193Provider,
  type Signer
} from "ethers";
import compiled from "@/lib/compiled.json";
import { getGlobalBallots } from "@/lib/db";
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
  vote: (contractAddress: string, choiceName: string, secret: string) => Promise<{ taskId: string }>;
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
    async (contractAddress: string, choiceName: string, secret: string) => {
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
        throw new Error("ZK Tree data not found for this ballot. Ensure you are using a ballot created with the ZK system.");
      }

      // Reconstruct the tree
      const secrets = zkData.secrets as string[];
      const secretIndex = secrets.indexOf(secret);
      
      if (secretIndex === -1) {
        throw new Error("Your secret code is not authorized to vote in this ballot.");
      }

      const tree = await createMerkleTree(secrets);
      const proofElements = tree.getProof(secretIndex);

      // Compute signalHash exactly like the smart contract: uint256(keccak256(abi.encodePacked(choiceName))) >> 8
      const encodedChoice = encodeBytes32String(choiceName);
      const keccakHash = solidityPackedKeccak256(["bytes32"], [encodedChoice]);
      const signalHash = (BigInt(keccakHash) >> BigInt(8)).toString();

      // Input for the circom circuit (the compiled circuit expects idCardNumber)
      const circuitInput = {
        idCardNumber: secret,
        treePathIndices: proofElements.pathIndices,
        treeSiblings: proofElements.siblings.map(s => s.toString()),
        signalHash: signalHash,
        externalNullifier: zkData.externalNullifier
      };

      console.log("Generating ZK Proof...", circuitInput);
      
      // Load wasm and zkey from public/zk/
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
          console.warn("Gelato Relay unavailable. Falling back to direct transaction...");
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
