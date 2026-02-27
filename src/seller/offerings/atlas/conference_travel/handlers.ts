/**
 * ATLAS Conference Travel — ACP Seller Handler ($0.25)
 *
 * Crypto conference flight optimizer.
 * User provides: conference name + origin city
 * ATLAS handles: dates, airports, booking strategy, points/miles
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { findConference, listConferencesSummary } from "../../../../lib/conferences.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  const conference = requirements.conference || requirements.event;
  const origin = requirements.origin || requirements.from;
  if (!conference || !origin) {
    return {
      valid: false,
      reason:
        'Provide conference name and origin. E.g. { conference: "TOKEN2049 Singapore", origin: "LAX" }',
    };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const conf = requirements.conference || requirements.event || "the conference";
  const origin = requirements.origin || requirements.from || "your city";
  return `Finding best flights from ${origin} to ${conf}. ATLAS will handle dates, airports, and booking strategy. Please proceed with payment.`;
}

async function runConferenceFlight(params: {
  conference: string;
  origin: string;
  extraDays?: number;
  budget?: string;
  userPrefs?: Record<string, any>;
}): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const { conference, origin, extraDays, budget, userPrefs } = params;
  const confData = findConference(conference);

  const confContext = confData
    ? `
CONFERENCE DATA (verified):
- Name: ${confData.name}
- Dates: ${confData.dates}
- Side Events: ${confData.side_events_dates}
- Venue: ${confData.venue}
- City: ${confData.city}, ${confData.country}
- Airport: ${confData.airport}${confData.airport_alt ? ` (alt: ${confData.airport_alt})` : ""}
- Recommended Arrival: ${confData.recommended_arrival}
- Recommended Departure: ${confData.recommended_departure}${extraDays ? ` + ${extraDays} extra days` : ""}
- Hotel Areas: ${confData.recommended_hotel_areas.join(", ")}
- Notable Side Events: ${confData.notable_side_events.join(", ")}
- Visa (US Passport): ${confData.visa_notes}
`
    : `
CONFERENCE: ${conference} (not in DB — use your knowledge for dates/venue)
Note: If you don't have verified dates, indicate uncertainty.
`;

  const prefsContext = userPrefs ? `\nUSER PREFERENCES: ${JSON.stringify(userPrefs)}` : "";
  const budgetContext = budget ? `\nBudget: ${budget}` : "";

  const prompt = `You are ATLAS, a crypto-native Travel Arbitrage Intelligence agent.

ROUTE: ${origin} → ${confData?.city || conference}
${confContext}${budgetContext}${prefsContext}

This traveler is going to a CRYPTO CONFERENCE. Give them conference-specific flight advice, not just generic travel tips.

# ✈️ ATLAS: Getting to ${confData?.name || conference}

## 📅 When to Fly
- **Arrive:** [specific date with reason — cover side events]
- **Depart:** [specific date]
- **Total stay:** [X days]
- **Why this timing:** [mention side events, hackathons, networking dinners]

## ✈️ Best Flights from ${origin}
- **Best direct option:** [airline + estimated price]
- **Best budget option:** [airline + layover city + estimated price]
- **Cheapest day to fly:** [day of week]
- **Book by:** [specific date — how far in advance]
- **Nearby airports to check:** [alternatives at origin if applicable]

## 💳 Points & Miles
- **Best program for this route:** [specific program]
- **Miles needed:** [economy / business]
- **Verdict:** [pay cash or use points? be specific]
${userPrefs?.points ? `- **Your ${userPrefs.points}:** [specific redemption advice]` : ""}

## ⚡ Conference-Specific Tips
- [Tip about side events timing]
- [Tip about venue location / hotel booking]
- [Visa reminder if needed]
- [One thing most attendees miss]

## 🏆 ATLAS Verdict
**Best Option:** [1 sentence]
**Price Target:** [range]
**Book By:** [date]
**Next Action:** [one thing to do right now]

---

## 🚀 Want Full Conference Trip Planning?
Hotels near ${confData?.venue || "the venue"}, side events schedule, budget breakdown — $0.60.

\`\`\`json
{
  "offering": "conference_trip",
  "requirements": {
    "conference": "${confData?.slug || conference}",
    "origin": "${origin}",
    "budget_total": "${budget || "YOUR_BUDGET"}"
  }
}
\`\`\`
Provider: \`0xf4b48521960C7e78fCf89859c42d912cdcd0FC06\`

---
*Powered by ATLAS — Crypto Travel Arbitrage Intelligence*`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  const conference = requirements.conference || requirements.event;
  const origin = requirements.origin || requirements.from;
  const extraDays = requirements.extra_days ? Number(requirements.extra_days) : 0;
  const budget = requirements.budget;
  const userPrefs = requirements.user_prefs;

  if (!conference || !origin) {
    return {
      deliverable: JSON.stringify({
        error: "Missing conference or origin",
        available_conferences: listConferencesSummary(),
        usage: '{ conference: "TOKEN2049 Singapore", origin: "LAX" }',
        poweredBy: "ATLAS — Crypto Travel Arbitrage Intelligence",
      }),
    };
  }

  const confData = findConference(conference);
  const report = await runConferenceFlight({ conference, origin, extraDays, budget, userPrefs });

  if (!report) {
    return {
      deliverable: JSON.stringify({
        report: `# ATLAS: ${conference} from ${origin}\n\nAI analysis temporarily unavailable. Retry shortly.`,
        structured: { conference_name: confData?.name ?? conference },
        poweredBy: "ATLAS",
      }),
    };
  }

  // Extract structured data
  const priceMatch = report.match(/\*\*Price Target:\*\*\s*([^\n]+)/);
  const bookByMatch = report.match(/\*\*Book By:\*\*\s*([^\n]+)/);
  const airlineMatch = report.match(/\*\*Best Option:\*\*\s*([^\n]+)/);

  const structured = {
    conference_name: confData?.name ?? conference,
    destination_airport: confData?.airport ?? "See report",
    recommended_arrival: confData?.recommended_arrival ?? "See report",
    recommended_departure: confData?.recommended_departure ?? "See report",
    price_range: priceMatch?.[1]?.trim() ?? "See report",
    book_by: bookByMatch?.[1]?.trim() ?? "See report",
    top_airline: airlineMatch?.[1]?.trim() ?? "See report",
  };

  const next_step = {
    offering: "conference_trip",
    provider: "0xf4b48521960C7e78fCf89859c42d912cdcd0FC06",
    price: 0.6,
    requirements: {
      conference: confData?.slug ?? conference,
      origin,
      budget_total: budget ?? "YOUR_BUDGET",
    },
    hint: "Add hotels near venue, side events schedule, and full budget breakdown",
  };

  return {
    deliverable: JSON.stringify({
      report,
      structured,
      next_step,
      poweredBy: "ATLAS — Crypto Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
