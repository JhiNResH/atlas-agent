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
