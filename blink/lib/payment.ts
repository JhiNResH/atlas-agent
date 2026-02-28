/**
 * USDC payment verification on Base
 * Verifies $0.25 USDC transfers to Hermes wallet
 */

import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { base } from "viem/chains";

// USDC on Base (native USDC, not bridged)
const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// Hermes wallet address (from env)
const HERMES_WALLET = process.env.HERMES_WALLET_ADDRESS as `0x${string}` | undefined;

// Payment amount: $0.25 USDC (6 decimals)
const PAYMENT_AMOUNT = 250_000n; // 0.25 * 10^6
const PAYMENT_TOLERANCE = 1000n; // Allow small variance for gas

// ERC-20 Transfer event ABI
const TRANSFER_EVENT_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  amount?: string;
  from?: string;
  txHash?: string;
}

/**
 * Create Base chain public client
 */
function getBaseClient() {
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });
}

/**
 * Verify a USDC payment on Base
 * Checks that the transaction sent >= $0.25 USDC to Hermes wallet
 */
export async function verifyPayment(txHash: string): Promise<PaymentVerificationResult> {
  if (!HERMES_WALLET) {
    return { valid: false, error: "HERMES_WALLET_ADDRESS not configured" };
  }

  // DEV_SKIP_PAYMENT bypass for testing
  if (process.env.DEV_SKIP_PAYMENT === "true") {
    console.log("[payment] DEV_SKIP_PAYMENT=true, skipping verification");
    return {
      valid: true,
      amount: "0.25",
      from: "0xdev_skip",
      txHash,
    };
  }

  try {
    const client = getBaseClient();

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return { valid: false, error: "Transaction not found" };
    }

    if (receipt.status !== "success") {
      return { valid: false, error: "Transaction failed" };
    }

    // Find USDC Transfer event to Hermes wallet
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === USDC_BASE_ADDRESS.toLowerCase() &&
        log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // Transfer topic
    );

    for (const log of transferLogs) {
      // Decode the Transfer event
      try {
        // topics[1] = from, topics[2] = to, data = value
        const to = ("0x" + log.topics[2]?.slice(26)) as `0x${string}`;
        const value = BigInt(log.data);

        if (to.toLowerCase() === HERMES_WALLET.toLowerCase()) {
          // Check amount is >= $0.25 (with tolerance)
          if (value >= PAYMENT_AMOUNT - PAYMENT_TOLERANCE) {
            const from = ("0x" + log.topics[1]?.slice(26)) as `0x${string}`;
            return {
              valid: true,
              amount: formatUnits(value, 6),
              from,
              txHash,
            };
          }
        }
      } catch {
        continue;
      }
    }

    return {
      valid: false,
      error: `No USDC transfer of >= $0.25 to ${HERMES_WALLET} found in tx`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: `Verification failed: ${message}` };
  }
}

/**
 * Get payment info for Blink display
 */
export function getPaymentInfo() {
  return {
    token: "USDC",
    chain: "Base",
    amount: "0.25",
    recipient: HERMES_WALLET || "Not configured",
    contractAddress: USDC_BASE_ADDRESS,
  };
}
