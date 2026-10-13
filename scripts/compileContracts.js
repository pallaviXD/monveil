import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const contractPath = path.join(rootDir, 'contracts', 'MonveilVerificationRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'MonveilVerificationRegistry.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

console.log('Compiling MonveilVerificationRegistry.sol with solc...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasErrors = false;
  for (const err of output.errors) {
    if (err.severity === 'error') {
      console.error(err.formattedMessage);
      hasErrors = true;
    } else {
      console.warn(err.formattedMessage);
    }
  }
  if (hasErrors) {
    process.exit(1);
  }
}

const contract = output.contracts['MonveilVerificationRegistry.sol']['MonveilVerificationRegistry'];
const artifact = {
  contractName: 'MonveilVerificationRegistry',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
};

const outDir = path.join(rootDir, 'src', 'contracts');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'MonveilVerificationRegistry.json');
fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2), 'utf8');
console.log(`Compilation successful! Artifact written to ${outPath}`);
