"use client";

import { useCallback } from "react";
import { ContractFactory, encodeBytes32String, parseEther, type Signer } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import compiled from "@/lib/compiled.json";

interface DeployedBallot {
  address: string;
  title: string;
}

export function useDeployer() {
  const { signer } = useWallet();

  const deployBallot = useCallback(
    async (
      title: string,
      options: string[],
      whitelistAddresses: string[],
      deadline: number,
      fundingAmount: string = "0.02",
      providedSigner?: Signer | null
    ) => {
      const activeSigner = providedSigner || signer;
      if (!activeSigner) throw new Error("No signer available. Connect your wallet first.");

      try {
        // 1. Deploy the Main voting contract directly
        const mainFactory = new ContractFactory(compiled.abi, compiled.bytecode, activeSigner);
        
        // Encode options to bytes32
        const encodedOptions = options.map(opt => encodeBytes32String(opt));
        
        // Gelato Relay address on Sepolia
        const GELATO_RELAY = "0xd822d6828859157C76F43743F0638573d5603fe6";
        
        // Constructor: choiceNames, trustedForwarder_, _votingDeadline, whitelist_
        const contract = await mainFactory.deploy(
          encodedOptions, 
          GELATO_RELAY, 
          deadline, 
          whitelistAddresses,
          { 
            value: parseEther(fundingAmount || "0.02"),
            gasLimit: 1500000
          }
        );
        await contract.waitForDeployment();
        const tx = contract.deploymentTransaction();
        const address = await contract.getAddress();

        // Save to localStorage so we can list it later
        const existingStr = localStorage.getItem("deployedBallots");
        let existing: DeployedBallot[] = [];
        if (existingStr && existingStr !== "undefined") {
          try {
            existing = JSON.parse(existingStr) as DeployedBallot[];
          } catch (e) {
            console.error("Failed to parse deployedBallots from localStorage", e);
          }
        }
        existing.push({ address, title });
        localStorage.setItem("deployedBallots", JSON.stringify(existing));

        // Save the whitelist configuration locally
        const ballotsDataStr = localStorage.getItem("ballotsData") || "{}";
        const ballotsData = JSON.parse(ballotsDataStr);
        ballotsData[address] = {
            whitelist: whitelistAddresses
        };
        localStorage.setItem("ballotsData", JSON.stringify(ballotsData));

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
