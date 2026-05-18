"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";

export function useDeployer() {
  const { signer } = useWallet();

  const deployBallot = useCallback(
    async (title: string, options: string[]) => {
      if (!signer) throw new Error("No signer available. Connect your wallet first.");

      const bytecode = process.env.NEXT_PUBLIC_VOTE_BYTECODE;
      const abiJson = process.env.NEXT_PUBLIC_VOTE_ABI;

      if (bytecode && abiJson) {
        try {
          const abi = JSON.parse(abiJson);
          const factory = new ethers.ContractFactory(abi, bytecode, signer as any);
          // Assumes the vote contract constructor accepts (string title, string[] options)
          const contract = await factory.deploy(title, options);
          await contract.waitForDeployment();
          return { address: contract.target, txHash: contract.receipt?.transactionHash || null };
        } catch (e) {
          console.error("deploy failed", e);
          throw e;
        }
      }

      // Fallback: return a dummy address so the UI can proceed during development
      const fakeAddress = ethers.Wallet.createRandom().address;
      return { address: fakeAddress, txHash: null, mocked: true };
    },
    [signer]
  );

  return { deployBallot };
}
