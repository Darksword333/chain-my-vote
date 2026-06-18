// Imports
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const NB_CHOIX = 3;

async function main() {
    console.log("Chargement des contrats compilés...");
    const compiledPath = path.resolve(__dirname, '..', 'src', 'lib', 'compiled.json');

    if (!fs.existsSync(compiledPath)) {
        console.error("Veuillez d'abord compiler les contrats avec npm run compile.");
        process.exit(1);
    }

    const { abi: mainAbi, bytecode: mainBytecode } = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));

    const wallet = ethers.Wallet.createRandom();
    const mainFactory = new ethers.ContractFactory(mainAbi, mainBytecode, wallet);

    const choiceNames = [];
    for (let i = 0; i < NB_CHOIX; i++) {
        choiceNames.push(ethers.encodeBytes32String("Choix" + i));
    }
    const trustedForwarder = "0xd822d6828859157C76F43743F0638573d5603fe6";
    const votingDeadline = Math.floor(Date.now() / 1000) + (3600 * 24 * 7);
    const mockWhitelist = [
        wallet.address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address
    ];

    console.log("\n=============================================");
    console.log("1. COÛTS DE CRÉATION D'UN VOTE (DÉPLOIEMENT)");
    console.log("=============================================");

    const deployMainTx = await mainFactory.getDeployTransaction(
        choiceNames,
        trustedForwarder,
        votingDeadline,
        mockWhitelist
    );

    const mainGas = 850000n;
    const { bytes: mainBytes } = calculateCalldataCost(deployMainTx.data);

    console.log("Octets de déploiement (Main) :", mainBytes, "bytes");
    console.log("Gaz de déploiement (Main)    :", mainGas.toString(), "gas");

    console.log("\n=============================================");
    console.log("2. COÛT D'UN VOTE");
    console.log("=============================================");

    const mainInterface = new ethers.Interface(mainAbi);
    const dummySignature = "0x" + "00".repeat(65);

    const voteData = mainInterface.encodeFunctionData("vote", [
        choiceNames[0],
        dummySignature
    ]);

    const { calldataGas: voteCalldataGas, bytes: voteBytes } = calculateCalldataCost(voteData);
    const totalVoteGas = 55000n + BigInt(voteCalldataGas);

    console.log("Taille payload du vote     :", voteBytes, "bytes");
    console.log("Coût intrinsèque (calldata):", voteCalldataGas, "gas");
    console.log("Coût total exécution estimé:", totalVoteGas.toString(), "gas");

    console.log("\n=============================================");
    console.log("3. COÛT DE LECTURE DES RÉSULTATS");
    console.log("=============================================");
    console.log("Les fonctions `getAllResults`, `winners`, et `isTie` sont de type 'view'.");
    console.log("Depuis le frontend (Next.js), l'appel à ces fonctions est 100% GRATUIT.");
    console.log("Coût en gas = 0.");

    const gasPrice = ethers.parseUnits("15", "gwei");
    const costDeployEth = ethers.formatEther(mainGas * gasPrice);
    const costVoteEth = ethers.formatEther(totalVoteGas * gasPrice);
    const costDeployUsd = parseFloat(costDeployEth) * 3500;
    const costVoteUsd = parseFloat(costVoteEth) * 3500;

    console.log("\n=============================================");
    console.log("RÉSUMÉ DES COÛTS FINANCIERS (" + ethers.formatUnits(gasPrice, "gwei") + " Gwei - ETH à 3500$)");
    console.log("=============================================");
    console.log("Création d'un vote complet (Main uniquement) :");
    console.log("  -> Gaz total :", mainGas.toString());
    console.log("  -> Coût ETH  :", parseFloat(costDeployEth).toFixed(5), "ETH");
    console.log("  -> Coût USD  : ~$" + costDeployUsd.toFixed(2));
    console.log("");
    console.log("Action de voter (vote par signature) :");
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
    const calldataGas = zeroBytes * 4 + nonZeroBytes * 16;
    return { calldataGas, bytes: bytes.length };
}

main().catch(console.error);
