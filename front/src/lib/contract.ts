// Placeholder contract configuration. Replace `CONTRACT_ADDRESS` and `ABI` with your actual contract.
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Minimal example ABI for a voting contract. Update methods/events as needed.
export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "ballotId", "type": "uint256" },
      { "internalType": "uint8", "name": "choice", "type": "uint8" }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBallots",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "string[]", "name": "options", "type": "string[]" }
        ],
        "internalType": "struct Ballot[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
