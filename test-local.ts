import { executeJob } from "./src/seller/offerings/maiat/trust_score_query/handlers.js";

async function runLocalTest() {
  const requirement = {
    project: "LuckiChan — #1 Gambling Casino on ACP! 13 games, MEGA JACKPOT 500x, Mystery Box $25, VIP/DIAMOND tiers for $LUCK holders. Weekly 50% profit buyback! Token: 0xA5CAAa86e2939DF47A8f0077d1dcd8d8597d6F8f\nCTA: Buy $LUCK & Play!\nLink: https://app.virtuals.io/acp",
    wallet_address: "0x1234567890AbcdEf1234567890aBcDeF12345678"
  };

  console.log("==========================================");
  console.log("🧪 RUNNING LOCAL TEST FOR TRUST SCORE LOGIC");
  console.log("==========================================\n");
  console.log("Input string from buyer:");
  console.log(requirement.project);
  console.log("\n------------------------------------------\n");

  try {
    console.log("Calling executeJob()...\n");
    const result = await executeJob(requirement);
    console.log("✅ SUCCESS! Result returned to Buyer Agent:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("❌ ERROR THROWN:");
    console.error(err.message);
  }
}

runLocalTest();
