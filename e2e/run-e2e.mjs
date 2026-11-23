#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkContrastPair, createAssertions, runContrastSelftest } from "./lib/assertions.mjs";
import { closeAllActiveSessions, createBrowserSession } from "./lib/browser.mjs";
import { ensureBuild, startPreviewServer } from "./lib/server.mjs";
import { tier1Cases } from "./tiers/tier1.mjs";
import { tier2Cases } from "./tiers/tier2.mjs";
import { tier3Cases } from "./tiers/tier3.mjs";
import { tier4Cases } from "./tiers/tier4.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    tier: "all",
    skipBuild: false,
    port: 4179,
    smokeInfra: false,
    jsonOut: null,
    caseFilter: null,
  };

  for (const arg of argv) {
    if (arg === "--skip-build") {
      opts.skipBuild = true;
    } else if (arg === "--smoke-infra") {
      opts.smokeInfra = true;
    } else if (arg.startsWith("--tier=")) {
      opts.tier = arg.slice("--tier=".length).trim().toLowerCase();
    } else if (arg.startsWith("--port=")) {
      const parsed = Number(arg.slice("--port=".length));
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        throw new Error(`Invalid --port value: ${arg}`);
      }
      opts.port = parsed;
    } else if (arg.startsWith("--json-out=")) {
      opts.jsonOut = path.resolve(rootDir, arg.slice("--json-out=".length));
    } else if (arg.startsWith("--case=")) {
      opts.caseFilter = arg.slice("--case=".length).trim();
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "OpenFormu Opaque-Box E2E Runner",
          "",
          "Usage:",
          "  node e2e/run-e2e.mjs [options]",
          "",
          "Options:",
          "  --tier=1|2|3|4|all   Select tier(s) to run (default: all)",
          "  --skip-build         Skip 'npm run build' and reuse existing dist/",
          "  --port=<port>        Preview server port (default: 4179)",
          "  --smoke-infra        Verify build/preview, playwright-cli, and contrast-check.py",
          "  --case=<filter>      Filter cases by case ID or title substring",
          "  --json-out=<path>    Write machine-readable JSON results",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  return opts;
}

