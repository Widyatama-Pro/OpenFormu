import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Avoid Node DEP0190 shell-concatenation warnings on Windows.
function spawnPlatformCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      ...options,
      windowsHide: true,
    });
  }
  return spawn(command, args, options);
}

export async function ensureBuild({ rootDir, skipBuild = false, quiet = false }) {
  if (!skipBuild) {
    await new Promise((resolve, reject) => {
      const child = spawnPlatformCommand("npm", ["run", "build"], {
        cwd: rootDir,
        stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
        env: { ...process.env, NO_UPDATE_NOTIFIER: "1" },
      });

      let output = "";
      if (quiet) {
        child.stdout?.on("data", (chunk) => {
          output += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
          output += chunk.toString();
        });
      }

      child.on("error", (err) => {
        reject(new Error(`Failed to start npm run build: ${err.message}`));
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `npm run build exited with code ${code}.${output ? `\n${output.trim()}` : ""}`,
            ),
          );
        }
      });
    });
  }

  const distIndex = path.join(rootDir, "dist", "index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error(
      `Missing production build artifact at ${distIndex}. Run without --skip-build or run "npm run build" first.`,
    );
  }
}

export async function killProcessTree(pid) {
  if (!pid || typeof pid !== "number") return;

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // Process already exited.
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already dead.
    }
  }
}

export async function startPreviewServer({
  rootDir,
  port = 4179,
  host = "127.0.0.1",
  timeoutMs = 20000,
}) {
  const url = `http://${host}:${port}/`;
  const logs = [];
  let exitedEarly = null;

  const child = spawnPlatformCommand(
    "npx",
    ["vite", "preview", "--port", String(port), "--strictPort", "--host", host],
    {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: { ...process.env, NO_UPDATE_NOTIFIER: "1" },
    },
  );

  child.stdout?.on("data", (chunk) => {
    logs.push(chunk.toString());
  });
  child.stderr?.on("data", (chunk) => {
    logs.push(chunk.toString());
  });
  child.on("close", (code, signal) => {
    exitedEarly = { code, signal };
  });

  const stop = async () => {
    if (child.pid) {
      await killProcessTree(child.pid);
    }
  };

  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      if (exitedEarly !== null) {
        throw new Error(
          `vite preview exited early (code=${exitedEarly.code}, signal=${exitedEarly.signal}) before ${url} became ready.\nLogs:\n${logs.join("")}`,
        );
      }

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (res.status === 200) {
          return {
            url,
            port,
            host,
            pid: child.pid ?? null,
            stop,
          };
        }
      } catch {
        // Not listening yet; wait and retry.
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for ${url} to return HTTP 200.\nLogs:\n${logs.join("")}`,
    );
  } catch (err) {
    await stop();
    throw err;
  }
}
