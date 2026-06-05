// Imports
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const NB_CHOIX = 3;       // Number of choices/candidates to simulate the contract

async function main() {
    console.log("Chargement des contrats compilés...");
    const compiledPath = path.resolve(__dirname, 'src', 'lib', 'compiled.json');
    const verifierPath = path.resolve(__dirname, 'src', 'lib', 'verifier_compiled.json');

    if (!fs.existsSync(compiledPath) || !fs.existsSync(verifierPath)) {
        console.error("Veuillez d'abord compiler les contrats avec npm run dev ou votre script de compilation.");
        process.exit(1);
    }

    const { abi: mainAbi, bytecode: mainBytecode } = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));

    const wallet = ethers.Wallet.createRandom();

    // Prepare
    const mainFactory = new ethers.ContractFactory(mainAbi, mainBytecode, wallet);

    // Deploy settings
    const choiceNames = [];
    for (let i = 0; i < NB_CHOIX; i++) {
        choiceNames.push(ethers.encodeBytes32String("Choix" + i));
    }
    const trustedForwarder = "0xd822d6828859157C76F43743F0638573d5603fe6";
    const votingDeadline = Math.floor(Date.now() / 1000) + (3600 * 24 * 7);
    const merkleRoot = ethers.id("dummy_root");
    const externalNullifier = ethers.id("dummy_poll_id");
    const dummyVerifierAddress = ethers.getAddress("0x1111222233334444555566667777888899990000");

    // ESTIMATE FOR VOTE CREATION (DEPLOYMENT
    console.log("\n=============================================");
    console.log("1. COÛTS DE CRÉATION D'UN VOTE (DÉPLOIEMENT)");
    console.log("=============================================");

    const deployMainTx = await mainFactory.getDeployTransaction(
        choiceNames,
        trustedForwarder,
        votingDeadline,
        merkleRoot,
        externalNullifier,
        dummyVerifierAddress
    );

    // Constant theoretical costs
    const verifierGas = 480000n; // Average size of a Groth16 SnarkJS verifier
    const mainGas = 1200000n;    // Contract size (Mainnet + storage initialization)

    const totalDeployGas = verifierGas + mainGas;
    const { bytes: mainBytes } = calculateCalldataCost(deployMainTx.data);

    console.log("Octets de déploiement (Main) :", mainBytes, "bytes");
    console.log("Gaz de déploiement (Verifier):", verifierGas.toString(), "gas");
    console.log("Gaz de déploiement (Main)    :", mainGas.toString(), "gas");

    // VOTE ESTIMATE
    console.log("2. COÛT D'UN VOTE");

    // Creating a dummy transaction for the vote
    const mainInterface = new ethers.Interface(mainAbi);

    // Dummy parameters for a ZK proof (Groth16: uint[2] a, uint[2][2] b, uint[2] c)
    const dummyA = [0, 0];
    const dummyB = [[0, 0], [0, 0]];
    const dummyC = [0, 0];
    const dummyNullifierHash = ethers.id("dummy_nullifier");

    const voteData = mainInterface.encodeFunctionData("voteZK", [
        choiceNames[0],      // choiceName
        dummyNullifierHash,  // nullifierHash
        merkleRoot,          // root
        dummyA,              // a
        dummyB,              // b
        dummyC               // c
    ]);

    // Theoretical estimate of ZK verification on the EVM:
    // - ecPairing precompiles (EIP-197 / EIP-1108) = ~200,000 gas
    // - State changes (bool nullifyHashes, uint choices.count, uint totalVotes) = ~60,000 gas
    // - Internal execution = ~40,000 gas
    const estimatedVoteExecutionGas = 320000n;

    const { calldataGas: voteCalldataGas, bytes: voteBytes } = calculateCalldataCost(voteData);
    const totalVoteGas = estimatedVoteExecutionGas + BigInt(voteCalldataGas);

    console.log("Taille payload du vote     :", voteBytes, "bytes");
    console.log("Coût intrinsèque (calldata):", voteCalldataGas, "gas");
    console.log("Coût total exécution estimé:", totalVoteGas.toString(), "gas");

    // READING THE RESULTS
    console.log("\n=============================================");
    console.log("3. COÛT DE LECTURE DES RÉSULTATS");
    console.log("=============================================");
    console.log("Les fonctions `getAllResults`, `winners`, et `isTie` sont de type 'view'.");
    console.log("Depuis le frontend (Next.js), l'appel à ces fonctions est 100% GRATUIT.");
    console.log("Coût en gas = 0.");

    // SUMMARY OF CURRENT RATES
    const gasPrice = ethers.parseUnits("15", "gwei");

    const costDeployEth = ethers.formatEther(totalDeployGas * gasPrice);
    const costVoteEth = ethers.formatEther(totalVoteGas * gasPrice);
    const costDeployUsd = parseFloat(costDeployEth) * 3500; // Estimation prix ETH = 3500$
    const costVoteUsd = parseFloat(costVoteEth) * 3500;

    console.log("\n=============================================");
    console.log("RÉSUMÉ DES COÛTS FINANCIERS (" + ethers.formatUnits(gasPrice, "gwei") + " Gwei - ETH à 3500$)");
    console.log("=============================================");
    console.log("Création d'un vote complet (Verifier + Main) :");
    console.log("  -> Gaz total :", totalDeployGas.toString());
    console.log("  -> Coût ETH  :", parseFloat(costDeployEth).toFixed(5), "ETH");
    console.log("  -> Coût USD  : ~$" + costDeployUsd.toFixed(2));
    console.log("");
    console.log("Action de voter (voteZK) :");
    console.log("  -> Gaz total :", totalVoteGas.toString());
    console.log("  -> Coût ETH  :", parseFloat(costVoteEth).toFixed(5), "ETH");
    console.log("  -> Coût USD  : ~$" + costVoteUsd.toFixed(2));
    console.log("=============================================\n");
}

function calculateCalldataCost(data) {
    const bytes = ethers.getBytes(data);
    let zeroBytes = 0, nonZeroBytes = 0;
    for (const b of bytes) {
        if (b === 0) {
            zeroBytes++;
        } else {
            nonZeroBytes++;
        }
    }
    // EIP-2028: 4 gas per byte nul, 16 gas per byte non-nul
    const calldataGas = zeroBytes * 4 + nonZeroBytes * 16;
    return { calldataGas, bytes: bytes.length };
}

main().catch(console.error);