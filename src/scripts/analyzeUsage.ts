#!/usr/bin/env npx tsx
/**
 * Hermes Usage Analyzer
 * Run: npx tsx src/scripts/analyzeUsage.ts [--days 30] [--json]
 *
 * Reads usage.jsonl and outputs:
 * - Top conferences searched
 * - Top origin cities
 * - DB hit rate vs web-search rate (gap detection)
 * - Success rate per offering
 * - Prompt optimization signals (high dispute rate)
 */

import { readUsageLog, type UsageEvent } from "../lib/usageLogger.js";

const args = process.argv.slice(2);
const daysArg = args.find((a) => a.startsWith("--days="))?.split("=")[1];
const jsonMode = args.includes("--json");
const days = daysArg ? parseInt(daysArg) : 30;

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - days);

const all = readUsageLog();
const events = all.filter((e) => new Date(e.ts) >= cutoff);

if (events.length === 0) {
  console.log(`No usage data found in the last ${days} days.`);
  process.exit(0);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function topN<T extends string | undefined>(
  items: T[],
  n = 10
): Array<{ value: string; count: number; pct: string }> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    counts[item] = (counts[item] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({
      value,
      count,
      pct: ((count / total) * 100).toFixed(1) + "%",
    }));
}

function rate(items: boolean[]): string {
  const trueCount = items.filter(Boolean).length;
  return items.length === 0
    ? "N/A"
    : `${((trueCount / items.length) * 100).toFixed(1)}% (${trueCount}/${items.length})`;
}

// ── Analysis ─────────────────────────────────────────────────────────────────

const conferenceEvents = events.filter(
  (e) => e.offering === "conference_travel" || e.offering === "conference_trip"
);
const flightEvents = events.filter(
  (e) => e.offering === "flight_research" || e.offering === "trip_planner"
);
const routerEvents = events.filter((e) => e.offering === "multi_conference_router");

// Top conferences
const topConferences = topN(conferenceEvents.map((e) => e.conference));

// Top origin cities
const topOrigins = topN(events.map((e) => e.origin));

// Top destinations (flight_research + trip_planner)
const topDestinations = topN(flightEvents.map((e) => e.destination));

// DB gap analysis: conferences where web-search > static-db
const dbHitRate = conferenceEvents.filter((e) => e.data_source === "static-db").length;
const webSearchRate = conferenceEvents.filter((e) => e.data_source === "web-search").length;
const notAnnouncedRate = conferenceEvents.filter((e) => e.data_source === "not-announced").length;

// Which conferences consistently needed web search → DB gap
const webSearchConferences = topN(
  conferenceEvents.filter((e) => e.data_source === "web-search").map((e) => e.conference)
);

// Offering success rates
const offeringStats = Object.entries(
  events.reduce(
    (acc, e) => {
      if (!acc[e.offering]) acc[e.offering] = [];
      acc[e.offering].push(e.success);
      return acc;
    },
    {} as Record<string, boolean[]>
  )
).map(([offering, successes]) => ({
  offering,
  total: successes.length,
  successRate: rate(successes),
}));

// Evaluation signals (if available)
const evaluated = events.filter((e) => e.evaluation && e.evaluation !== "pending");
const approvalRate =
  evaluated.length > 0
    ? rate(evaluated.map((e) => e.evaluation === "approved"))
    : "No evaluations yet";

// Disputed jobs by offering (prompt optimization signal)
const disputed = events.filter((e) => e.evaluation === "disputed");
const disputedByOffering = topN(disputed.map((e) => e.offering));

// ── Output ───────────────────────────────────────────────────────────────────

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        period: `Last ${days} days`,
        totalJobs: events.length,
        topConferences,
        topOrigins,
        topDestinations,
        dbGapAnalysis: { dbHitRate, webSearchRate, notAnnouncedRate, webSearchConferences },
        offeringStats,
        evaluationSignals: { approvalRate, disputedByOffering },
      },
      null,
      2
    )
  );
  process.exit(0);
}

// Human-readable report
console.log(`
╔══════════════════════════════════════════════════╗
║        HERMES USAGE REPORT — LAST ${String(days).padEnd(3)} DAYS       ║
╚══════════════════════════════════════════════════╝

Total jobs: ${events.length}  |  Conference: ${conferenceEvents.length}  |  Flight: ${flightEvents.length}  |  Router: ${routerEvents.length}

━━━ 🏆 TOP CONFERENCES SEARCHED ━━━
${topConferences.map((c, i) => `  ${i + 1}. ${c.value} — ${c.count} queries (${c.pct})`).join("\n") || "  (none yet)"}

━━━ ✈️ TOP ORIGIN CITIES ━━━
${topOrigins.map((c, i) => `  ${i + 1}. ${c.value} — ${c.count} queries (${c.pct})`).join("\n") || "  (none yet)"}

━━━ 🌍 TOP DESTINATIONS (flight_research) ━━━
${topDestinations.map((c, i) => `  ${i + 1}. ${c.value} — ${c.count} queries (${c.pct})`).join("\n") || "  (none yet)"}

━━━ 🗄️ DATABASE GAP ANALYSIS ━━━
  Static DB hits:     ${dbHitRate} (${events.length > 0 ? ((dbHitRate / Math.max(conferenceEvents.length, 1)) * 100).toFixed(1) : 0}%)
  Web search used:    ${webSearchRate} (${events.length > 0 ? ((webSearchRate / Math.max(conferenceEvents.length, 1)) * 100).toFixed(1) : 0}%)
  Not yet announced:  ${notAnnouncedRate}

  Conferences with DB gaps (add to crypto-conferences-2026.json):
${webSearchConferences.map((c) => `  ⚠️  ${c.value} — searched ${c.count}× via web fallback`).join("\n") || "  ✅ No gaps detected"}

━━━ 📊 OFFERING SUCCESS RATES ━━━
${offeringStats.map((s) => `  ${s.offering.padEnd(28)} ${s.successRate}  (${s.total} jobs)`).join("\n") || "  (no data)"}

━━━ 🎯 PROMPT OPTIMIZATION SIGNALS ━━━
  Buyer approval rate: ${approvalRate}
  Disputed by offering:
${disputedByOffering.map((d) => `  ⚠️  ${d.value} — ${d.count} disputes`).join("\n") || "  ✅ No disputes"}

━━━ 💡 RECOMMENDATIONS ━━━
${
  webSearchConferences.length > 0
    ? webSearchConferences
        .slice(0, 3)
        .map((c) => `  → Add "${c.value}" to static DB (${c.count} web searches)`)
        .join("\n")
    : "  → Keep monitoring, not enough data yet"
}
${
  disputedByOffering.length > 0
    ? disputedByOffering
        .slice(0, 2)
        .map((d) => `  → Review prompt for "${d.value}" (${d.count} disputes)`)
        .join("\n")
    : ""
}
`);
