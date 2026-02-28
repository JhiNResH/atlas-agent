/**
 * Hermes API integration for Blink endpoint
 * Calls the conference_travel handler directly
 */

// Import from conference_travel handlers (direct call, not HTTP)
// Since Next.js runs in a different process, we'll call the Railway API
// or use a direct function import approach

interface HermesFlightResult {
  success: boolean;
  summary?: string[];
  report?: string;
  structured?: {
    conference_name: string;
    destination_airport: string;
    recommended_arrival: string;
    recommended_departure: string;
    price_range: string;
    book_by: string;
    top_airline: string;
  };
  error?: string;
}

/**
 * Call Hermes conference_travel handler
 * In production, this would call the Railway-deployed Hermes API
 * For local dev, we can import the handler directly
 */
export async function queryConferenceFlights(params: {
  conference: string;
  origin: string;
}): Promise<HermesFlightResult> {
  const { conference, origin } = params;

  // Option 1: Call Railway API (production)
  const hermesApiUrl = process.env.HERMES_API_URL;
  if (hermesApiUrl) {
    try {
      const res = await fetch(`${hermesApiUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offering: "conference_travel",
          requirements: { conference, origin },
        }),
        signal: AbortSignal.timeout(60_000), // 60s timeout for Amadeus + Gemini
      });

      if (!res.ok) {
        return { success: false, error: `Hermes API returned ${res.status}` };
      }

      const data = await res.json();
      return parseHermesResponse(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Hermes API call failed: ${message}` };
    }
  }

  // HERMES_API_URL is required for production
  return {
    success: false,
    error: "HERMES_API_URL is not configured. Set it to the Railway Hermes service URL.",
  };
}

/**
 * Parse Hermes response into structured format
 */
function parseHermesResponse(data: any): HermesFlightResult {
  if (data.error) {
    return { success: false, error: data.error };
  }

  return {
    success: true,
    summary: data.summary,
    report: data.report,
    structured: data.structured,
  };
}

/**
 * Format Hermes result for Blink display
 * Creates a condensed version suitable for Twitter card
 */
export function formatForBlink(result: HermesFlightResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const { summary, structured } = result;

  // Use summary bullets if available
  if (summary && summary.length > 0) {
    return summary.join("\n");
  }

  // Fallback to structured data
  if (structured) {
    return [
      `To: ${structured.conference_name}`,
      `Price: ${structured.price_range}`,
      `Book by: ${structured.book_by}`,
      `Arrive: ${structured.recommended_arrival}`,
    ].join("\n");
  }

  return "Flight analysis complete. Check full report.";
}
