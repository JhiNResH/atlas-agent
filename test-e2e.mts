import { executeJob as conferenceTravel } from "./src/seller/offerings/hermes/conference_travel/handlers.js";
import { executeJob as conferenceTrip } from "./src/seller/offerings/hermes/conference_trip/handlers.js";

async function main() {
  console.log("=".repeat(60));
  console.log("TEST 1: conference_travel — TOKEN2049 Dubai from LAX");
  console.log("=".repeat(60));
  const t1 = await conferenceTravel({ conference: "TOKEN2049 Dubai", origin: "LAX" });
  const r1 = JSON.parse(t1.deliverable!);
  console.log("data_source:", r1.structured?.data_source);
  console.log("conference_name:", r1.structured?.conference_name);
  console.log("price_range:", r1.structured?.price_range);
  console.log("top_airline:", r1.structured?.top_airline);
  console.log("Report preview:\n", r1.report?.slice(0, 400));
  console.log();

  console.log("=".repeat(60));
  console.log("TEST 2: conference_travel — Solana Crossroads (not-announced)");
  console.log("=".repeat(60));
  const t2 = await conferenceTravel({ conference: "Solana Crossroads 2026", origin: "LAX" });
  const r2 = JSON.parse(t2.deliverable!);
  console.log("data_source:", r2.structured?.data_source);
  console.log("Report:", r2.report?.slice(0, 250));
  console.log();

  console.log("=".repeat(60));
  console.log("TEST 3: conference_trip — EthCC Cannes from JFK");
  console.log("=".repeat(60));
  const t3 = await conferenceTrip({ conference: "EthCC", origin: "JFK", budget_total: "$4000" });
  const r3 = JSON.parse(t3.deliverable!);
  console.log("data_source:", r3.structured?.data_source);
  console.log("conference_name:", r3.structured?.conference_name);
  console.log("dates:", r3.structured?.dates);
  console.log("visa_required:", r3.structured?.visa_required);
  console.log("estimated_total:", r3.structured?.estimated_total);
  console.log("Report preview:\n", r3.report?.slice(0, 400));
  console.log();

  console.log("=".repeat(60));
  console.log("TEST 4: conference_travel — Permissionless (TBC — check ⏳ banner)");
  console.log("=".repeat(60));
  const t4 = await conferenceTravel({ conference: "Permissionless", origin: "LAX" });
  const r4 = JSON.parse(t4.deliverable!);
  console.log("Has ⏳ warning:", r4.report?.includes("⏳"));
  console.log("data_source:", r4.structured?.data_source);
  console.log("Report preview:\n", r4.report?.slice(0, 300));

  console.log("\n✅ All 4 tests done.");
}

main().catch(console.error);
