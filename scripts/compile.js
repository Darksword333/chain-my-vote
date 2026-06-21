const path = require('path');
const fs = require('fs');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '..', 'contracts', 'Main.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const verifierPath = path.resolve(__dirname, '..', 'contracts', 'Verifier.sol');
const verifierSource = fs.existsSync(verifierPath) ? fs.readFileSync(verifierPath, 'utf8') : '';

const input = {
    language: 'Solidity',
    sources: {
        'Main.sol': {
            content: source,
        },
        'Verifier.sol': {
            content: verifierSource,
        }
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    let hasErrors = false;
    output.errors.forEach((err) => {
        console.error(err.formattedMessage);
        if (err.severity === 'error') hasErrors = true;
    });
    if (hasErrors) process.exit(1);
}

// Export Main
const contract = output.contracts['Main.sol']['Main'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;
const outputPath = path.resolve(__dirname, '..', 'src', 'lib', 'compiled.json');
fs.writeFileSync(outputPath, JSON.stringify({ abi, bytecode }), 'utf8');

// Export Verifier
const verifierContract = output.contracts['Verifier.sol']['Groth16Verifier'];
if (verifierContract) {
    const verifierAbi = verifierContract.abi;
    const verifierBytecode = verifierContract.evm.bytecode.object;
    const verifierOutputPath = path.resolve(__dirname, '..', 'src', 'lib', 'verifier_compiled.json');
    fs.writeFileSync(verifierOutputPath, JSON.stringify({ abi: verifierAbi, bytecode: verifierBytecode }), 'utf8');
    console.log('Compiled and written to', verifierOutputPath);
}

console.log('Compiled and written to', outputPath);
