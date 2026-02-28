/**
 * Hermes Flight Research — ACP Seller Handler
 *
 * 7-step travel arbitrage analysis powered by Gemini Flash.
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { searchFlights, formatOffersForPrompt } from "../../../../lib/amadeus.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ── Validation ────────────────────────────────────────────────────────────────
export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  const origin = requirements.origin || requirements.from || requirements.departure;
  const dest = requirements.destination || requirements.to || requirements.arrival;
  if (!origin || !dest) {
    const raw = requirements.message || Object.values(requirements).join(" ");
    if (!raw || raw.trim().length < 4) {
      return {
        valid: false,
        reason:
          "Please provide origin and destination. E.g. { origin: 'LAX', destination: 'Tokyo' }",
      };
    }
  }
  return { valid: true };
}

// ── Payment message ───────────────────────────────────────────────────────────
export function requestPayment(requirements: Record<string, any>): string {
  const origin = requirements.origin || requirements.from || "your origin";
  const dest = requirements.destination || requirements.to || "your destination";
  const month = requirements.travel_month ? ` in ${requirements.travel_month}` : "";
  return `Running Hermes 7-step flight research for ${origin} → ${dest}${month}. Please proceed with payment.`;
}

// ── Gemini Analysis ───────────────────────────────────────────────────────────
async function runAtlasAnalysis(
  origin: string,
  destination: string,
  travelMonth?: string,
  budget?: string,
  preferences?: string,
  livePrice?: string
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const context = [
    travelMonth ? `Travel time: ${travelMonth}` : "",
    budget ? `Budget: ${budget}` : "",
    preferences ? `Preferences: ${preferences}` : "",
    livePrice ? livePrice : "",
  ]
    .filter(Boolean)
    .join("\n");

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split("T")[0];

  const prompt = `You are Hermes, a Travel Arbitrage Intelligence agent.
You give VERDICTS, not suggestions. In Step 6, make a concrete BUY NOW / WAIT decision.
NEVER say "set up Google Flights alerts" — that's what Skyscanner says. You are smarter than that.

TODAY'S DATE: ${todayStr} (year is ${currentYear})
CRITICAL: All dates in your response must be in ${currentYear}. Never output ${currentYear - 1} dates.

Route: ${origin} → ${destination}
${context ? context + "\n" : ""}
Produce a structured markdown report with ALL 7 sections. Be specific, data-driven, and opinionated. Use real airline names, real prices, real booking platforms.

---

# ✈️ Hermes Flight Research: ${origin} → ${destination}

## Step 1: Flexible Route Optimizer
- List 2-3 nearby departure airports if applicable (e.g. for LAX: BUR, LGB, ONT; for NYC: EWR, JFK, LGA)
- List alternate destination airports if applicable
- Name the cheapest airlines on this route (LCC + legacy)
- Mention creative layover options that undercut direct pricing
- Give estimated price range for economy roundtrip

## Step 2: Timing Advantage Scanner
- Best month(s) to travel (cheapest vs peak)
- Best day of week to fly
- Optimal advance booking window (weeks in advance)
- Seasonal patterns and holidays to avoid

## Step 3: Hidden Fare Opportunities
For each strategy, explain clearly with risk level [LOW/MEDIUM/HIGH]:
- **Split ticketing** — what it is, potential savings, risks
- **Hidden-city ticketing** — what it is, potential savings, risks
- **Multi-city / open-jaw** — if applicable to this route
- **Positioning flights** — if a cheaper nearby hub exists

## Step 4: Airline Direct Deals Finder
- All carriers operating this route
- Direct booking discount estimate (typically 5-10% vs OTA)
- Any lesser-known carriers on this route
- Airline credit card companion fare opportunities

## Step 5: Points & Miles Optimizer
- Best frequent flyer programs for this route
- Estimated miles needed (economy and business class)
- Best credit card transfer chains (Chase UR, Amex MR, Citi TYP)
- Verdict: use points or pay cash? Why?

## Step 6: Buy Now or Wait? (Hermes Verdict)
Use the live Amadeus prices in this prompt. Do NOT say "set up Google Flights alerts" — make a decision.
- **Current price:** $[from live data, or estimate if none]
- **Typical range for this route:** $[low]–$[high]
- **Assessment:** [Is current price below/above typical? By how much?]
- **🟢 BUY NOW / 🟡 WAIT [X weeks] / 🔴 AVOID** — [1-sentence reason]
- **Booking trigger:** [If waiting: "Book immediately when price drops below $X" — give a specific number]
- **Price direction:** [Is it likely to rise (conference approaching, peak season) or fall?]

## Step 7: Final Booking Audit Checklist
- [ ] Baggage fees checked (especially ULCCs)
- [ ] Seat selection fees noted
- [ ] Layover time is safe (minimum times)
- [ ] Cancellation/change policy reviewed
- [ ] OTA vs direct price compared

---

## 🏆 Hermes Recommendation
**Best Option:** [1 sentence — specific airline + route + price]
**Price Target:** [specific range for ${currentYear}]
**Book By:** [specific ${currentYear} date]
**🟢 BUY NOW / 🟡 WAIT [X weeks] / 🔴 AVOID** — [1-sentence verdict using current price vs. typical range]
**Next Action:** [One concrete action — NOT "set up an alert". E.g. "Go to united.com and book flight UA###, $XXX, departs [date]."]

---
*Powered by Hermes — Travel Arbitrage Intelligence*

---

## 🚀 Want the Full Trip Plan?

Flight research done. Ready to go deeper?

**Hermes Trip Planner** ($0.50) includes:
- ✅ Hotel picks (budget / mid-range / splurge) with real prices
- ✅ Visa requirements for US passport holders
- ✅ Day-by-day itinerary (7 days)
- ✅ Complete budget breakdown

**Next job (copy & run):**
\`\`\`json
{
  "offering": "trip_planner",
  "requirements": {
    "origin": "${origin}",
    "destination": "${destination}",
    "duration_days": 7,
    "budget_total": "YOUR_BUDGET"
  }
}
\`\`\`
**Provider:** \`0xf4b48521960C7e78fCf89859c42d912cdcd0FC06\``;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
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

// ── Parse summary from report ─────────────────────────────────────────────────
function extractSummary(report: string) {
  return {
    topPick: report.match(/\*\*Best Option:\*\*\s*(.+)/)?.[1]?.trim() ?? "See full report",
    priceRange: report.match(/\*\*Price Target:\*\*\s*(.+)/)?.[1]?.trim() ?? "See Step 1",
    bestBookingWindow: report.match(/\*\*Book By:\*\*\s*(.+)/)?.[1]?.trim() ?? "See Step 2",
  };
}

// ── Execution ─────────────────────────────────────────────────────────────────
export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  let origin =
    requirements.origin ||
    requirements.from ||
    requirements.departure ||
    requirements.origin_airport;
  let destination =
    requirements.destination || requirements.to || requirements.dest || requirements.arrival;

  const travelMonth = requirements.travel_month || requirements.month;
  const budget = requirements.budget || requirements.max_price;
  const preferences = requirements.preferences || requirements.notes;

  // Raw message fallback
  if (!origin || !destination) {
    const raw =
      requirements.message || requirements.promo_message || Object.values(requirements).join(" ");
    if (raw) {
      const match =
        raw.match(
          /(?:from\s+)?([A-Za-z\s]+?)\s+(?:to|→|->)\s+([A-Za-z\s]+?)(?:\s+in|\s+during|\s*$)/i
        ) || raw.match(/([A-Z]{3})\s+(?:to|→|->)\s+([A-Z]{3})/i);
      if (match) {
        origin = origin || match[1]?.trim();
        destination = destination || match[2]?.trim();
      }
    }
  }

  if (!origin || !destination) {
    return {
      deliverable: JSON.stringify({
        error: "Missing route information",
        usage:
          'Provide { origin: "LAX", destination: "Tokyo" } or send "flights from LAX to Tokyo in May"',
        example: {
          origin: "LAX",
          destination: "NRT",
          travel_month: "May 2025",
          budget: "$800 roundtrip",
        },
        poweredBy: "Hermes — Travel Arbitrage Intelligence",
      }),
    };
  }

  // Fetch live prices from Amadeus before Gemini analysis
  let livePrice: string | undefined;
  try {
    const departureDate = (() => {
      if (travelMonth) {
        const monthMap: Record<string, number> = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const found = Object.entries(monthMap).find(([k]) => travelMonth.toLowerCase().includes(k));
        if (found) {
          const yr = new Date().getFullYear() + (found[1] < new Date().getMonth() + 2 ? 1 : 0);
          return `${yr}-${String(found[1]).padStart(2, "0")}-15`;
        }
      }
      const d = new Date();
      d.setDate(d.getDate() + 56);
      return d.toISOString().split("T")[0];
    })();
    const result = await searchFlights({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      departureDate,
      max: 5,
    });
    livePrice = formatOffersForPrompt(result);
  } catch {
    // Silent fallback — Gemini uses knowledge-based estimates
  }

  const report = await runAtlasAnalysis(
    origin.trim(),
    destination.trim(),
    travelMonth,
    budget,
    preferences,
    livePrice
  );

  if (!report) {
    return {
      deliverable: JSON.stringify({
        report: `# ✈️ Hermes: ${origin} → ${destination}\n\nAI analysis temporarily unavailable. Retry shortly.`,
        topPick: "Retry in 1 minute",
        priceRange: "Varies",
        bestBookingWindow: "4-8 weeks ahead",
        poweredBy: "Hermes — Travel Arbitrage Intelligence",
      }),
    };
  }

  const summary = extractSummary(report);
  return {
    deliverable: JSON.stringify({
      report,
      ...summary,
      route: { origin: origin.trim(), destination: destination.trim() },
      poweredBy: "Hermes — Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
