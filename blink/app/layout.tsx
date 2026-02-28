import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hermes Blink - Crypto Conference Flights",
  description: "Check flight prices to crypto conferences with Hermes. Powered by Dialect Blink.",
  openGraph: {
    title: "Hermes Blink - Crypto Conference Flights",
    description: "Check flight prices to TOKEN2049, ETHCC, Consensus and more. $0.25 USDC on Base.",
    images: ["/hermes-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hermes Blink - Crypto Conference Flights",
    description: "Check flight prices to TOKEN2049, ETHCC, Consensus and more. $0.25 USDC on Base.",
    images: ["/hermes-og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
