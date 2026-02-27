/**
 * ERC-8004 setAgentWallet
 * 
 * Sets the verified receiving wallet for Maiat's ERC-8004 identity.
 * 
 * Requires:
 *   OWNER_PRIVATE_KEY   — private key of the agentId owner (sends the TX)
 *   NEW_WALLET_PRIVATE_KEY — private key of the wallet to set (proves control via EIP-712)
 * 
 * Usage:
 *   OWNER_PRIVATE_KEY=0x... NEW_WALLET_PRIVATE_KEY=0x... npx tsx scripts/erc8004-set-wallet.ts
 * 
 * If OWNER and NEW_WALLET are the same key, you can pass just OWNER_PRIVATE_KEY.
 */

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
const AGENT_ID = 20854n;
const BASE_RPC = 'https://mainnet.base.org';

const IDENTITY_ABI = parseAbi([
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external',
  'function getAgentWallet(uint256 agentId) view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

// EIP-712 domain + type
const domain = {
  name: 'ERC8004IdentityRegistry',
  version: '1',
  chainId: 8453,
  verifyingContract: IDENTITY_REGISTRY,
} as const;

const types = {
  AgentWalletSet: [
    { name: 'agentId',   type: 'uint256' },
    { name: 'newWallet', type: 'address' },
    { name: 'owner',     type: 'address' },
    { name: 'deadline',  type: 'uint256' },
  ],
} as const;

async function main() {
  const ownerKey = process.env.OWNER_PRIVATE_KEY as `0x${string}` | undefined;
  const newWalletKey = (process.env.NEW_WALLET_PRIVATE_KEY ?? process.env.OWNER_PRIVATE_KEY) as `0x${string}` | undefined;

  if (!ownerKey) {
    console.error('❌ OWNER_PRIVATE_KEY is required');
    console.error('   Usage: OWNER_PRIVATE_KEY=0x... NEW_WALLET_PRIVATE_KEY=0x... npx tsx scripts/erc8004-set-wallet.ts');
    process.exit(1);
  }

  const ownerAccount   = privateKeyToAccount(ownerKey);
  const newWalletAccount = privateKeyToAccount(newWalletKey!);

  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const walletClient = createWalletClient({ account: ownerAccount, chain: base, transport: http(BASE_RPC) });

  console.log('╔════════════════════════════════════════════╗');
  console.log('║     ERC-8004 setAgentWallet — Maiat        ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('  agentId:    ', AGENT_ID.toString());
  console.log('  owner:      ', ownerAccount.address);
  console.log('  new wallet: ', newWalletAccount.address);

  // Verify ownership
  const currentOwner = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_ABI,
    functionName: 'ownerOf',
    args: [AGENT_ID],
  });

  if (currentOwner.toLowerCase() !== ownerAccount.address.toLowerCase()) {
    console.error(`\n❌ OWNER_PRIVATE_KEY does not own agentId ${AGENT_ID}`);
    console.error(`   Current owner: ${currentOwner}`);
    process.exit(1);
  }
  console.log('  ✅ Ownership verified\n');

  // deadline = now + 4 min (max is 5 min per contract)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 240);

  // Sign EIP-712 with newWallet (proves control)
  console.log('📝 Signing EIP-712 message with new wallet...');
  const signature = await newWalletAccount.signTypedData({
    domain,
    types,
    primaryType: 'AgentWalletSet',
    message: {
      agentId:   AGENT_ID,
      newWallet: newWalletAccount.address,
      owner:     ownerAccount.address,
      deadline,
    },
  });
  console.log('  ✅ Signed\n');

  // Send TX
  console.log('🚀 Sending setAgentWallet transaction...');
  const txHash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_ABI,
    functionName: 'setAgentWallet',
    args: [AGENT_ID, newWalletAccount.address, deadline, signature],
  });
  console.log('  TX Hash:', txHash);

  console.log('  ⏳ Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'success') {
    console.log('\n✅ agentWallet set successfully!');
    console.log('  agentId:    ', AGENT_ID.toString());
    console.log('  agentWallet:', newWalletAccount.address);
    console.log('  Basescan:   ', `https://basescan.org/tx/${txHash}`);
  } else {
    console.error('\n❌ Transaction failed');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
