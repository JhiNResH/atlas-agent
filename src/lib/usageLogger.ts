/**
 * Hermes Usage Logger
 * Appends anonymized job data to /app/data/usage.jsonl
 * Used for: trend analysis, DB gap detection, prompt optimization signals
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.HERMES_DATA_DIR || "/app/data";
const LOG_FILE = join(DATA_DIR, "usage.jsonl");

export interface UsageEvent {
  ts: string;
  jobId?: string;
  offering: string;
  // conference offerings
  conference?: string;
  origin?: string;
  data_source?: "static-db" | "web-search" | "not-announced";
  // flight offerings
  destination?: string;
  travel_month?: string;
  // outcome
  success: boolean;
  duration_ms?: number;
  // evaluation signal (filled later when ACP returns result)
  evaluation?: "approved" | "disputed" | "pending";
}

export function logUsage(event: UsageEvent): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify(event) + "\n");
  } catch {
    // Non-fatal — never break a job over logging
  }
}

export function readUsageLog(): UsageEvent[] {
  try {
    if (!existsSync(LOG_FILE)) return [];
    return readFileSync(LOG_FILE, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as UsageEvent);
  } catch {
    return [];
  }
}
