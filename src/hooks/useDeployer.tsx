"use client";

import { useCallback } from "react";
import { ContractFactory, encodeBytes32String, parseEther, type Signer } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import compiled from "@/lib/compiled.json";
import verifierCompiled from "@/lib/verifier_compiled.json";
import { createMerkleTree } from "@/lib/zkp";
import { saveGlobalBallot } from "@/lib/db";

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
      secrets: string[],
      deadline: number,
      fundingAmount: string = "0.02",
      providedSigner?: Signer | null
    ) => {
      const activeSigner = providedSigner || signer;
      if (!activeSigner) throw new Error("No signer available. Connect your wallet first.");

      try {
        // Generate Merkle Tree from secrets
        const tree = await createMerkleTree(secrets);
        const merkleRoot = tree.root;

        // Generate external nullifier randomly for this ballot
        // Random 31-byte integer to avoid field overflow
        const externalNullifier = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)))
          .map(b => b.toString(16).padStart(2, '0')).join(''));

        // 1. Deploy the Verifier contract
        const verifierFactory = new ContractFactory(verifierCompiled.abi, verifierCompiled.bytecode, activeSigner);
        const verifierContract = await verifierFactory.deploy();
        await verifierContract.waitForDeployment();
        const verifierAddress = await verifierContract.getAddress();

        // 2. Deploy the Main voting contract
        const mainFactory = new ContractFactory(compiled.abi, compiled.bytecode, activeSigner);
        
        // Encode options to bytes32
        const encodedOptions = options.map(opt => encodeBytes32String(opt));
        
        // Gelato Relay address on Sepolia
        const GELATO_RELAY = "0xd822d6828859157C76F43743F0638573d5603fe6";
        
        // Constructor: choiceNames, trustedForwarder_, _votingDeadline, _merkleRoot, _externalNullifier, _verifierAddress
        const contract = await mainFactory.deploy(
          encodedOptions, 
          GELATO_RELAY, 
          deadline, 
          merkleRoot.toString(), 
          externalNullifier.toString(), 
          verifierAddress,
          { 
            value: parseEther(fundingAmount || "0.02"),
            gasLimit: 3500000
          }
        );
        await contract.waitForDeployment();
        const tx = contract.deploymentTransaction();
        const address = await contract.getAddress();

        // Save to global database via API
        try {
          await saveGlobalBallot(address, title);
        } catch (apiErr) {
          console.error("Failed to save deployed ballot to database API:", apiErr);
        }

        // Save the externalNullifier and the secrets tree locally for generation of proofs
        const ballotsZkDataStr = localStorage.getItem("ballotsZkData") || "{}";
        const ballotsZkData = JSON.parse(ballotsZkDataStr);
        ballotsZkData[address] = {
            externalNullifier: externalNullifier.toString(),
            merkleRoot: merkleRoot.toString(),
            secrets
        };
        localStorage.setItem("ballotsZkData", JSON.stringify(ballotsZkData));

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
