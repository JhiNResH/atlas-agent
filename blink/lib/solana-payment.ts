/**
 * Solana USDC payment utilities for Hermes Blink
 * Builds unsigned transactions and verifies on-chain payments
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// USDC on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Payment amount: $0.25 USDC (6 decimals)
const PAYMENT_AMOUNT = 250_000; // 0.25 * 10^6

// Solana mainnet RPC
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  amount?: string;
  from?: string;
}

/**
 * Get Solana connection
 */
function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

/**
 * Get Hermes Solana wallet address from env
 */
function getHermesAddress(): PublicKey | null {
  const address = process.env.HERMES_SOLANA_ADDRESS;
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
}

/**
 * Build unsigned USDC transfer transaction
 * @param from - Sender's wallet public key
 * @param amountUsdc - Amount in USDC (e.g., 0.25)
 * @returns Base64 encoded unsigned transaction
 */
export async function buildUsdcTransferTx(
  from: PublicKey,
  amountUsdc: number = 0.25
): Promise<{ transaction: string } | { error: string }> {
  const hermesAddress = getHermesAddress();
  if (!hermesAddress) {
    return { error: "HERMES_SOLANA_ADDRESS not configured" };
  }

  try {
    const connection = getConnection();

    // Calculate amount in USDC smallest units (6 decimals)
    const amount = Math.round(amountUsdc * 1_000_000);

    // Get Associated Token Accounts for sender and recipient
    const fromAta = getAssociatedTokenAddressSync(USDC_MINT, from);
    const toAta = getAssociatedTokenAddressSync(USDC_MINT, hermesAddress);

    // Build transfer instruction
    const transferIx: TransactionInstruction = createTransferInstruction(
      fromAta,
      toAta,
      from,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    // Create transaction
    const transaction = new Transaction();
    transaction.add(transferIx);

    // Get latest blockhash for transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = from;

    // Serialize to base64 (unsigned)
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      transaction: serialized.toString("base64"),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to build transaction: ${message}` };
  }
}

/**
 * Verify a Solana USDC payment
 * Checks that the transaction sent >= $0.25 USDC to Hermes wallet
 */
export async function verifySolanaPayment(signature: string): Promise<PaymentVerificationResult> {
  const hermesAddress = getHermesAddress();
  if (!hermesAddress) {
    return { valid: false, error: "HERMES_SOLANA_ADDRESS not configured" };
  }

  // DEV_SKIP_PAYMENT bypass for testing
  if (process.env.DEV_SKIP_PAYMENT === "true") {
    console.log("[solana-payment] DEV_SKIP_PAYMENT=true, skipping verification");
    return {
      valid: true,
      amount: "0.25",
      from: "dev_skip",
    };
  }

  try {
    const connection = getConnection();

    // Get parsed transaction
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: "Transaction not found" };
    }

    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed" };
    }

    // Get Hermes ATA
    const hermesAta = getAssociatedTokenAddressSync(USDC_MINT, hermesAddress);

    // Look for SPL token transfers in inner instructions and main instructions
    const instructions = [
      ...(tx.transaction.message.instructions || []),
      ...(tx.meta?.innerInstructions?.flatMap((i) => i.instructions) || []),
    ];

    for (const ix of instructions) {
      // Check for parsed SPL token transfer
      if ("parsed" in ix && ix.program === "spl-token") {
        const parsed = ix.parsed;
        if (parsed.type === "transfer" || parsed.type === "transferChecked") {
          const info = parsed.info;
          const destination = info.destination || info.tokenAccount;
          const amount = parseInt(info.amount || info.tokenAmount?.amount || "0", 10);

          // Check if transfer is to Hermes ATA with sufficient amount
          if (
            destination === hermesAta.toBase58() &&
            amount >= PAYMENT_AMOUNT - 1000 // Small tolerance
          ) {
            return {
              valid: true,
              amount: (amount / 1_000_000).toFixed(2),
              from: info.source || info.authority || "unknown",
            };
          }
        }
      }
    }

    return {
      valid: false,
      error: `No USDC transfer of >= $0.25 to Hermes found in tx`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: `Verification failed: ${message}` };
  }
}

/**
 * Get Solana payment info for Blink display
 */
export function getSolanaPaymentInfo() {
  return {
    token: "USDC",
    chain: "Solana",
    amount: "0.25",
    recipient: process.env.HERMES_SOLANA_ADDRESS || "Not configured",
    mint: USDC_MINT.toBase58(),
  };
}
