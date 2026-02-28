/**
 * Hermes Conference Trip — ACP Seller Handler ($0.60)
 *
 * Full conference trip: flights + hotels near venue + side events + budget
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { findConference, getConferenceWarning } from "../../../../lib/conferences.js";
import { searchConferenceInfo } from "../../../../lib/conferenceSearch.js";
import { searchFlights, formatOffersForPrompt } from "../../../../lib/amadeus.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

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
  liveInfo?: {
    name: string;
    city: string;
    country: string;
    airport: string;
    dates: string;
    venue?: string;
  } | null;
  livePrice?: string;
}): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const { conference, origin, budgetTotal, extraDays, tripStyle, userPrefs, liveInfo, livePrice } =
    params;
  const confData = findConference(conference);
  const style = tripStyle ?? "mid-range";
  const effectiveCity = confData?.city ?? liveInfo?.city ?? conference;
  const effectiveVenue = confData?.venue ?? liveInfo?.venue ?? "See conference website";

  const confContext = confData
    ? `
CONFERENCE (verified static DB):
- Name: ${confData.name} | Dates: ${confData.dates}
- Side Events: ${confData.side_events_dates}
- Venue: ${confData.venue}
- Location: ${confData.city}, ${confData.country} (Airport: ${confData.airport})
- Recommended stay: ${confData.recommended_arrival} → ${confData.recommended_departure}${extraDays ? ` + ${extraDays} extra days` : ""}
- Best hotel areas: ${confData.recommended_hotel_areas.join(", ")}
- Side events to know: ${confData.notable_side_events.join(", ")}
- Visa (US passport): ${confData.visa_notes}
`
    : liveInfo
      ? `
CONFERENCE (real-time web search):
- Name: ${liveInfo.name} | Dates: ${liveInfo.dates}
- Location: ${liveInfo.city}, ${liveInfo.country} (Airport: ${liveInfo.airport})
- Venue: ${liveInfo.venue ?? "See official website"}
`
      : `CONFERENCE: ${conference} — use your knowledge for details`;

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split("T")[0];

  const prompt = `You are Hermes, crypto Travel Arbitrage Intelligence.
You give VERDICTS, not suggestions. Make concrete buy/wait/avoid decisions backed by data.
NEVER say "set up Google Flights alerts" or "monitor prices" — that's what Skyscanner says.
Instead: look at the live Amadeus prices below and tell the user whether to BUY NOW or WAIT, and WHY.

TODAY'S DATE: ${todayStr} (year is ${currentYear})
CRITICAL: All dates in your response must be in ${currentYear}. Never output ${currentYear - 1} dates.

Route: ${origin} → ${effectiveCity}
${confContext}
${livePrice ? `━━━ LIVE AMADEUS PRICES (real-time, queried just now) ━━━\n${livePrice}\n━━━ Use these exact prices in your analysis. Do NOT say "check Google Flights." ━━━\n` : "⚠️ No live price data — use your knowledge of typical ${origin}→${effectiveCity} fares."}
Budget: ${budgetTotal || "flexible"}
Style: ${style}
${userPrefs ? `Preferences: ${JSON.stringify(userPrefs)}` : ""}

Produce a complete, opinionated conference trip plan for ${currentYear}.

# 🌍 Hermes Conference Trip: ${liveInfo?.name ?? confData?.name ?? conference}

## ✈️ Flights from ${origin}
- **Best option:** [airline + exact price from Amadeus data above + dates in ${currentYear}]
- **Budget option:** [airline + layover + price]
- **🟢 VERDICT: BUY NOW / 🟡 WAIT X WEEKS / 🔴 AVOID** — [1-sentence reason based on price vs. typical range for this route. E.g. "Current $XXX is 12% below the ${currentYear} average for this route — buy now before conference demand spikes."]

## 🏨 Hotels Near Venue
(Prioritize walking distance or short ride to ${effectiveVenue})

| Option | Hotel Name | Area | Price/Night | Distance |
|--------|-----------|------|-------------|----------|
| Budget | [real hotel name] | [neighborhood] | $XX | [X min walk/ride] |
| Mid-range | [real hotel name] | [neighborhood] | $XX | [X min walk/ride] |
| Splurge | [real hotel name] | [neighborhood] | $XX | [X min walk/ride] |

- **Book by:** [specific date — "conference hotels sell out 8-12 weeks before; you have until [date]"]
- **Best platform:** [Booking.com / hotel direct / etc. and why]

## 📅 Conference Schedule & Side Events
- **Main event:** ${confData?.dates ?? liveInfo?.dates ?? `See conference website (${currentYear})`}
- **Key side events:** ${confData?.notable_side_events?.join(", ") || "Check conference socials"}
- **Recommended schedule:**
  - [Arrive Day -2]: [reason]
  - [Day -1]: Side events
  - [Days 1–X]: Main conference
  - [Day +1]: Depart or explore

## 🛂 Entry Requirements (US Passport)
- ${confData?.visa_notes || "Check current entry requirements"}
- Passport validity: [minimum months required]

## 💰 Budget Breakdown (1 person, ${currentYear})
| Category | Cost |
|----------|------|
| Flights (roundtrip) | $[from Amadeus data] |
| Hotel ([X] nights × $[rate]) | $... |
| Food & drinks | $... |
| Conference ticket | $... |
| Local transport | $... |
| **TOTAL** | **$...** |

## ⚡ Do This Right Now (in order)
1. **Flights** — [Specific action: "Book [airline] at $[price] on [platform]. This is the lowest available now. Price likely rises within [X] weeks."]
2. **Hotel** — [Specific action: "[Hotel name] in [area] at $[price]/night on [platform]. Book before [date]."]
3. **Side events** — [Register for [specific event] at [link/platform]]
4. **Visa/docs** — [If required: specific steps. If not: "No action needed (US passport)."]

---

## 🗺️ Going to Multiple Conferences This Year?
Hermes can optimize your full-year routing and save $300-800 on multi-conference trips.

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
*Powered by Hermes — Crypto Travel Arbitrage Intelligence*`;

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

  // Web search fallback if not in DB or dates are TBC
  let liveInfo = null;
  let notYetAnnounced = false;
  if (!confData || confData.dates.includes("TBC")) {
    console.log(`[hermes:trip] Conference "${conference}" not in DB or TBC — searching web…`);
    liveInfo = await searchConferenceInfo(conference);
    if (liveInfo) {
      console.log(
        `[hermes:trip] Web search found: ${liveInfo.name} @ ${liveInfo.city}, ${liveInfo.dates}`
      );
    } else {
      notYetAnnounced = !confData;
      console.log(`[hermes:trip] No confirmed data found for "${conference}"`);
    }
  }

  // Early exit: dates not yet announced
  if (notYetAnnounced) {
    return {
      deliverable: JSON.stringify({
        report: `# Hermes Conference Trip: ${conference}\n\n⏳ **${new Date().getFullYear()} dates not yet announced.**\n\nHermes searched the web but could not find confirmed ${new Date().getFullYear()} details for this conference. Check the official website or follow their socials for the announcement.\n\nOnce dates are confirmed, retry this job for a full trip plan with flights, hotels, and budget breakdown.\n\n*Powered by Hermes — Crypto Travel Arbitrage Intelligence*`,
        structured: { conference_name: conference, data_source: "not-announced" },
        poweredBy: "Hermes",
      }),
    };
  }

  // TBC warning: only show if liveInfo didn't resolve the dates
  const conferenceWarning = confData && !liveInfo ? getConferenceWarning(confData) : null;

  // Fetch live flight prices
  const effectiveAirport = confData?.airport ?? liveInfo?.airport;
  let livePrice: string | undefined;
  if (effectiveAirport) {
    try {
      const arrStr = confData?.recommended_arrival ?? liveInfo?.dates?.split("-")[0] ?? "";
      const months: Record<string, string> = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };
      const match = arrStr.match(/([A-Za-z]+)\s+(\d+)/);
      let departureDate: string;
      if (match) {
        const mon = months[match[1]] || "06";
        const yr = new Date().getFullYear() + (parseInt(mon) < new Date().getMonth() + 1 ? 1 : 0);
        departureDate = `${yr}-${mon}-${String(match[2]).padStart(2, "0")}`;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 56);
        departureDate = d.toISOString().split("T")[0];
      }
      const result = await searchFlights({
        origin: origin.trim().toUpperCase(),
        destination: effectiveAirport,
        departureDate,
        max: 5,
      });
      livePrice = formatOffersForPrompt(result);
    } catch {
      // Silent fallback
    }
  }

  const rawReport = await runConferenceTrip({
    conference,
    origin,
    budgetTotal: requirements.budget_total || requirements.budget,
    extraDays: requirements.extra_days ? Number(requirements.extra_days) : 0,
    tripStyle: requirements.trip_style,
    userPrefs: requirements.user_prefs,
    liveInfo,
    livePrice,
  });

  if (!rawReport) {
    return {
      deliverable: JSON.stringify({
        report: `# Hermes Conference Trip: ${conference}\n\nAI temporarily unavailable. Retry shortly.`,
        poweredBy: "Hermes",
      }),
    };
  }

  const report = conferenceWarning ? `${conferenceWarning}\n\n${rawReport}` : rawReport;
  const totalMatch = report.match(/\*\*TOTAL\*\*[^$]*\$([0-9,]+)/);

  return {
    deliverable: JSON.stringify({
      report,
      structured: {
        conference_name: liveInfo?.name ?? confData?.name ?? conference,
        destination: confData?.city ?? liveInfo?.city ?? "See report",
        airport: confData?.airport ?? liveInfo?.airport ?? "See report",
        dates: confData?.dates ?? liveInfo?.dates ?? "See report",
        data_source: liveInfo ? "web-search" : "static-db",
        estimated_total: totalMatch ? `$${totalMatch[1]}` : "See budget section",
        visa_required: (() => {
          const notes = (confData?.visa_notes ?? liveInfo?.visa_notes ?? "").toLowerCase();
          return notes ? !notes.includes("no visa") : null; // null = unknown
        })(),
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
      poweredBy: "Hermes — Crypto Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
