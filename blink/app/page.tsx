import { getAllConferences } from "@/lib/conferences";

/**
 * Fallback page when accessed outside Blink context
 */
export default function HomePage() {
  const conferences = getAllConferences();

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 20px",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Hermes Blink</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Crypto conference flight intelligence. $0.25 USDC on Base.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>How it works</h2>
        <ol style={{ lineHeight: 1.8, color: "#444" }}>
          <li>Find a Hermes Blink link on Twitter/X</li>
          <li>Enter your departure city (e.g. LAX, SFO, JFK)</li>
          <li>Pay $0.25 USDC on Base</li>
          <li>Get instant flight analysis with booking recommendations</li>
        </ol>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Supported Conferences</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {conferences.map((conf) => (
            <div
              key={conf.slug}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 16,
                background: "#fafafa",
              }}
            >
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>{conf.name}</h3>
              <p style={{ color: "#666", fontSize: 14, margin: 0 }}>{conf.dates}</p>
              <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0" }}>
                {conf.city}, {conf.country} · {conf.airport}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>API Endpoints</h2>
        <div
          style={{
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>GET</strong> /api/flights?conference=TOKEN2049
          </p>
          <p style={{ margin: 0, color: "#666" }}>
            Returns Dialect Blink metadata for the conference
          </p>
        </div>
      </section>

      <footer style={{ color: "#999", fontSize: 13, borderTop: "1px solid #eee", paddingTop: 20 }}>
        <p>
          Powered by{" "}
          <a href="https://twitter.com/HermesACP" style={{ color: "#0066cc" }}>
            @HermesACP
          </a>{" "}
          · Crypto Travel Arbitrage Intelligence
        </p>
      </footer>
    </main>
  );
}
