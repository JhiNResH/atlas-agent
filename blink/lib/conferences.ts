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

// Inline conference data for Next.js (synced from references/crypto-conferences-2026.json)
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
  "paris-blockchain-week-2026": {
    name: "Paris Blockchain Week 2026",
    slug: "paris-blockchain-week-2026",
    dates: "Apr 15-16, 2026",
    side_events_dates: "Apr 13-14, 2026",
    venue: "Carrousel du Louvre, Paris",
    city: "Paris",
    country: "France",
    airport: "CDG",
    airport_alt: "ORY",
    recommended_arrival: "Apr 13",
    recommended_departure: "Apr 17",
    recommended_hotel_areas: ["1st arrondissement (near Louvre)", "Marais", "Saint-Germain"],
    notable_side_events: [
      "EU regulatory side panels",
      "Solana & BNB ecosystem events",
      "VC networking",
    ],
    visa_notes: "US passport: visa-free in Schengen area (90 days)",
    website: "https://www.parisblockchainweek.com",
    tags: ["crypto", "regulation", "institutional", "ethereum", "web3", "policy", "paris"],
  },
  "bitcoin-conference-2026": {
    name: "Bitcoin 2026",
    slug: "bitcoin-conference-2026",
    dates: "Apr 27-29, 2026",
    side_events_dates: "Apr 25-26, 2026",
    venue: "The Venetian, Las Vegas",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    airport: "LAS",
    recommended_arrival: "Apr 25",
    recommended_departure: "Apr 30",
    recommended_hotel_areas: ["The Strip", "Downtown Las Vegas", "Venetian/Palazzo area"],
    notable_side_events: ["Mining summit", "Bitcoin-only side events", "Investor panels"],
    visa_notes: "US passport: no visa needed",
    website: "https://b.tc/conference",
    tags: ["bitcoin", "BTC", "lightning", "mining", "hodl", "institutional"],
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
  "solana-accelerate-2026": {
    name: "Solana Accelerate USA",
    slug: "solana-accelerate-2026",
    dates: "May 5, 2026",
    side_events_dates: "May 4, 2026",
    venue: "Miami Beach, FL",
    city: "Miami Beach",
    state: "FL",
    country: "USA",
    airport: "MIA",
    airport_alt: "FLL",
    recommended_arrival: "May 4",
    recommended_departure: "May 7",
    recommended_hotel_areas: ["South Beach", "Midtown Miami", "Brickell"],
    notable_side_events: ["Overlaps with Consensus Miami (May 5-7)", "Solana builder sessions"],
    visa_notes: "US passport: no visa needed",
    website: "https://solana.com",
    tags: ["solana", "SOL", "builders", "defi", "accelerator", "miami"],
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
  "digital-assets-summit-london-2026": {
    name: "Digital Assets Summit London 2026",
    slug: "digital-assets-summit-london-2026",
    dates: "May 13-14, 2026",
    side_events_dates: "May 12, 2026",
    venue: "London, UK",
    city: "London",
    country: "UK",
    airport: "LHR",
    airport_alt: "LGW",
    recommended_arrival: "May 12",
    recommended_departure: "May 15",
    recommended_hotel_areas: ["City of London", "Canary Wharf", "Shoreditch"],
    notable_side_events: ["Blockworks institutional side panels", "Digital asset policy forums"],
    visa_notes: "US passport: visa-free up to 6 months (post-Brexit ETA required)",
    website: "https://blockworks.co",
    tags: ["institutional", "digital-assets", "policy", "defi", "web3", "london"],
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
  "solana-breakpoint-2026": {
    name: "Solana Breakpoint 2026",
    slug: "solana-breakpoint-2026",
    dates: "Nov 15-17, 2026",
    side_events_dates: "Nov 13-14, 2026",
    venue: "Olympia London, London",
    city: "London",
    country: "UK",
    airport: "LHR",
    airport_alt: "LGW",
    recommended_arrival: "Nov 13",
    recommended_departure: "Nov 18",
    recommended_hotel_areas: ["Kensington", "Hammersmith", "Shepherds Bush", "Earl's Court"],
    notable_side_events: ["Solana hacker house", "Solana ecosystem events", "Builder side events"],
    visa_notes: "US passport: visa-free up to 6 months (post-Brexit ETA required)",
    website: "https://solana.com/breakpoint",
    tags: ["solana", "SOL", "defi", "nft", "web3", "developers", "breakpoint"],
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
  "binance-blockchain-week-2026": {
    name: "Binance Blockchain Week 2026",
    slug: "binance-blockchain-week-2026",
    dates: "Dec 2026 (TBC)",
    side_events_dates: "TBC",
    venue: "Dubai, UAE (venue TBC)",
    city: "Dubai",
    country: "UAE",
    airport: "DXB",
    recommended_arrival: "1 day before",
    recommended_departure: "1 day after",
    recommended_hotel_areas: ["Downtown Dubai", "DIFC", "Jumeirah Beach"],
    notable_side_events: [
      "BNB Chain ecosystem events",
      "Binance partner side events",
      "Fan token/retail events",
    ],
    visa_notes: "US passport: visa on arrival or UAE eVisa required",
    website: "https://www.binance.com",
    tags: ["binance", "BNB", "web3", "retail", "crypto", "dubai"],
  },
  "nft-nyc-2026": {
    name: "NFT.NYC 2026",
    slug: "nft-nyc-2026",
    dates: "Apr 2026 (TBC)",
    side_events_dates: "TBC",
    venue: "New York City, NY",
    city: "New York",
    state: "NY",
    country: "USA",
    airport: "JFK",
    airport_alt: "LGA",
    recommended_arrival: "1 day before",
    recommended_departure: "1 day after",
    recommended_hotel_areas: ["Midtown Manhattan", "Times Square area", "Chelsea"],
    notable_side_events: ["NYC NFT side events", "Web3 NYC events"],
    visa_notes: "US passport: no visa needed",
    website: "https://www.nft.nyc",
    tags: ["nft", "web3", "ethereum", "art", "gaming", "nyc"],
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
