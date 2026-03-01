/**
 * Solana Dialect Blink endpoint for Hermes flight queries
 *
 * GET  /api/flights/solana?conference=TOKEN2049 → Solana Blink metadata JSON
 * POST /api/flights/solana                      → Build tx or execute query after payment
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { findConference } from "@/lib/conferences";
import {
  buildUsdcTransferTx,
  verifySolanaPayment,
  getSolanaPaymentInfo,
} from "@/lib/solana-payment";
import { queryConferenceFlights, formatForBlink } from "@/lib/hermes";

// CORS headers for Dialect Blink
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET handler - returns Solana Dialect Blink metadata
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conferenceQuery = searchParams.get("conference") || "TOKEN2049";

  const conference = findConference(conferenceQuery);

  if (!conference) {
    return NextResponse.json(
      {
        title: "Conference not found",
        description: `Unknown conference: ${conferenceQuery}. Try TOKEN2049, ETHCC, or Consensus.`,
        icon: "https://hermes-acp.vercel.app/hermes-icon.png",
        label: "Error",
        disabled: true,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // Build Solana Blink metadata per Dialect spec
  const blinkMetadata = {
    type: "action",
    title: `Check flights to ${conference.name}`,
    description: `${conference.dates} · ${conference.venue} · $0.25 USDC on Solana`,
    icon: "https://hermes-acp.vercel.app/hermes-icon.png",
    label: "Check Flights",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Check Flights — $0.25 USDC",
          href: `/api/flights/solana?conference=${conference.slug}&origin={origin}`,
          parameters: [
            {
              name: "origin",
              label: "Your departure city or airport (e.g. LAX, SFO, JFK)",
              required: true,
              type: "text",
            },
          ],
        },
      ],
    },
    // Additional metadata for display
    metadata: {
      conference: {
        name: conference.name,
        slug: conference.slug,
        dates: conference.dates,
        city: conference.city,
        country: conference.country,
        airport: conference.airport,
        venue: conference.venue,
      },
      payment: getSolanaPaymentInfo(),
    },
  };

  return NextResponse.json(blinkMetadata, { status: 200, headers: CORS_HEADERS });
}

/**
 * POST handler - build unsigned tx or execute flight query after payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract parameters
    const { searchParams } = new URL(request.url);
    const conferenceQuery = searchParams.get("conference") || body.conference;
    const origin = searchParams.get("origin") || body.origin;

    // Dialect sends 'account' as the user's wallet public key
    const account = body.account;
    // After tx is signed and submitted, Dialect sends 'signature'
    const signature = body.signature;

    // Validate account (required for Solana Blinks)
    if (!account) {
      return NextResponse.json(
        {
          type: "action",
          title: "Missing account",
          description: "Wallet account is required for Solana transactions",
          icon: "https://hermes-acp.vercel.app/hermes-icon.png",
          disabled: true,
          error: { message: "Missing account parameter" },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate required params
    if (!conferenceQuery || !origin) {
      return NextResponse.json(
        {
          type: "action",
          title: "Missing parameters",
          description: "Conference and origin are required",
          icon: "https://hermes-acp.vercel.app/hermes-icon.png",
          disabled: true,
          error: { message: "Missing conference or origin parameter" },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const conference = findConference(conferenceQuery);
    if (!conference) {
      return NextResponse.json(
        {
          type: "action",
          title: "Conference not found",
          description: `Unknown conference: ${conferenceQuery}`,
          icon: "https://hermes-acp.vercel.app/hermes-icon.png",
          disabled: true,
          error: { message: `Conference not found: ${conferenceQuery}` },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const skipPayment = process.env.DEV_SKIP_PAYMENT === "true";

    // If no signature, build and return unsigned transaction
    if (!signature && !skipPayment) {
      let userPubkey: PublicKey;
      try {
        userPubkey = new PublicKey(account);
      } catch {
        return NextResponse.json(
          {
            type: "action",
            title: "Invalid account",
            description: "Invalid Solana wallet address",
            icon: "https://hermes-acp.vercel.app/hermes-icon.png",
            disabled: true,
            error: { message: "Invalid Solana wallet address" },
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const txResult = await buildUsdcTransferTx(userPubkey, 0.25);

      if ("error" in txResult) {
        return NextResponse.json(
          {
            type: "action",
            title: "Transaction build failed",
            description: txResult.error,
            icon: "https://hermes-acp.vercel.app/hermes-icon.png",
            disabled: true,
            error: { message: txResult.error },
          },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      // Return unsigned transaction for Dialect to sign
      return NextResponse.json(
        {
          transaction: txResult.transaction,
          message: `Pay $0.25 USDC to check flights from ${origin} to ${conference.name}`,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Verify payment if signature provided
    if (signature && !skipPayment) {
      const paymentResult = await verifySolanaPayment(signature);
      if (!paymentResult.valid) {
        return NextResponse.json(
          {
            type: "action",
            title: "Payment verification failed",
            description: paymentResult.error || "Could not verify USDC payment",
            icon: "https://hermes-acp.vercel.app/hermes-icon.png",
            disabled: true,
            error: { message: paymentResult.error },
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      console.log(
        `[blink-solana] Payment verified: ${paymentResult.amount} USDC from ${paymentResult.from}`
      );
    }

    // Call Hermes conference_travel handler
    console.log(`[blink-solana] Querying flights: ${origin} → ${conference.name}`);
    const result = await queryConferenceFlights({
      conference: conference.slug,
      origin: origin.trim().toUpperCase(),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          type: "action",
          title: "Query failed",
          description: result.error || "Could not fetch flight data",
          icon: "https://hermes-acp.vercel.app/hermes-icon.png",
          disabled: true,
          error: { message: result.error },
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Format result for Blink display
    const summary = formatForBlink(result);

    // Build action chain response with results
    const response = {
      type: "completed",
      title: `Flights to ${conference.name}`,
      description: summary,
      icon: "https://hermes-acp.vercel.app/hermes-icon.png",
      label: "Results",
      // Include structured data for rich display
      data: {
        summary: result.summary,
        structured: result.structured,
        report: result.report?.slice(0, 2000), // Truncate for Blink
      },
      // Fare tracking CTA
      links: {
        actions: [
          {
            type: "external-link",
            label: "Track this fare",
            href: `https://hermes-acp.vercel.app/track?conference=${conference.slug}&origin=${encodeURIComponent(origin)}&price=${result.structured?.price_range || ""}`,
          },
          {
            type: "external-link",
            label: "Full Report",
            href: `https://hermes-acp.vercel.app/report?conference=${conference.slug}&origin=${encodeURIComponent(origin)}`,
          },
        ],
      },
    };

    return NextResponse.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[blink-solana] POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        type: "action",
        title: "Error",
        description: message,
        icon: "https://hermes-acp.vercel.app/hermes-icon.png",
        disabled: true,
        error: { message },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
