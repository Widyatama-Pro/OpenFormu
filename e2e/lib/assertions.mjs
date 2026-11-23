import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function execPython(args, cwd) {
  const candidates = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
  let lastErr = null;
  for (const cmd of candidates) {
    try {
      return await execFileAsync(cmd, args, {
        cwd,
        timeout: 15000,
        windowsHide: true,
      });
    } catch (err) {
      if (err && err.code === "ENOENT") {
        lastErr = err;
        continue;
      }
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: typeof err.code === "number" ? err.code : 1,
      };
    }
  }
  throw new Error(`Python executable not found (${lastErr?.message ?? "ENOENT"})`);
}

function contrastScriptPath(rootDir) {
  return path.join(rootDir, ".agents", "skills", "antislop-human", "contrast-check.py");
}

export async function runContrastSelftest(rootDir) {
  const script = contrastScriptPath(rootDir);
  const res = await execPython([script, "--selftest"], rootDir);
  const exitCode = res.exitCode ?? 0;
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`.trim();
  if (exitCode !== 0 || !/OK/i.test(out)) {
    throw new Error(`contrast-check.py --selftest failed (exit=${exitCode}): ${out}`);
  }
  return out;
}

const contrastCache = new Map();

// Use unrounded WCAG AA checks from contrast-check.py (4.5:1 normal, 3.0:1 large/UI).
export async function checkContrastPair(rootDir, fgHex, bgHex, { minRatio = 4.5 } = {}) {
  const key = `${fgHex.toUpperCase()}|${bgHex.toUpperCase()}`;
  let parsed = contrastCache.get(key);

  if (!parsed) {
    const script = contrastScriptPath(rootDir);
    const res = await execPython([script, fgHex, bgHex], rootDir);
    const exitCode = res.exitCode ?? 0;
    const stdout = String(res.stdout ?? "");
    const stderr = String(res.stderr ?? "");
    if (exitCode === 2) {
      throw new Error(
        `contrast-check.py parse error for ${fgHex} vs ${bgHex}: ${stdout} ${stderr}`,
      );
    }
    const ratioMatch = /ratio:\s*([\d.]+):1/i.exec(stdout);
    const normalPass = /normal text \(4\.5:1\):\s*PASS/i.test(stdout);
    const largePass = /large text\s*\(3\.0:1\):\s*PASS/i.test(stdout);
    parsed = {
      ratioText: ratioMatch ? `${ratioMatch[1]}:1` : "unknown",
      normalPass,
      largePass,
      raw: stdout.trim(),
    };
    contrastCache.set(key, parsed);
  }

  const passed = minRatio >= 4.5 ? parsed.normalPass : parsed.largePass;
  return {
    passed,
    fgHex,
    bgHex,
    minRatio,
    ratioText: parsed.ratioText,
    raw: parsed.raw,
  };
}

export function createAssertions({ rootDir }) {
  return {
    ok(condition, message) {
      if (!condition) {
        throw new Error(message || "Assertion failed");
      }
    },

    equal(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(
          `${message ? `${message}: ` : ""}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
      }
    },

    noConsoleErrors(consoleResult, context = "") {
      if (consoleResult.errorCount > 0 || consoleResult.lines.length > 0) {
        throw new Error(
          `Browser console/page errors detected${context ? ` (${context})` : ""}:\n${consoleResult.lines.join("\n") || consoleResult.raw}`,
        );
      }
    },

    noHorizontalOverflow(layoutProbe, context = "") {
      if (layoutProbe.hasHorizontalOverflow) {
        throw new Error(
          `Horizontal overflow${context ? ` (${context})` : ""}: scrollWidth=${layoutProbe.scrollWidth} > clientWidth=${layoutProbe.clientWidth}`,
        );
      }
    },

    mobileTouchTargets(touchProbe, context = "") {
      if (touchProbe.violations && touchProbe.violations.length > 0) {
        const detail = touchProbe.violations
          .slice(0, 6)
          .map((v) => `${v.tag}("${v.label}")=${v.width}x${v.height}px`)
          .join(", ");
        throw new Error(`Mobile touch target <44x44px${context ? ` (${context})` : ""}: ${detail}`);
      }
    },

    antiSlopSurface(surfaceProbe, context = "", { checkCursor = true } = {}) {
      if (surfaceProbe.emDashCount > 0) {
        throw new Error(
          `Forbidden em dash (—) in visible UI${context ? ` (${context})` : ""}: ${surfaceProbe.emDashSamples.join(" | ")}`,
        );
      }
      if (surfaceProbe.backdropBlurCount > 2) {
        const list = surfaceProbe.backdropBlurElements
          .map((e) => `${e.tag}.${e.cls}(${e.backdropFilter})`)
          .join(", ");
        throw new Error(
          `Anti-Slop backdrop-filter dose cap (>2) exceeded${context ? ` (${context})` : ""}: count=${surfaceProbe.backdropBlurCount} [${list}]`,
        );
      }
      if (surfaceProbe.infinitePulseCount > 0) {
        const list = surfaceProbe.infinitePulseElements
          .map((e) => `${e.tag}.${e.cls}(${e.animationName})`)
          .join(", ");
        throw new Error(
          `Infinite CSS pulse/glow/float animations active in Anti-Slop${context ? ` (${context})` : ""}: [${list}]`,
        );
      }
      if (checkCursor && surfaceProbe.cursorViolations.length > 0) {
        const list = surfaceProbe.cursorViolations
          .map((e) => `${e.tag}("${e.label}")=${e.cursor}`)
          .join(", ");
        throw new Error(
          `Interactive controls missing cursor:pointer${context ? ` (${context})` : ""}: [${list}]`,
        );
      }
    },

    async checkContrastPairs(pairs, context = "") {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        throw new Error(`No visible contrast pairs sampled${context ? ` (${context})` : ""}`);
      }
      const failures = [];
      for (const pair of pairs) {
        const res = await checkContrastPair(rootDir, pair.fgHex, pair.bgHex, {
          minRatio: pair.minRatio ?? 4.5,
        });
        if (!res.passed) {
          failures.push(
            `${pair.sample}: ${pair.fgHex} on ${pair.bgHex} -> ${res.ratioText} (required >= ${pair.minRatio}:1)`,
          );
        }
      }
      if (failures.length > 0) {
        throw new Error(
          `WCAG AA contrast failures${context ? ` (${context})` : ""} (${failures.length}):\n${failures.slice(0, 8).join("\n")}`,
        );
      }
    },
  };
}
