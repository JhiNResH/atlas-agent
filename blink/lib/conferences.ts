/**
 * Conference data re-export for Blink endpoint
 * Imports from main hermes-acp conferences.ts
 */

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

// Inline conference data for Next.js (can't import from parent dir easily)
const CONFERENCES: Record<string, Conference> = {
  "ethcc-2026": {
    name: "EthCC[9]",
    slug: "ethcc-2026",
    dates: "Mar 30 - Apr 2, 2026",
    side_events_dates: "Mar 28-29, 2026",
    venue: "Palais des Festivals, Cannes",
    city: "Cannes",
    country: "France",
    airport: "NCE",
    airport_alt: "MRS",
    recommended_arrival: "Mar 28",
    recommended_departure: "Apr 3",
    recommended_hotel_areas: ["Cannes city centre", "La Croisette", "Nice (commute by train)"],
    notable_side_events: [
      "EthCC fringe events",
      "L2 ecosystem side events",
      "DeFi builder dinners",
    ],
    visa_notes: "US passport: visa-free in Schengen area (90 days)",
    website: "https://ethcc.io",
    tags: ["ethereum", "L2", "defi", "infrastructure", "developers", "web3", "ethcc"],
  },
  "consensus-2026": {
    name: "Consensus Miami 2026",
    slug: "consensus-2026",
    dates: "May 5-7, 2026",
    side_events_dates: "May 3-4, 2026",
    venue: "Miami Beach Convention Center",
    city: "Miami",
    state: "FL",
    country: "USA",
    airport: "MIA",
    airport_alt: "FLL",
    recommended_arrival: "May 3",
    recommended_departure: "May 8",
    recommended_hotel_areas: ["South Beach", "Midtown Miami", "Brickell", "Downtown Miami"],
    notable_side_events: [
      "Miami Blockchain Week",
      "NFT side events",
      "DeFi Summit",
      "VC networking dinners",
    ],
    visa_notes: "US passport: no visa needed",
    website: "https://consensus.coindesk.com",
    tags: ["crypto", "blockchain", "bitcoin", "ethereum", "defi", "institutional", "consensus"],
  },
  "token2049-singapore-2026": {
    name: "TOKEN2049 Singapore",
    slug: "token2049-singapore-2026",
    dates: "Oct 7-8, 2026",
    side_events_dates: "Oct 5-6, 2026",
    venue: "Marina Bay Sands, Singapore",
    city: "Singapore",
    country: "Singapore",
    airport: "SIN",
    recommended_arrival: "Oct 5",
    recommended_departure: "Oct 9",
    recommended_hotel_areas: ["Marina Bay", "Orchard Road", "Bugis/City Hall"],
    notable_side_events: ["TOKEN2049 Side Events Week", "Various Singapore Web3 events"],
    visa_notes: "US passport: visa-free up to 90 days",
    website: "https://www.token2049.com",
    tags: ["crypto", "defi", "web3", "bitcoin", "altcoin", "asia", "token2049"],
  },
  "ethdenver-2026": {
    name: "ETHDenver 2026",
    slug: "ethdenver-2026",
    dates: "Feb 27 - Mar 8, 2026",
    side_events_dates: "Feb 25-26, 2026",
    venue: "National Western Complex, Denver CO",
    city: "Denver",
    state: "CO",
    country: "USA",
    airport: "DEN",
    recommended_arrival: "Feb 25",
    recommended_departure: "Mar 9",
    recommended_hotel_areas: ["Downtown Denver", "RiNo (River North)", "LoDo"],
    notable_side_events: ["#BUIDLWEEK (hackathon)", "ETHDenver side events"],
    visa_notes: "US passport: no visa needed",
    website: "https://www.ethdenver.com",
    tags: ["ethereum", "defi", "hackathon", "web3", "buidl", "ethdenver"],
  },
  "devcon-2026": {
    name: "Devcon 8",
    slug: "devcon-2026",
    dates: "Nov 3-6, 2026",
    side_events_dates: "Nov 1-2, 2026",
    venue: "Mumbai, India (exact venue TBC)",
    city: "Mumbai",
    country: "India",
    airport: "BOM",
    recommended_arrival: "Nov 1",
    recommended_departure: "Nov 7",
    recommended_hotel_areas: ["Bandra Kurla Complex (BKC)", "Juhu", "Andheri"],
    notable_side_events: [
      "ETHGlobal hackathon",
      "Indian Web3 ecosystem events",
      "Devcon side events",
    ],
    visa_notes:
      "US passport: e-Visa required (apply at indianvisaonline.gov.in, 3-5 days processing)",
    website: "https://devcon.org",
    tags: ["ethereum", "protocol", "developers", "web3", "india", "asia", "devcon"],
  },
  "token2049-dubai-2026": {
    name: "TOKEN2049 Dubai",
    slug: "token2049-dubai-2026",
    dates: "Apr 29-30, 2026",
    side_events_dates: "Apr 27-28, 2026",
    venue: "Madinat Jumeirah, Dubai",
    city: "Dubai",
    country: "UAE",
    airport: "DXB",
    airport_alt: "DWC",
    recommended_arrival: "Apr 27",
    recommended_departure: "May 1",
    recommended_hotel_areas: ["Jumeirah Beach", "Downtown Dubai", "DIFC"],
    notable_side_events: ["Dubai Web3 Week", "BUIDL Asia side events", "VC dinners"],
    visa_notes: "US passport: visa on arrival or UAE eVisa required",
    website: "https://www.token2049.com",
    tags: ["crypto", "defi", "web3", "ethereum", "liquidity", "VC", "token2049"],
  },
};

/**
 * Find a conference by slug or keyword match
 */
export function findConference(query: string): Conference | null {
  const q = query.toLowerCase().trim();

  // Direct slug match
  if (CONFERENCES[q]) return CONFERENCES[q];

  // Score each conference by keyword match
  const scored = Object.values(CONFERENCES).map((conf) => {
    let score = 0;
    const searchable = [conf.name, conf.slug, conf.city, conf.country, ...conf.tags]
      .join(" ")
      .toLowerCase();

    for (const word of q.split(/\s+/)) {
      if (word.length < 3) continue;
      if (searchable.includes(word)) score += word.length;
    }

    return { conf, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].conf : null;
}

/**
 * Get all conferences
 */
export function getAllConferences(): Conference[] {
  return Object.values(CONFERENCES);
}
