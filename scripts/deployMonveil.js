import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const artifactPath = path.join(rootDir, 'src', 'contracts', 'MonveilVerificationRegistry.json');
if (!fs.existsSync(artifactPath)) {
  console.error('Artifact not found. Please run: node scripts/compileContracts.js');
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
};

// Load .env if present
const envFile = path.join(rootDir, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DEPLOYER_PRIVATE_KEY=')) {
      const val = trimmed.slice('DEPLOYER_PRIVATE_KEY='.length).trim();
      if (val && !process.env.DEPLOYER_PRIVATE_KEY) process.env.DEPLOYER_PRIVATE_KEY = val;
    }
    if (trimmed.startsWith('MONAD_RPC_URL=')) {
      const val = trimmed.slice('MONAD_RPC_URL='.length).trim();
      if (val && !process.env.MONAD_RPC_URL) process.env.MONAD_RPC_URL = val;
    }
  }
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.log('=== MONVEIL CONTRACT DEPLOYMENT WORKFLOW ===');
    console.log('Target Network: Monad Testnet (Chain ID 10143)');
    console.log('RPC Endpoint: https://testnet-rpc.monad.xyz');
    console.log('Explorer: https://testnet.monadexplorer.com');
    console.log('Contract: MonveilVerificationRegistry.sol');
    console.log('Bytecode size:', (artifact.bytecode.length - 2) / 2, 'bytes');
    console.log('\nTo deploy live to Monad Testnet:');
    console.log('1. Set DEPLOYER_PRIVATE_KEY=0x... in .env or environment');
    console.log('2. Ensure deployer account has testnet MON from faucet: https://testnet.monad.xyz');
    console.log('3. Run: node scripts/deployMonveil.js\n');
    console.log('Active canonical verified deployment address:');
    console.log('0x4A6b58611F36928e18fDaB821cEa7FE195f483c7');
    return;
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log(`Deploying with account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${balance} wei (${Number(balance) / 1e18} MON)`);

  console.log('Broadcasting deployment transaction...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });

  console.log(`Transaction submitted: ${hash}`);
  console.log(`Explorer: https://testnet.monadexplorer.com/tx/${hash}`);
  console.log('Waiting for receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Contract deployed at: ${receipt.contractAddress}`);
  console.log(`Block: ${receipt.blockNumber}`);
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
