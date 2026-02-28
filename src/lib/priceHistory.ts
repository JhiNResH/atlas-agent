/**
 * Route price history lookup via Gemini Search Grounding.
 * Gives BUY/WAIT verdicts real historical context.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

export interface PriceHistory {
  route: string;
  typicalLow: string;
  typicalHigh: string;
  typicalAverage: string;
  cheapestMonths: string;
  mostExpensiveMonths: string;
  bookingWindow: string; // e.g. "6-10 weeks in advance"
  verdict: string; // e.g. "Current $750 is below average — good time to buy"
  source: "search-grounding";
}

export async function getRoutePriceHistory(
  origin: string,
  destination: string,
  travelMonth?: string
): Promise<PriceHistory | null> {
  if (!GEMINI_API_KEY) return null;

  // Sanitize user input
  const safeOrigin = origin
    .replace(/["`\\<>]/g, "")
    .slice(0, 10)
    .toUpperCase()
    .trim();
  const safeDest = destination
    .replace(/["`\\<>]/g, "")
    .slice(0, 10)
    .toUpperCase()
    .trim();
  const safeMonth = travelMonth
    ?.replace(/["`\\<>]/g, "")
    .slice(0, 30)
    .trim();
  if (!safeOrigin || !safeDest) return null;

  const year = new Date().getFullYear();
  const monthContext = safeMonth ? ` for ${safeMonth} ${year}` : ` in ${year}`;

  const prompt = `Search the web for typical economy roundtrip flight prices from ${safeOrigin} to ${safeDest}${monthContext}.

Find real price data from Google Flights, Kayak, Skyscanner, or airline sources.

Return ONLY this JSON (no markdown):
{
  "typicalLow": "lowest typical price e.g. $450",
  "typicalHigh": "highest typical price e.g. $1200",
  "typicalAverage": "average price e.g. $750",
  "cheapestMonths": "e.g. January, February, November",
  "mostExpensiveMonths": "e.g. July, August, December",
  "bookingWindow": "e.g. 6-10 weeks in advance for best prices",
  "notes": "one key insight about this specific route"
}

Use real search data. If you can't find reliable data, return null.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!raw || raw.trim() === "null") return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.typicalAverage) return null;

    return {
      route: `${safeOrigin} → ${safeDest}`,
      typicalLow: parsed.typicalLow || "N/A",
      typicalHigh: parsed.typicalHigh || "N/A",
      typicalAverage: parsed.typicalAverage || "N/A",
      cheapestMonths: parsed.cheapestMonths || "N/A",
      mostExpensiveMonths: parsed.mostExpensiveMonths || "N/A",
      bookingWindow: parsed.bookingWindow || "6-8 weeks",
      verdict: parsed.notes || "",
      source: "search-grounding",
    };
  } catch {
    return null;
  }
}

/** Format price history as a context string for Gemini prompts */
export function formatPriceHistoryContext(h: PriceHistory): string {
  return `ROUTE PRICE HISTORY (from web search):
- Typical range: ${h.typicalLow} – ${h.typicalHigh} (avg: ${h.typicalAverage})
- Cheapest months: ${h.cheapestMonths}
- Most expensive: ${h.mostExpensiveMonths}
- Best booking window: ${h.bookingWindow}
- Note: ${h.verdict}
Use this data to contextualize whether the current Amadeus price is cheap/average/expensive.`;
}
