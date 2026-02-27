/**
 * Amadeus Flight Search — Live price fetcher
 * Uses OAuth2 client credentials flow.
 * Sandbox: test.api.amadeus.com (2000 calls/month free)
 * Production: api.amadeus.com
 */

const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID || "";
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET || "";
const AMADEUS_BASE = "https://test.api.amadeus.com"; // switch to api.amadeus.com for prod

let _tokenCache: { token: string; expiresAt: number } | null = null;

// ── Auth ─────────────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string | null> {
  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) return null;
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;

  try {
    const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_CLIENT_ID,
        client_secret: AMADEUS_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    _tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return _tokenCache.token;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface FlightOffer {
  airline: string;
  price: number;
  currency: string;
  stops: number;
  duration: string;
  departure: string;
  arrival: string;
}

export interface LivePriceResult {
  origin: string;
  destination: string;
  departureDate: string;
  offers: FlightOffer[];
  cheapest: FlightOffer | null;
  priceRange: string;
  source: "amadeus-live" | "unavailable";
}

// ── Airline code → name map ───────────────────────────────────────────────────
const AIRLINE_NAMES: Record<string, string> = {
  NH: "ANA",
  JL: "JAL",
  UA: "United",
  DL: "Delta",
  AA: "American",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  KE: "Korean Air",
  OZ: "Asiana",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  TG: "Thai Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  EY: "Etihad",
  TK: "Turkish Airlines",
  LH: "Lufthansa",
  AF: "Air France",
  BA: "British Airways",
  ZG: "Zipair",
  MM: "Peach Aviation",
  JW: "Vanilla Air",
  VN: "Vietnam Airlines",
  BR: "EVA Air",
  CI: "China Airlines",
};

function airlineName(code: string): string {
  return AIRLINE_NAMES[code] || code;
}

// ── Main search ───────────────────────────────────────────────────────────────
export async function searchFlights(params: {
  origin: string; // IATA code e.g. "LAX"
  destination: string; // IATA code e.g. "NRT"
  departureDate: string; // YYYY-MM-DD
  adults?: number;
  max?: number; // max results
}): Promise<LivePriceResult> {
  const { origin, destination, departureDate, adults = 1, max = 5 } = params;

  const token = await getAccessToken();
  if (!token) {
    return {
      origin,
      destination,
      departureDate,
      offers: [],
      cheapest: null,
      priceRange: "Live prices unavailable (no API key)",
      source: "unavailable",
    };
  }

  try {
    const url = new URL(`${AMADEUS_BASE}/v2/shopping/flight-offers`);
    url.searchParams.set("originLocationCode", origin.toUpperCase());
    url.searchParams.set("destinationLocationCode", destination.toUpperCase());
    url.searchParams.set("departureDate", departureDate);
    url.searchParams.set("adults", String(adults));
    url.searchParams.set("max", String(max));
    url.searchParams.set("currencyCode", "USD");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      console.error("[Amadeus] search error:", res.status, err);
      return {
        origin,
        destination,
        departureDate,
        offers: [],
        cheapest: null,
        priceRange: "API error",
        source: "unavailable",
      };
    }

    const data: any = await res.json();
    const rawOffers: any[] = data.data || [];

    const offers: FlightOffer[] = rawOffers.map((o: any) => {
      const seg = o.itineraries?.[0]?.segments?.[0];
      const carrier = seg?.carrierCode || "?";
      return {
        airline: airlineName(carrier),
        price: parseFloat(o.price?.grandTotal || "0"),
        currency: o.price?.currency || "USD",
        stops: (o.itineraries?.[0]?.segments?.length || 1) - 1,
        duration: o.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase() || "?",
        departure: seg?.departure?.at || "",
        arrival: seg?.arrival?.at || "",
      };
    });

    offers.sort((a, b) => a.price - b.price);

    const cheapest = offers[0] || null;
    const prices = offers.map((o) => o.price).filter((p) => p > 0);
    const priceRange =
      prices.length > 0
        ? `$${Math.min(...prices).toFixed(0)}–$${Math.max(...prices).toFixed(0)}`
        : "No results";

    return {
      origin,
      destination,
      departureDate,
      offers,
      cheapest,
      priceRange,
      source: "amadeus-live",
    };
  } catch (err) {
    console.error("[Amadeus] fetch failed:", err);
    return {
      origin,
      destination,
      departureDate,
      offers: [],
      cheapest: null,
      priceRange: "Fetch error",
      source: "unavailable",
    };
  }
}

/** Format offers as a compact string for Gemini context */
export function formatOffersForPrompt(result: LivePriceResult): string {
  if (result.source === "unavailable" || result.offers.length === 0) {
    return "Live flight data unavailable — use knowledge-based estimates.";
  }
  const lines = result.offers
    .slice(0, 5)
    .map(
      (o) =>
        `- ${o.airline}: $${o.price} | ${o.stops === 0 ? "direct" : o.stops + " stop(s)"} | ${o.duration}`
    );
  return `LIVE PRICES (Amadeus, ${result.departureDate}):\n${lines.join("\n")}\nPrice range: ${result.priceRange}`;
}
