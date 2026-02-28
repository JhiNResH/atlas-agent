/**
 * Real-time conference search via Gemini Google Search Grounding.
 * Used as fallback (or enrichment) when the static DB doesn't have a conference.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface ConferenceLiveInfo {
  name: string;
  dates: string;
  city: string;
  country: string;
  venue: string;
  airport: string;
  side_events: string;
  visa_notes: string;
  source: "web-search" | "fallback";
}

/**
 * Search the web for a conference's latest date/location/venue.
 * Uses Gemini with Google Search grounding (no extra API key needed).
 */
export async function searchConferenceInfo(
  conferenceName: string
): Promise<ConferenceLiveInfo | null> {
  if (!GEMINI_API_KEY) return null;

  const year = new Date().getFullYear();
  const prompt = `Search the web for the OFFICIAL, CONFIRMED details for "${conferenceName} ${year}".

STRICT RULES:
1. Only return data explicitly confirmed for ${year} — not previous years
2. If you only find ${year - 1} data, that is NOT ${year} data — return null
3. If the ${year} event hasn't been announced yet, return null
4. Do NOT extrapolate or guess based on past years
5. If dates say "TBD" or "coming soon", return null

If you find confirmed ${year} data, return ONLY this JSON (no markdown):
{
  "name": "official conference name with year",
  "dates": "confirmed dates e.g. May 5-7, ${year}",
  "city": "city name",
  "country": "country",
  "venue": "venue name",
  "airport": "nearest major airport IATA code e.g. MIA",
  "side_events": "brief description of pre/post-conference events",
  "visa_notes": "visa situation for US passport holders (1 sentence)",
  "confirmed": true
}

If ${year} details are not yet announced or you only find ${year - 1} data → return exactly: null`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }], // ← Search Grounding
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.1, // Low temp for factual retrieval
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || parsed === null) return null;

    return { ...parsed, source: "web-search" };
  } catch {
    return null;
  }
}

/** Format live info into a context string for Gemini prompts */
export function formatLiveConferenceContext(info: ConferenceLiveInfo): string {
  return `CONFERENCE (live web data ✓):
- Name: ${info.name} | Dates: ${info.dates}
- Venue: ${info.venue}
- City: ${info.city}, ${info.country} (Airport: ${info.airport})
- Side events: ${info.side_events}
- Visa (US passport): ${info.visa_notes}`;
}
