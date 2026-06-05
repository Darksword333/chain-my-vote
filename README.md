# Chain My Vote

Chain My Vote is a decentralized, zero-knowledge proof (ZKP) voting application. It leverages **Next.js** for the frontend, **Solidity** for the smart contracts, and **circom/snarkjs** for preserving voter privacy through zero-knowledge proofs.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or newer recommended)
- **npm** (comes with Node.js)

## Installation

To set up the project locally, clone the repository and install the dependencies:

```bash
# Install dependencies
npm install
```

> **Note:** The ZK and smart contract compilation artifacts (like `.zkey`, `.wasm`, and compiled contract JSONs) required for running the application locally are already included in the `public/zk/` and `src/lib/` folders. You do not need to recompile the circuits to run the development server.

## Running the Application

Once the dependencies are installed, you can start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the application.

## Compilation & Development Tools

If you need to recompile the smart contracts or circuits, use the following commands:

### Compile Smart Contracts
The `compile.js` script compiles the Solidity contracts and generates the necessary JSON artifacts in `src/lib/`.
```bash
node compile.js
```

### Compile ZK Circuits (Circom)
If you modify `semaphore_vote.circom`, you need to recompile it.
```bash
# 1. Compile the circuit
./circom.exe semaphore_vote.circom --r1cs --wasm --sym

# 2. Generate the witness and keys (ensure you have snarkjs installed)
```

### Estimate Gas Costs
You can estimate the costs for deploying the contracts and making votes using the provided estimation script:
```bash
node estimateGas.mjs
```

## Project Structure

- **`src/`**: Contains the Next.js application (pages, components, hooks, etc.).
- **`src/lib/`**: Contains the compiled Solidity smart contracts JSON artifacts.
- **`public/zk/`**: Contains the ZK artifacts (`circuit.wasm`, `circuit_final.zkey`) required by the frontend for generating proofs in the browser.
- **`Main.sol`**: Solidity smart contracts for the voting logic and ZKP verification.
- **`semaphore_vote.circom`**: The circom circuit used for Zero-Knowledge proofs.

## Scripts

- `npm run dev` - Starts the Next.js development server.
- `npm run build` - Builds the application for production.
- `npm run start` - Builds the application and serves the exported files.
