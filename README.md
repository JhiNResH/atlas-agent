# ✈️ Hermes — Crypto Travel Arbitrage Intelligence

> ACP agent that finds price gaps humans miss. Real Amadeus live prices + Gemini AI analysis. Hire Hermes with USDC.

**Provider wallet:** `0xf4b48521960C7e78fCf89859c42d912cdcd0FC06`

## Offerings

| Service                   | Price | Description                                                                                                                   |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `flight_research`         | $0.20 | 7-step flight analysis: route optimizer, timing scanner, hidden fares, points/miles verdict, price monitoring setup           |
| `trip_planner`            | $0.50 | Full trip: flights + hotels + visa requirements + day-by-day itinerary + budget breakdown                                     |
| `conference_travel`       | $0.25 | Crypto conference flight optimizer — knows TOKEN2049, Consensus, Devcon, ETHDenver + any other conference via live web search |
| `conference_trip`         | $0.60 | Full conference trip: flights + hotels near venue + side events schedule + complete budget                                    |
| `multi_conference_router` | $0.80 | Full-year routing optimizer — compares separate roundtrips vs multi-stop, finds optimal order, estimates savings              |

## Offering Chain (upsell funnel)

```
flight_research ($0.20)
    └→ trip_planner ($0.50)

conference_travel ($0.25)
    └→ conference_trip ($0.60)
            └→ multi_conference_router ($0.80)
```

Each output includes a pre-filled `next_step` JSON for the next offering.

## Usage (via ACP)

```bash
# Any ACP buyer agent:
npx tsx bin/acp.ts job create 0xf4b48521960C7e78fCf89859c42d912cdcd0FC06 <offering> \
  --requirements '<json>'
```

### flight_research

```json
{
  "origin": "LAX",
  "destination": "NRT",
  "travel_month": "September 2026",
  "budget": "$800 roundtrip"
}
```

### conference_travel

```json
{
  "conference": "TOKEN2049 Singapore",
  "origin": "LAX"
}
```

> Supports any crypto conference — looks up static DB first, falls back to live Gemini web search.

### conference_trip

```json
{
  "conference": "Consensus Miami",
  "origin": "NYC",
  "budget_total": "$3000",
  "trip_style": "mid-range"
}
```

### multi_conference_router

```json
{
  "conferences": ["TOKEN2049 Singapore", "ETHDenver", "Devcon"],
  "origin": "LAX",
  "budget_total": "$8000"
}
```

### trip_planner

```json
{
  "origin": "LAX",
  "destination": "Singapore",
  "duration_days": 7,
  "budget_total": "$4000",
  "trip_style": "mid-range"
}
```

## Conference Database

10 major crypto conferences pre-loaded in `references/crypto-conferences-2026.json`:

- TOKEN2049 Dubai (May 2026)
- Consensus Miami (May 5-7, 2026)
- ETHDenver (Feb–Mar 2026)
- TOKEN2049 Singapore (Sep 2026)
- Devcon (2026 TBC)
- Bitcoin Conference (2026 TBC)
- Solana Breakpoint (Nov 2026, London)
- Permissionless (2026 TBC)
- ETHGlobal Brussels (2026 TBC)
- NFT.NYC (2026 TBC)

Unknown conferences → auto web search via Gemini Search Grounding.

## Setup

```bash
npm install
cp .env.example .env
# Fill in: GEMINI_API_KEY, AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
npx tsx bin/acp.ts setup   # login + create agent
npm run seller:run          # start seller runtime
```

## Deploy

Auto-deploys to Railway on push to `main`.

Required Railway env vars:

```
GEMINI_API_KEY
LITE_AGENT_API_KEY
AMADEUS_CLIENT_ID
AMADEUS_CLIENT_SECRET
```

## Stack

- **ACP (Virtuals Protocol)** — agent commerce marketplace
- **Gemini 2.0 Flash** — AI analysis + Google Search Grounding for live conference data
- **Amadeus API** — real-time flight prices (sandbox → production ready)
- **Railway** — always-on seller runtime
