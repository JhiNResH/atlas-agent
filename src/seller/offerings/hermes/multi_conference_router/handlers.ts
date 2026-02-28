/**
 * Hermes Multi-Conference Router — ACP Seller Handler ($0.80)
 *
 * Full-year routing optimizer for crypto conference degens.
 * Compares: separate roundtrips vs multi-stop routing.
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { findConference, type Conference } from "../../../../lib/conferences.js";
import { searchFlights, formatOffersForPrompt } from "../../../../lib/amadeus.js";
import { logUsage } from "../../../../lib/usageLogger.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  const conferences = requirements.conferences;
  const origin = requirements.origin || requirements.from;
  if (!conferences || !Array.isArray(conferences) || conferences.length < 2) {
    return {
      valid: false,
      reason:
        'Provide at least 2 conferences. E.g. { conferences: ["TOKEN2049 Singapore", "ETHDenver"], origin: "LAX" }',
    };
  }
  if (!origin) {
    return { valid: false, reason: "Provide your origin/home city." };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const confs = (requirements.conferences || []).join(", ");
  const origin = requirements.origin || "your city";
  return `Optimizing routing for ${confs} from ${origin}. Calculating multi-stop savings vs separate roundtrips. Please proceed with payment.`;
}

async function runMultiRouter(params: {
  conferences: string[];
  origin: string;
  year?: number;
  budgetTotal?: string;
  userPrefs?: Record<string, any>;
  livePrices?: Record<string, string>;
}): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split("T")[0];
  const { conferences, origin, year, budgetTotal, userPrefs, livePrices } = params;

  // Resolve all conferences from DB
  const resolved: { query: string; data: Conference | null }[] = conferences.map((q) => ({
    query: q,
    data: findConference(q),
  }));

  const confDetails = resolved
    .map(({ query, data }) => {
      if (!data) return `- ${query}: (not in DB — use your knowledge)`;
      const priceStr = livePrices?.[data.slug]
        ? `\n  ↳ Live Amadeus: ${livePrices[data.slug]}`
        : "";
      return `- ${data.name}: ${data.dates} | ${data.city}, ${data.country} (${data.airport}) | Stay: ${data.recommended_arrival} → ${data.recommended_departure}${priceStr}`;
    })
    .join("\n");

  const prompt = `You are Hermes, crypto Travel Arbitrage Intelligence specializing in multi-conference routing.
You give VERDICTS. Never say "Set Google Flights alerts." Make concrete book/wait decisions.

TODAY'S DATE: ${todayStr} (year is ${currentYear})
CRITICAL: All dates must be in ${currentYear}. Never output ${currentYear - 1} dates.

HOME CITY: ${origin}
YEAR: ${year || currentYear}
CONFERENCES TO ATTEND (live Amadeus prices where available):
${confDetails}

${budgetTotal ? `Annual Travel Budget: ${budgetTotal}` : ""}
${userPrefs ? `Preferences: ${JSON.stringify(userPrefs)}` : ""}

Analyze the optimal routing strategy. Compare separate roundtrips vs multi-stop itineraries. Use the live Amadeus prices to give real cost estimates.

# 🗺️ Hermes Multi-Conference Router: ${year || currentYear}

## 📊 Route Comparison

### Option A: Separate Roundtrips (baseline)
| Conference | Route | Est. Cost | Book By |
|-----------|-------|-----------|---------|
${resolved.map(({ data, query }) => `| ${data?.name || query} | ${origin} → ${data?.airport || "?"} → ${origin} | $... | ... |`).join("\n")}

**Total separate roundtrips: $[SUM]**

### Option B: Optimized Multi-Stop Routing
Based on geography and dates, the optimal routing is:

[Show the best multi-stop itinerary, e.g.:]
\`${origin} → [Conference 1 city] → [Conference 2 city] → ${origin}\`

- **Leg 1:** [details + est. cost]
- **Leg 2:** [details + est. cost]  
- **Leg 3:** [details + est. cost]

**Total optimized routing: $[SUM]**

### 💰 Savings Analysis
- Separate roundtrips: $[A]
- Optimized routing: $[B]
- **You save: $[A-B] ([X]%)**
- Break-even: [when is multi-stop worth it]

## 📅 Booking Timeline
| Conference | Book Flights By | Book Hotel By | Notes |
|-----------|----------------|---------------|-------|
${resolved.map(({ data, query }) => `| ${data?.name || query} | ... | ... | ... |`).join("\n")}

## ✈️ Points & Miles Strategy (Full Year)
- **Total miles needed (economy all conferences):** [X miles]
- **Best single card to accumulate:** [recommendation]
- **Transfer chain for maximum value:** [specific chain]
- **Verdict:** [pay cash vs points for which legs]

## 🏨 Hotel Strategy
For each conference, book hotels by:
${resolved.map(({ data, query }) => `- **${data?.name || query}:** Book by [date]. Best areas: ${data?.recommended_hotel_areas?.join(", ") || "near venue"}`).join("\n")}

## ⚡ Action Plan — This Week
1. [Most urgent action — closest conference]
2. [Second action]
3. [Third action]
4. ✅ All actions above are concrete — no "set alerts" needed

## 🔮 Bonus: Conferences You Might Be Missing
Based on your travel pattern, also consider:
- [Suggest 1-2 related conferences geographically convenient to add]

---
*Powered by Hermes — Crypto Travel Arbitrage Intelligence*`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  const conferences: string[] = requirements.conferences || [];
  const origin = requirements.origin || requirements.from;

  if (!conferences.length || !origin) {
    return {
      deliverable: JSON.stringify({
        error: "Need conferences array + origin",
        example: {
          conferences: ["TOKEN2049 Singapore", "ETHDenver", "Consensus"],
          origin: "LAX",
        },
        poweredBy: "Hermes",
      }),
    };
  }

  // Log usage
  logUsage({
    ts: new Date().toISOString(),
    offering: "multi_conference_router",
    origin,
    success: true,
  });

  // Fetch Amadeus prices for each conference in parallel (cap at 4 to avoid timeout)
  const resolved = conferences.slice(0, 4).map((q) => ({ q, data: findConference(q) }));
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
  const livePrices: Record<string, string> = {};
  await Promise.allSettled(
    resolved
      .filter(({ data }) => data?.airport)
      .map(async ({ data }) => {
        if (!data) return;
        const arrStr = data.recommended_arrival || "";
        const match = arrStr.match(/([A-Za-z]+)\s+(\d+)/);
        let depDate: string;
        if (match) {
          const mon = months[match[1]] || "06";
          const yr = new Date().getFullYear() + (parseInt(mon) < new Date().getMonth() + 1 ? 1 : 0);
          depDate = `${yr}-${mon}-${String(match[2]).padStart(2, "0")}`;
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 90);
          depDate = d.toISOString().split("T")[0];
        }
        try {
          const result = await searchFlights({
            origin: origin.trim().toUpperCase(),
            destination: data.airport,
            departureDate: depDate,
            max: 3,
          });
          livePrices[data.slug] = formatOffersForPrompt(result);
        } catch {
          /* silent fallback */
        }
      })
  );

  const report = await runMultiRouter({
    conferences,
    origin,
    year: requirements.year,
    budgetTotal: requirements.budget_total,
    userPrefs: requirements.user_prefs,
    livePrices: Object.keys(livePrices).length > 0 ? livePrices : undefined,
  });

  if (!report) {
    return {
      deliverable: JSON.stringify({
        report: `# Hermes Multi-Conference Router\n\nAI temporarily unavailable. Retry shortly.`,
        poweredBy: "Hermes",
      }),
    };
  }

  // Extract savings estimate
  const savingsMatch = report.match(/\*\*You save:\s*\$([0-9,]+)/);
  const separateMatch = report.match(/Separate roundtrips:\s*\$([0-9,]+)/);
  const optimizedMatch = report.match(/Optimized routing:\s*\$([0-9,]+)/);

  return {
    deliverable: JSON.stringify({
      report,
      structured: {
        conferences_planned: conferences,
        origin,
        separate_roundtrips_cost: separateMatch ? `$${separateMatch[1]}` : "See report",
        optimized_routing_cost: optimizedMatch ? `$${optimizedMatch[1]}` : "See report",
        estimated_savings: savingsMatch ? `$${savingsMatch[1]}` : "See report",
        recommended_routing: conferences,
      },
      poweredBy: "Hermes — Crypto Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
