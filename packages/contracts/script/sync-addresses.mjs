#!/usr/bin/env node
// Sync deployed addresses from the latest Foundry broadcast into the SDK.
//
// The original testnet address mismatch (frontend reading one Veritas while the
// PredictionMarket pointed at another) came from hand-copying addresses after a
// partial redeploy. Run this immediately after `forge script Deploy.s.sol` so the
// SDK always reflects the real, consistent deployment from a single run.
//
// Usage: node script/sync-addresses.mjs [chainId]   (default chainId 50312)

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const chainId = process.argv[2] ?? "50312";

const broadcastPath = resolve(
  __dirname,
  `../broadcast/Deploy.s.sol/${chainId}/run-latest.json`,
);
const sdkContractsPath = resolve(repoRoot, "packages/sdk/src/contracts.ts");

const run = JSON.parse(readFileSync(broadcastPath, "utf8"));

// Map contract name -> deployed address from CREATE transactions.
const deployed = {};
for (const tx of run.transactions ?? []) {
  if (tx.transactionType === "CREATE" && tx.contractName && tx.contractAddress) {
    deployed[tx.contractName] = tx.contractAddress;
  }
}

const checksum = (addr) =>
  execSync(`cast to-check-sum-address ${addr}`, { encoding: "utf8" }).trim();

const keys = {
  veritas: "Veritas",
  predictionMarket: "PredictionMarket",
  insuranceVault: "InsuranceVault",
  disputeArbiter: "DisputeArbiter",
};

const resolved = {};
for (const [sdkKey, contractName] of Object.entries(keys)) {
  const addr = deployed[contractName];
  if (!addr) {
    console.error(`Missing ${contractName} in ${broadcastPath}. Did the deploy run fully?`);
    process.exit(1);
  }
  resolved[sdkKey] = checksum(addr);
}

let contractsFile = readFileSync(sdkContractsPath, "utf8");
for (const [sdkKey, addr] of Object.entries(resolved)) {
  const re = new RegExp(`(${sdkKey}:\\s*")0x[0-9a-fA-F]{40}(")`);
  if (!re.test(contractsFile)) {
    console.error(`Could not find '${sdkKey}' address line in ${sdkContractsPath}`);
    process.exit(1);
  }
  contractsFile = contractsFile.replace(re, `$1${addr}$2`);
}
writeFileSync(sdkContractsPath, contractsFile);

console.log("Synced SDK addresses from", broadcastPath, "\n");
for (const [sdkKey, addr] of Object.entries(resolved)) {
  console.log(`  ${sdkKey.padEnd(18)} ${addr}`);
}
console.log("\nREADME table snippet:\n");
console.log("| Contract | Address |");
console.log("| --- | --- |");
console.log(`| Veritas | \`${resolved.veritas}\` |`);
console.log(`| PredictionMarket | \`${resolved.predictionMarket}\` |`);
console.log(`| InsuranceVault | \`${resolved.insuranceVault}\` |`);
console.log(`| DisputeArbiter | \`${resolved.disputeArbiter}\` |`);
console.log("\nNext: rebuild the SDK (pnpm --filter @veritas/agent-template build) and verify on-chain that all three consumers' veritas() match the new Veritas.");
