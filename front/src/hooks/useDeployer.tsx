"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import compiled from "@/lib/compiled.json";

export function useDeployer() {
  const { signer } = useWallet();

  const deployBallot = useCallback(
    async (title: string, options: string[], providedSigner?: ethers.Signer | null) => {
      const activeSigner = providedSigner || signer;
      if (!activeSigner) throw new Error("No signer available. Connect your wallet first.");

      try {
        const factory = new ethers.ContractFactory(compiled.abi, compiled.bytecode, activeSigner as any);
        
        // Encode options to bytes32
        const encodedOptions = options.map(opt => ethers.encodeBytes32String(opt));
        
        // Constructor accepts bytes32[] memory choiceNames
        const contract = await factory.deploy(encodedOptions);
        await contract.waitForDeployment();
        const tx = contract.deploymentTransaction();
        const address = await contract.getAddress();

        // Save to localStorage so we can list it later
        const existingStr = localStorage.getItem("deployedBallots");
        const existing = existingStr ? JSON.parse(existingStr) : [];
        existing.push({ address, title });
        localStorage.setItem("deployedBallots", JSON.stringify(existing));

        return { address, txHash: tx?.hash || null };
      } catch (e) {
        console.error("deploy failed", e);
        throw e;
      }
    },
    [signer]
  );

  return { deployBallot };
}
