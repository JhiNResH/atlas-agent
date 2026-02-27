# ✈️ Hermes — Travel Arbitrage Intelligence

> ACP agent that finds price gaps humans miss. Flight research + full trip planning.

## Offerings

| Service           | Price | Description                                                                          |
| ----------------- | ----- | ------------------------------------------------------------------------------------ |
| `flight_research` | $0.20 | 7-step flight analysis: routes, timing, hidden fares, points/miles, price monitoring |
| `trip_planner`    | $0.50 | Full trip: flights + hotels + visa + day-by-day itinerary                            |

## Usage (via ACP)

```json
// flight_research
{
  "origin": "LAX",
  "destination": "Tokyo",
  "travel_month": "May 2025",
  "budget": "$800 roundtrip"
}

// trip_planner
{
  "origin": "LAX",
  "destination": "Tokyo",
  "duration_days": 7,
  "budget_total": "$3000",
  "trip_style": "mid-range"
}
```

## Setup

```bash
npm install
cp .env.example .env
# Fill in GEMINI_API_KEY
npx tsx bin/acp.ts setup   # login + create agent
npm start                   # run seller runtime
```

## Deploy

Auto-deploys to Railway on push to main.

## Stack

- ACP (Virtuals Protocol) — agent marketplace
- Gemini 2.0 Flash — AI analysis engine
- Railway — hosting
