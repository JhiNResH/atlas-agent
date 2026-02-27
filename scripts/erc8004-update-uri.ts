/**
 * Update on-chain agentURI for Maiat's ERC-8004 identity
 * Usage: OWNER_PRIVATE_KEY=0x... npx tsx scripts/erc8004-update-uri.ts
 */
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
const AGENT_ID = 20854n;
const NEW_URI = 'https://gist.githubusercontent.com/JhiNResH/cbcb232a57bf0e98a84c95a7df99b7f1/raw/maiat-erc8004-registration.json';
const BASE_RPC = 'https://mainnet.base.org';

const ABI = parseAbi([
  'function setAgentURI(uint256 agentId, string calldata agentURI) external',
  'function tokenURI(uint256 tokenId) view returns (string)',
]);

async function main() {
  const key = process.env.OWNER_PRIVATE_KEY as `0x${string}`;
  if (!key) { console.error('❌ OWNER_PRIVATE_KEY required'); process.exit(1); }

  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC) });

  console.log('Updating agentURI for agentId', AGENT_ID.toString());
  console.log('New URI:', NEW_URI);

  const txHash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: ABI,
    functionName: 'setAgentURI',
    args: [AGENT_ID, NEW_URI],
  });

  console.log('TX:', txHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(receipt.status === 'success' ? '✅ Done!' : '❌ Failed');
  console.log('Basescan:', `https://basescan.org/tx/${txHash}`);
}

main().catch(e => { console.error(e); process.exit(1); });
