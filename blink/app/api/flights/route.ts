/**
 * Dialect Blink endpoint for Hermes flight queries
 *
 * GET  /api/flights?conference=TOKEN2049 → Blink metadata JSON
 * POST /api/flights                      → Execute query after payment
 */

import { NextRequest, NextResponse } from "next/server";
import { findConference } from "@/lib/conferences";
import { verifyPayment, getPaymentInfo } from "@/lib/payment";
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
 * GET handler - returns Dialect Blink metadata
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

  // Build Blink metadata per Dialect spec
  const blinkMetadata = {
    type: "action",
    title: `Check flights to ${conference.name}`,
    description: `${conference.dates} · ${conference.venue} · $0.25 USDC on Base`,
    icon: "https://hermes-acp.vercel.app/hermes-icon.png",
    label: "Check Flights",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Check Flights — $0.25 USDC",
          href: `/api/flights?conference=${conference.slug}&origin={origin}`,
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
      payment: getPaymentInfo(),
    },
  };

  return NextResponse.json(blinkMetadata, { status: 200, headers: CORS_HEADERS });
}

/**
 * POST handler - execute flight query after payment verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract parameters from Dialect Blink POST
    const { searchParams } = new URL(request.url);
    const conferenceQuery = searchParams.get("conference") || body.conference;
    const origin = searchParams.get("origin") || body.origin;
    const txHash = body.signature || body.txHash || body.transaction;

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

    // DEV_SKIP_PAYMENT bypass or verify payment
    const skipPayment = process.env.DEV_SKIP_PAYMENT === "true";

    if (!skipPayment && !txHash) {
      // Return transaction request for payment
      return NextResponse.json(
        {
          type: "transaction",
          title: `Pay $0.25 USDC to check flights`,
          description: `${conference.name} from ${origin}`,
          icon: "https://hermes-acp.vercel.app/hermes-icon.png",
          label: "Pay & Check",
          // Dialect Blink will handle the EVM transaction
          chain: "base",
          transaction: {
            to: process.env.HERMES_WALLET_ADDRESS,
            value: "0",
            data: "0x", // USDC transfer will be handled by Dialect
          },
          links: {
            actions: [
              {
                type: "post",
                label: "Confirm Payment",
                href: `/api/flights?conference=${conference.slug}&origin=${encodeURIComponent(origin)}`,
              },
            ],
          },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Verify payment if txHash provided
    if (txHash && !skipPayment) {
      const paymentResult = await verifyPayment(txHash);
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
        `[blink] Payment verified: ${paymentResult.amount} USDC from ${paymentResult.from}`
      );
    }

    // Call Hermes conference_travel handler
    console.log(`[blink] Querying flights: ${origin} → ${conference.name}`);
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
    console.error("[blink] POST error:", err);
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
