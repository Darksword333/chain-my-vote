import { createLightAccount } from "@alchemy/aa-accounts";
import { createAlchemySmartAccountClient } from "@alchemy/aa-alchemy";
import { sepolia } from "viem/chains";
import { custom, createWalletClient, http } from "viem";
import { WalletClientSigner } from "@alchemy/aa-core";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

export async function getSmartAccountClient(ethProvider: any) {
  if (!ALCHEMY_API_KEY) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_API_KEY");
  if (!POLICY_ID) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_POLICY_ID for Gas Manager");

  const alchemyTransport = http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(ethProvider)
  });

  const signer = new WalletClientSigner(walletClient, "json-rpc");

  const lightAccount = await createLightAccount({
    transport: alchemyTransport,
    chain: sepolia,
    signer,
  });

  const client = createAlchemySmartAccountClient({
    transport: alchemyTransport,
    chain: sepolia,
    account: lightAccount,
    gasManagerConfig: {
      policyId: POLICY_ID,
    },
  });

  return { client, lightAccount };
}
