/**
 * ERC-8004 Identity & Reputation Utilities
 *
 * Read-only functions for querying ERC-8004 agent identity and reputation
 * on Base Mainnet.
 *
 * Contract addresses:
 * - IdentityRegistry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * - ReputationRegistry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 */

import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';

// ERC-8004 Contract Addresses (Base Mainnet)
export const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
export const REPUTATION_REGISTRY_ADDRESS = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

// Base RPC
const BASE_RPC = 'https://mainnet.base.org';

// Create public client (read-only)
const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

// IdentityRegistry ABI (minimal for read operations)
const IDENTITY_REGISTRY_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'getAgentWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// ReputationRegistry ABI (minimal for read operations)
const REPUTATION_REGISTRY_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'value', type: 'int256' },
    ],
  },
  {
    name: 'getReputationNormalized',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Reputation summary for an ERC-8004 agent
 */
export interface AgentReputation {
  /** Number of reputation interactions */
  count: bigint;
  /** Normalized reputation score (0-100) */
  value: number;
}

/**
 * Query reputation summary for an ERC-8004 agent
 *
 * @param agentId - The agent's ERC-8004 token ID
 * @returns Reputation summary or null if agent doesn't exist
 */
export async function getAgentReputation(agentId: bigint): Promise<AgentReputation | null> {
  try {
    // Get raw reputation data
    const [count, rawValue] = await publicClient.readContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getReputation',
      args: [agentId],
    });

    // Get normalized score (0-100 scale)
    let normalizedValue: number;
    try {
      const normalized = await publicClient.readContract({
        address: REPUTATION_REGISTRY_ADDRESS,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getReputationNormalized',
        args: [agentId],
      });
      normalizedValue = Number(normalized);
    } catch {
      // Fallback: calculate normalized value from raw
      // Simple normalization: value / count * 100, clamped to 0-100
      if (count === 0n) {
        normalizedValue = 50; // Default neutral score
      } else {
        const raw = Number(rawValue) / Number(count);
        normalizedValue = Math.max(0, Math.min(100, (raw + 1) * 50));
      }
    }

    return {
      count,
      value: normalizedValue,
    };
  } catch (error: any) {
    // Agent doesn't exist or contract call failed
    if (error.message?.includes('nonexistent token') || error.message?.includes('invalid token')) {
      return null;
    }
    // For other errors, return null but log for debugging
    console.error('[erc8004] Error fetching reputation:', error.message || error);
    return null;
  }
}

/**
 * Check if a wallet address has an ERC-8004 identity (owns at least one agent token)
 *
 * @param walletAddress - The wallet address to check
 * @returns true if the wallet owns at least one ERC-8004 agent token
 */
export async function hasERC8004Identity(walletAddress: string): Promise<boolean> {
  try {
    const balance = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });

    return balance > 0n;
  } catch (error: any) {
    console.error('[erc8004] Error checking identity:', error.message || error);
    return false;
  }
}

/**
 * Get the agent wallet configured for a specific agentId
 *
 * @param agentId - The agent's ERC-8004 token ID
 * @returns The configured agent wallet address, or null if not set
 */
export async function getAgentWallet(agentId: bigint): Promise<string | null> {
  try {
    const wallet = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgentWallet',
      args: [agentId],
    });

    // Return null if zero address (not configured)
    if (wallet === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return wallet;
  } catch (error: any) {
    console.error('[erc8004] Error fetching agent wallet:', error.message || error);
    return null;
  }
}

/**
 * Get the owner (minting wallet) of an ERC-8004 agent token
 *
 * @param agentId - The agent's ERC-8004 token ID
 * @returns The owner address, or null if token doesn't exist
 */
export async function getAgentOwner(agentId: bigint): Promise<string | null> {
  try {
    const owner = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [agentId],
    });

    return owner;
  } catch (error: any) {
    // Token doesn't exist
    if (error.message?.includes('nonexistent token') || error.message?.includes('invalid token')) {
      return null;
    }
    console.error('[erc8004] Error fetching agent owner:', error.message || error);
    return null;
  }
}

/**
 * Get the agentURI (metadata) for an ERC-8004 agent
 *
 * @param agentId - The agent's ERC-8004 token ID
 * @returns The agent URI string, or null if token doesn't exist
 */
export async function getAgentURI(agentId: bigint): Promise<string | null> {
  try {
    const uri = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'tokenURI',
      args: [agentId],
    });

    return uri;
  } catch (error: any) {
    console.error('[erc8004] Error fetching agent URI:', error.message || error);
    return null;
  }
}

/**
 * Get agentId from wallet address
 *
 * Note: ERC-8004 doesn't provide a direct wallet → agentId mapping.
 * This would require indexing Transfer events or using a subgraph.
 * Currently returns null as this requires off-chain indexing.
 *
 * @param walletAddress - The wallet address to look up
 * @returns null (not implemented - requires off-chain indexing)
 */
export async function getAgentIdFromWallet(walletAddress: string): Promise<bigint | null> {
  // ERC-8004 doesn't have a direct wallet → agentId lookup
  // This would require:
  // 1. Indexing all Transfer events from the IdentityRegistry
  // 2. Using a subgraph (e.g., The Graph)
  // 3. Iterating through tokenIds and checking ownerOf (expensive)
  //
  // For now, return null. Applications should track their own agentId.
  return null;
}

/**
 * Check if a specific agentId exists
 *
 * @param agentId - The agent's ERC-8004 token ID
 * @returns true if the agent exists
 */
export async function agentExists(agentId: bigint): Promise<boolean> {
  const owner = await getAgentOwner(agentId);
  return owner !== null;
}
