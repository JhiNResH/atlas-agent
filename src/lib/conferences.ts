/**
 * Crypto conference lookup utility.
 * Loads from references/crypto-conferences-2026.json
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Conference {
  name: string;
  slug: string;
  dates: string;
  side_events_dates: string;
  venue: string;
  city: string;
  state?: string;
  country: string;
  airport: string;
  airport_alt?: string;
  recommended_arrival: string;
  recommended_departure: string;
  recommended_hotel_areas: string[];
  notable_side_events: string[];
  visa_notes: string;
  website: string;
  tags: string[];
}

let _cache: Record<string, Conference> | null = null;

function loadAll(): Record<string, Conference> {
  if (_cache) return _cache;
  const dbPath = path.resolve(__dirname, "../../references/crypto-conferences-2026.json");
  _cache = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  return _cache!;
}

/**
 * Find a conference by name, slug, or keyword.
 * Returns the best match or null.
 */
export function findConference(query: string): Conference | null {
  const db = loadAll();
  const q = query.toLowerCase().trim();

  // Exact slug match
  if (db[q]) return db[q];

  // Score each conference
  const scored = Object.values(db).map((conf) => {
    let score = 0;
    const searchable = [conf.name, conf.slug, conf.city, conf.country, ...conf.tags]
      .join(" ")
      .toLowerCase();

    // Word-by-word matching
    for (const word of q.split(/\s+/)) {
      if (word.length < 3) continue;
      if (searchable.includes(word)) score += word.length;
    }

    return { conf, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].conf : null;
}

/** List all conferences as a summary string for Gemini context */
export function listConferencesSummary(): string {
  const db = loadAll();
  return Object.values(db)
    .map((c) => `- ${c.name} (${c.dates}) — ${c.city}, ${c.country} [${c.slug}]`)
    .join("\n");
}

/** Get all conferences as array */
export function getAllConferences(): Conference[] {
  return Object.values(loadAll());
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseConferenceDateRange(dates: string): { start: Date; end: Date } | null {
  // Handles: "Feb 27 - Mar 8, 2026" or "Sep 24-26, 2026"
  const yearMatch = dates.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  const rangeMatch = dates.match(/([A-Za-z]+)\s+(\d+)\s*[-–]\s*(?:([A-Za-z]+)\s+)?(\d+)/);
  if (!rangeMatch) return null;

  const startMonth = MONTH_MAP[rangeMatch[1].toLowerCase().slice(0, 3)];
  const startDay = parseInt(rangeMatch[2]);
  const endMonth = rangeMatch[3] ? MONTH_MAP[rangeMatch[3].toLowerCase().slice(0, 3)] : startMonth;
  const endDay = parseInt(rangeMatch[4]);

  if (startMonth === undefined || endMonth === undefined) return null;

  return {
    start: new Date(year, startMonth, startDay),
    end: new Date(year, endMonth, endDay, 23, 59),
  };
}

export type ConferenceStatus = "upcoming" | "ongoing" | "past";

/**
 * Returns whether a conference is upcoming, currently ongoing, or already past.
 */
export function getConferenceStatus(conf: Conference): ConferenceStatus {
  const now = new Date();
  const range = parseConferenceDateRange(conf.dates);
  if (!range) return "upcoming"; // Can't parse → assume upcoming
  if (now < range.start) return "upcoming";
  if (now > range.end) return "past";
  return "ongoing";
}

/**
 * Returns a warning string if the conference is past or starting today.
 * Returns null if no warning needed.
 */
export function getConferenceWarning(conf: Conference): string | null {
  const status = getConferenceStatus(conf);
  if (status === "past") {
    return `⚠️ **${conf.name} has already ended** (${conf.dates}). This report is for future planning reference only.`;
  }
  if (status === "ongoing") {
    return `ℹ️ **${conf.name} is happening right now** (${conf.dates}). Flight planning for this conference may be too late — consider planning for next year.`;
  }
  return null;
}
