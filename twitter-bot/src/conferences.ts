/**
 * Conference detection keywords and data
 */

export interface ConferenceMatch {
  slug: string;
  name: string;
  keywords: string[];
  blinkUrl: string;
}

// Supported conferences for v1
export const CONFERENCES: ConferenceMatch[] = [
  {
    slug: "token2049-singapore-2026",
    name: "TOKEN2049 Singapore",
    keywords: [
      "token2049",
      "token 2049",
      "going to token2049",
      "heading to token2049",
      "attending token2049",
      "see you at token2049",
      "token2049 singapore",
    ],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=token2049-singapore-2026",
  },
  {
    slug: "ethcc-2026",
    name: "EthCC[9]",
    keywords: [
      "ethcc",
      "eth cc",
      "going to ethcc",
      "heading to ethcc",
      "attending ethcc",
      "see you at ethcc",
      "ethcc cannes",
    ],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=ethcc-2026",
  },
  {
    slug: "consensus-2026",
    name: "Consensus Miami",
    keywords: [
      "consensus miami",
      "consensus2026",
      "going to consensus",
      "heading to consensus",
      "attending consensus",
      "see you at consensus",
    ],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=consensus-2026",
  },
  {
    slug: "ethdenver-2026",
    name: "ETHDenver",
    keywords: [
      "ethdenver",
      "eth denver",
      "going to ethdenver",
      "heading to ethdenver",
      "attending ethdenver",
      "see you at ethdenver",
      "buidlweek",
    ],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=ethdenver-2026",
  },
  {
    slug: "devcon-2026",
    name: "Devcon 8",
    keywords: [
      "devcon",
      "devcon 8",
      "devcon8",
      "going to devcon",
      "heading to devcon",
      "attending devcon",
      "see you at devcon",
    ],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=devcon-2026",
  },
  {
    slug: "token2049-dubai-2026",
    name: "TOKEN2049 Dubai",
    keywords: ["token2049 dubai", "token 2049 dubai", "going to token2049 dubai"],
    blinkUrl: "https://hermes-blink.vercel.app/api/flights?conference=token2049-dubai-2026",
  },
];

/**
 * Detect which conference a tweet is about
 */
export function detectConference(tweetText: string): ConferenceMatch | null {
  const text = tweetText.toLowerCase();

  // Score each conference by keyword matches
  let bestMatch: ConferenceMatch | null = null;
  let bestScore = 0;

  for (const conf of CONFERENCES) {
    let score = 0;
    for (const keyword of conf.keywords) {
      if (text.includes(keyword)) {
        // Longer keywords = higher confidence
        score += keyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = conf;
    }
  }

  // Require minimum confidence
  return bestScore >= 6 ? bestMatch : null;
}