function selectCases(tierOpt, caseFilter) {
  let pool = [];
  if (tierOpt === "all") {
    pool = [...tier1Cases, ...tier2Cases, ...tier3Cases, ...tier4Cases];
  } else if (tierOpt === "1") {
    pool = [...tier1Cases];
  } else if (tierOpt === "2") {
    pool = [...tier2Cases];
  } else if (tierOpt === "3") {
    pool = [...tier3Cases];
  } else if (tierOpt === "4") {
    pool = [...tier4Cases];
  } else {
    throw new Error(`Invalid --tier value "${tierOpt}". Expected 1, 2, 3, 4, or all.`);
  }

  if (caseFilter) {
    const q = caseFilter.toLowerCase();
    pool = pool.filter((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }
  return pool;
}

async function runSmokeInfra({ server, assert }) {
  const startMs = Date.now();
  const selftestOut = await runContrastSelftest(rootDir);
  const contrastSample = await checkContrastPair(rootDir, "#111111", "#FFFFFF", {
    minRatio: 4.5,
  });
  assert.ok(contrastSample.passed, "Expected #111111 on #FFFFFF to pass 4.5:1");

  const session = await createBrowserSession({
    baseUrl: server.url,
    sessionPrefix: "openformu-smoke",
  });
  try {
    await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
    const info = await session.runScript(async (page, _arg, H) => {
      const layout = await H.probeLayoutAndOverflow(page);
      return {
        title: await page.title(),
        bodyLen: await page.evaluate(() => document.body.innerText.trim().length),
        layout,
      };
    });
    assert.ok(/OpenFormu/i.test(info.title), `Unexpected page title: ${info.title}`);
    assert.ok(info.bodyLen > 50, "Expected hydrated page text");
    assert.noHorizontalOverflow(info.layout, "smoke-infra");
    assert.noConsoleErrors(await session.getConsoleErrors(), "smoke-infra");

    const elapsed = Date.now() - startMs;
    console.log(
      `[PASS] SMOKE-INFRA (${elapsed}ms) — preview=${server.url}, contrast-check.py=(${selftestOut}), title="${info.title}"`,
    );
    return {
      mode: "smoke-infra",
      passed: true,
      durationMs: elapsed,
      selftestOut,
      title: info.title,
    };
  } finally {
    await session.close();
  }
}

function printSummary(results, totalDurationMs) {
  const byTier = new Map();
  for (const r of results) {
    if (!byTier.has(r.tier)) {
      byTier.set(r.tier, { total: 0, passed: 0, failed: 0 });
    }
    const bucket = byTier.get(r.tier);
    bucket.total += 1;
    if (r.passed) bucket.passed += 1;
    else bucket.failed += 1;
  }

  console.log("\n=== E2E Summary ===");
  for (const [tier, stats] of Array.from(byTier.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`Tier ${tier}: ${stats.passed}/${stats.total} passed (${stats.failed} failed)`);
  }
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.length - totalPassed;
  console.log(
    `Overall: ${totalPassed}/${results.length} passed, ${totalFailed} failed (${(totalDurationMs / 1000).toFixed(1)}s) — ${totalFailed === 0 ? "PASS" : "FAIL"}`,
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const assert = createAssertions({ rootDir });
  let server = null;
  let session = null;

  const cleanup = async () => {
    try {
      if (session) {
        await session.close();
        session = null;
      }
      await closeAllActiveSessions();
    } finally {
      if (server) {
        await server.stop();
        server = null;
      }
    }
  };

  const onSignal = async (signal) => {
    console.error(`\nReceived ${signal}; cleaning up preview server and browser sessions...`);
    await cleanup();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const suiteStartMs = Date.now();
  try {
    await ensureBuild({ rootDir, skipBuild: opts.skipBuild });
    server = await startPreviewServer({ rootDir, port: opts.port });

    if (opts.smokeInfra) {
      const report = await runSmokeInfra({ server, assert });
      if (opts.jsonOut) {
        fs.mkdirSync(path.dirname(opts.jsonOut), { recursive: true });
        fs.writeFileSync(opts.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      }
      return;
    }

    await runContrastSelftest(rootDir);
    const cases = selectCases(opts.tier, opts.caseFilter);
    if (cases.length === 0) {
      throw new Error("No E2E test cases matched the selected --tier / --case filter.");
    }

    console.log(`Running ${cases.length} opaque-box E2E case(s) against ${server.url} ...`);
    session = await createBrowserSession({
      baseUrl: server.url,
      sessionPrefix: `openformu-t${opts.tier}`,
    });

    const results = [];
    for (const tc of cases) {
      const caseStart = Date.now();
      let passed = false;
      let errorMsg = null;

      try {
        await tc.run({ session, baseUrl: server.url, rootDir, assert });
        passed = true;
      } catch (err) {
        passed = false;
        errorMsg = err instanceof Error ? err.message : String(err);
        // If browser session died unexpectedly, recreate it for subsequent cases.
        if (/closed|ENOENT|EPIPE|Target page, context or browser has been closed/i.test(errorMsg)) {
          await session.close();
          session = await createBrowserSession({
            baseUrl: server.url,
            sessionPrefix: `openformu-t${opts.tier}`,
          });
        }
      }

      const durationMs = Date.now() - caseStart;
      results.push({
        id: tc.id,
        tier: tc.tier,
        feature: tc.feature,
        title: tc.title,
        passed,
        durationMs,
        error: errorMsg,
      });

      if (passed) {
        console.log(`[PASS] ${tc.id} (${durationMs}ms) — ${tc.title}`);
      } else {
        console.log(`[FAIL] ${tc.id} (${durationMs}ms) — ${tc.title}`);
        console.log(`  -> ${errorMsg}`);
      }
    }

    const totalDurationMs = Date.now() - suiteStartMs;
    printSummary(results, totalDurationMs);

    if (opts.jsonOut) {
      fs.mkdirSync(path.dirname(opts.jsonOut), { recursive: true });
      fs.writeFileSync(
        opts.jsonOut,
        `${JSON.stringify({ totalDurationMs, results }, null, 2)}\n`,
        "utf8",
      );
    }

    if (results.some((r) => !r.passed)) {
      process.exitCode = 1;
    }
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
