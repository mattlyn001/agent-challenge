/**
 * CryptoSentinel — Main Entry Point
 * Boots the ElizaOS agent with the CryptoSentinel character and plugin.
 */

import { AgentRuntime, elizaLogger } from "@elizaos/core";
import { bootstrapPlugin } from "@elizaos/plugin-bootstrap";
import { DirectClient } from "@elizaos/client-direct";
import { cryptoSentinelPlugin } from "./plugin.js";
import character from "../characters/cryptosentinel.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config();

if (process.env.NOSANA_MODEL_ENDPOINT) {
  character.settings.modelEndpointOverride = process.env.NOSANA_MODEL_ENDPOINT;
}

async function main() {
  elizaLogger.info("🛡️  Starting CryptoSentinel Agent...");

  const runtime = new AgentRuntime({
    token: process.env.OPENAI_API_KEY || "nosana-local",
    modelProvider: "openai",
    character,
    plugins: [bootstrapPlugin, cryptoSentinelPlugin],
    providers: [],
    actions: [],
    services: [],
    managers: [],
  });

  await runtime.initialize();

  const directClient = new DirectClient();
  directClient.registerAgent(runtime);
  directClient.start(parseInt(process.env.PORT || "3000"));

  elizaLogger.success(
    `✅ CryptoSentinel is live on port ${process.env.PORT || 3000}`
  );
}

main().catch((err) => {
  console.error("Fatal error starting CryptoSentinel:", err);
  process.exit(1);
});
