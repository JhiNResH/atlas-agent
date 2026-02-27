/**
 * ATLAS Conference Trip — ACP Seller Handler ($0.60)
 *
 * Full conference trip: flights + hotels near venue + side events + budget
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { findConference } from "../../../../lib/conferences.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  if (!requirements.conference || !requirements.origin) {
    return {
      valid: false,
      reason:
        'Provide conference and origin. E.g. { conference: "TOKEN2049 Singapore", origin: "LAX", budget_total: "$3000" }',
    };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const conf = requirements.conference || "the conference";
  const origin = requirements.origin || "your city";
  return `Planning full trip from ${origin} to ${conf} — flights, hotels near venue, side events + budget. Please proceed with payment.`;
}

async function runConferenceTrip(params: {
  conference: string;
  origin: string;
  budgetTotal?: string;
  extraDays?: number;
  tripStyle?: string;
  userPrefs?: Record<string, any>;
}): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const { conference, origin, budgetTotal, extraDays, tripStyle, userPrefs } = params;
  const confData = findConference(conference);
  const style = tripStyle ?? "mid-range";

  const confContext = confData
    ? `
CONFERENCE (verified):
- Name: ${confData.name} | Dates: ${confData.dates}
- Side Events: ${confData.side_events_dates}
- Venue: ${confData.venue}
- Location: ${confData.city}, ${confData.country} (Airport: ${confData.airport})
- Recommended stay: ${confData.recommended_arrival} → ${confData.recommended_departure}${extraDays ? ` + ${extraDays} extra days` : ""}
- Best hotel areas: ${confData.recommended_hotel_areas.join(", ")}
- Side events to know: ${confData.notable_side_events.join(", ")}
- Visa (US passport): ${confData.visa_notes}
`
    : `CONFERENCE: ${conference} — use your knowledge for details`;

  const prompt = `You are ATLAS, crypto Travel Arbitrage Intelligence.

Route: ${origin} → ${confData?.city || conference}
${confContext}
Budget: ${budgetTotal || "flexible"}
Style: ${style}
${userPrefs ? `Preferences: ${JSON.stringify(userPrefs)}` : ""}

Produce a complete conference trip plan. Be specific — real hotel names, real neighborhoods, real airlines.

# 🌍 ATLAS Conference Trip: ${confData?.name || conference}

## ✈️ Flights from ${origin}
- **Best option:** [airline + price + dates]
- **Budget option:** [airline + layover + price]
- **Book by:** [date]
- **Pro tip:** [one specific hack for this route]

## 🏨 Hotels Near Venue
(Prioritize walking distance or short ride to ${confData?.venue || "venue"})

| Option | Hotel / Area | Price/Night | Distance to Venue |
|--------|-------------|-------------|-------------------|
| Budget | ... | $XX | ... |
| Mid-range | ... | $XX | ... |
| Splurge | ... | $XX | ... |

- **Book on:** [platform]
- **Book by:** [date — conferences sell out fast]

## 📅 Conference Schedule & Side Events
- **Main event:** ${confData?.dates || "See conference website"}
- **Key side events:** ${confData?.notable_side_events?.join(", ") || "Check conference socials"}
- **Recommended full schedule:**
  - [Day -2]: Arrive, check in, scout venue
  - [Day -1]: Side events / hackathon starts
  - [Day 1-X]: Main conference
  - [Day +1]: Departure or extra day

## 🛂 Entry Requirements (US Passport)
- ${confData?.visa_notes || "Check current entry requirements"}
- Passport validity needed: [X months]

## 💰 Budget Breakdown (1 person)
| Category | Cost |
|----------|------|
| Flights (roundtrip) | $... |
| Hotel (X nights) | $... |
| Food & drinks | $... |
| Conference ticket (if applicable) | $... |
| Local transport | $... |
| **TOTAL** | **$...** |

## ⚡ Action Plan
1. [Book flights — specific action]
2. [Book hotel — specific platform + timing]
3. [Register for side events — link if known]

---

## 🗺️ Going to Multiple Conferences This Year?
ATLAS can optimize your full-year routing and save $300-800 on multi-conference trips.

\`\`\`json
{
  "offering": "multi_conference_router",
  "requirements": {
    "conferences": ["${confData?.slug || conference}", "ADD_ANOTHER_CONFERENCE"],
    "origin": "${origin}"
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
        generationConfig: { maxOutputTokens: 2500, temperature: 0.45 },
      }),
      signal: AbortSignal.timeout(35_000),
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
  const confData = findConference(conference);

  const report = await runConferenceTrip({
    conference,
    origin,
    budgetTotal: requirements.budget_total || requirements.budget,
    extraDays: requirements.extra_days ? Number(requirements.extra_days) : 0,
    tripStyle: requirements.trip_style,
    userPrefs: requirements.user_prefs,
  });

  if (!report) {
    return {
      deliverable: JSON.stringify({
        report: `# ATLAS Conference Trip: ${conference}\n\nAI temporarily unavailable. Retry shortly.`,
        poweredBy: "ATLAS",
      }),
    };
  }

  const totalMatch = report.match(/\*\*TOTAL\*\*[^$]*\$([0-9,]+)/);

  return {
    deliverable: JSON.stringify({
      report,
      structured: {
        conference_name: confData?.name ?? conference,
        destination: confData?.city ?? "See report",
        airport: confData?.airport ?? "See report",
        dates: confData?.dates ?? "See report",
        estimated_total: totalMatch ? `$${totalMatch[1]}` : "See budget section",
        visa_required: confData?.visa_notes?.toLowerCase().includes("no visa") ? false : true,
      },
      next_step: {
        offering: "multi_conference_router",
        provider: "0xf4b48521960C7e78fCf89859c42d912cdcd0FC06",
        price: 0.8,
        requirements: {
          conferences: [confData?.slug ?? conference, "ADD_ANOTHER"],
          origin,
        },
        hint: "Add more conferences to optimize full-year routing and save $300-800",
      },
      poweredBy: "ATLAS — Crypto Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
