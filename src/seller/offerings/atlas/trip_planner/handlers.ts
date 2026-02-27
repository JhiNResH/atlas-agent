/**
 * ATLAS Trip Planner — ACP Seller Handler
 *
 * Full trip orchestration ($0.50):
 * flights + hotels + visa + day-by-day itinerary
 * Powered by Gemini Flash
 */

import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  const origin = requirements.origin || requirements.from;
  const dest = requirements.destination || requirements.to;
  if (!origin || !dest) {
    const raw = requirements.message || Object.values(requirements).join(" ");
    if (!raw || raw.trim().length < 6) {
      return {
        valid: false,
        reason:
          'Provide origin and destination. E.g. { origin: "LAX", destination: "Tokyo", duration_days: 7, budget_total: "$3000" }',
      };
    }
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const origin = requirements.origin || requirements.from || "your city";
  const dest = requirements.destination || requirements.to || "your destination";
  const days = requirements.duration_days ? ` ${requirements.duration_days}-day` : "";
  return `Planning your${days} trip from ${origin} to ${dest} — flights, hotels, visa + itinerary. Please proceed with payment.`;
}

async function runTripOrchestration(params: {
  origin: string;
  destination: string;
  durationDays?: number;
  travelMonth?: string;
  budgetTotal?: string;
  travelers?: number;
  tripStyle?: string;
}): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const { origin, destination, durationDays, travelMonth, budgetTotal, travelers, tripStyle } = params;
  const days = durationDays ?? 7;

  const contextLines = [
    `Duration: ${days} days`,
    travelMonth ? `Travel time: ${travelMonth}` : "",
    budgetTotal ? `Total budget: ${budgetTotal}` : "",
    `Travelers: ${travelers ?? 1}`,
    tripStyle ? `Style: ${tripStyle}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are ATLAS, a Travel Arbitrage Intelligence agent. Create a comprehensive trip plan.

Route: ${origin} → ${destination}
${contextLines}

Produce structured markdown with all sections. Be specific: real hotel names, real airline names, real price estimates, real neighborhoods to stay.

---

# 🌍 ATLAS Trip Plan: ${origin} → ${destination}

## ✈️ Flights
- **Best airline(s)**: [specific carriers + estimated roundtrip price]
- **Cheapest booking strategy**: [direct vs OTA, when to book]
- **Estimated flight cost**: [economy roundtrip range]
- **Pro tip**: [one specific money-saving hack for this exact route]

## 🏨 Hotels
Recommend 3 options:

| Option | Name / Neighborhood | Est. Price/Night | Best For |
|--------|---------------------|-----------------|----------|
| Budget | ... | $XX | ... |
| Mid-range | ... | $XX | ... |
| Splurge | ... | $XX | ... |

- **Best booking platform**: [Booking.com / Airbnb / direct]
- **Best neighborhoods to stay**: [2-3 specific areas with why]

## 🛂 Visa & Entry (US Passport)
- **Visa required**: Yes / No
- **Type**: [visa on arrival / e-visa / visa-free / embassy visa]
- **How to apply**: [steps, cost, processing time]
- **Entry requirements**: [passport validity, vaccination, etc.]

## 📅 ${days}-Day Itinerary
Day-by-day (mix of free and paid activities):

**Day 1**: [arrival + specific activity]
**Day 2**: [...]
[continue for all ${days} days]

## 💰 Budget Breakdown (1 person)
| Category | Estimated Cost |
|----------|---------------|
| Flights (roundtrip) | $... |
| Hotel (${days} nights) | $... |
| Food (~$X/day × ${days}) | $... |
| Activities | $... |
| Local transport | $... |
| **TOTAL ESTIMATED** | **$...** |

## ⚡ Action Plan — Do This Now
1. [First specific action]
2. [Second action]
3. [Third action]

---
*Powered by ATLAS — Travel Arbitrage Intelligence*`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.5 },
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

function extractMeta(report: string) {
  return {
    flightSummary:
      report.match(/\*\*Best airline[^:]*:\*\*\s*([^\n]+)/)?.[1]?.trim() ?? "See report",
    hotelSummary:
      report.match(/\*\*Best booking platform\*\*:\s*([^\n]+)/)?.[1]?.trim() ?? "See report",
    visaRequired:
      (report.match(/\*\*Visa required\*\*:\s*(Yes|No)/i)?.[1]?.toLowerCase() ?? "no") === "yes",
    estimatedTotalCost:
      report.match(/\*\*TOTAL ESTIMATED\*\*[^$]*\$([0-9,]+)/)?.[1]
        ? `$${report.match(/\*\*TOTAL ESTIMATED\*\*[^$]*\$([0-9,]+)/)?.[1]}`
        : "See budget breakdown",
  };
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  let origin = requirements.origin || requirements.from || requirements.departure;
  let destination = requirements.destination || requirements.to || requirements.dest;
  const durationDays = requirements.duration_days ?? requirements.days ?? requirements.duration;
  const travelMonth = requirements.travel_month || requirements.month;
  const budgetTotal = requirements.budget_total || requirements.budget;
  const travelers = requirements.travelers ?? requirements.pax ?? 1;
  const tripStyle = requirements.trip_style || requirements.style;

  // Raw message fallback
  if (!origin || !destination) {
    const raw =
      requirements.message || requirements.promo_message || Object.values(requirements).join(" ");
    if (raw) {
      const match =
        raw.match(/(?:from\s+)?([A-Za-z\s]+?)\s+(?:to|→|->)\s+([A-Za-z\s]+?)(?:\s+for|\s+in|\s*$)/i) ||
        raw.match(/([A-Z]{3})\s+(?:to|→|->)\s+([A-Z]{3})/i);
      if (match) {
        origin = origin || match[1]?.trim();
        destination = destination || match[2]?.trim();
      }
    }
  }

  if (!origin || !destination) {
    return {
      deliverable: JSON.stringify({
        error: "Missing route",
        usage: '{ origin: "LAX", destination: "Tokyo", duration_days: 7, budget_total: "$3000" }',
        poweredBy: "ATLAS — Travel Arbitrage Intelligence",
      }),
    };
  }

  const report = await runTripOrchestration({
    origin: origin.trim(),
    destination: destination.trim(),
    durationDays: durationDays ? Number(durationDays) : undefined,
    travelMonth,
    budgetTotal,
    travelers: travelers ? Number(travelers) : 1,
    tripStyle,
  });

  if (!report) {
    return {
      deliverable: JSON.stringify({
        report: `# ATLAS Trip Plan: ${origin} → ${destination}\n\nAI analysis temporarily unavailable. Retry shortly.\n\n**Quick start:**\n1. Google Flights: ${origin} → ${destination}\n2. Booking.com for hotels\n3. Check visa: cibt.com`,
        flightSummary: "Check Google Flights",
        hotelSummary: "Check Booking.com",
        visaRequired: null,
        estimatedTotalCost: "Varies",
        poweredBy: "ATLAS — Travel Arbitrage Intelligence",
      }),
    };
  }

  const meta = extractMeta(report);
  return {
    deliverable: JSON.stringify({
      report,
      ...meta,
      route: { origin: origin.trim(), destination: destination.trim() },
      poweredBy: "ATLAS — Travel Arbitrage Intelligence | Powered by Gemini Flash",
    }),
  };
}
