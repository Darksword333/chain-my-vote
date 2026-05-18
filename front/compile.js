const path = require('path');
const fs = require('fs');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'Main.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'Main.sol': {
            content: source,
        },
    },
    settings: {
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

const contract = output.contracts['Main.sol']['Main'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const outputPath = path.resolve(__dirname, 'src', 'lib', 'compiled.json');
fs.writeFileSync(outputPath, JSON.stringify({ abi, bytecode }), 'utf8');
console.log('Compiled and written to', outputPath);
