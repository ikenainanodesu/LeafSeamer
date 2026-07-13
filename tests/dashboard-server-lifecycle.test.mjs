import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  startDashboardServer,
  stopDashboardServer,
} from "../scripts/serve-dashboard-ui.mjs";

test("Dashboard server can be started and stopped in the current process", async () => {
  const server = await startDashboardServer({ port: 0 });

  assert.equal(server.listening, true);
  await stopDashboardServer(server);
  assert.equal(server.listening, false);
});

test("Dashboard server rejects an output directory symlink that escapes the project", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-root-"));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-outside-"));
  const bundleRoot = path.join(fixtureRoot, "bundles", "obs-control");
  fs.mkdirSync(path.join(bundleRoot, "shared"), { recursive: true });
  fs.writeFileSync(path.join(bundleRoot, "shared", "allowed.txt"), "allowed");
  fs.writeFileSync(path.join(outsideRoot, "secret.txt"), "secret");
  fs.symlinkSync(outsideRoot, path.join(bundleRoot, "dashboard"), "junction");

  let server;
  try {
    server = await startDashboardServer({ port: 0, root: fixtureRoot });
    const address = server.address();
    assert(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;

    assert.equal((await fetch(`${origin}/bundles/obs-control/shared/allowed.txt`)).status, 200);
    assert.equal((await fetch(`${origin}/bundles/obs-control/dashboard/secret.txt`)).status, 404);
  } finally {
    if (server?.listening) await stopDashboardServer(server);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("Dashboard server remains directly executable with a newline-terminated startup log", async () => {
  const scriptPath = fileURLToPath(new URL("../scripts/serve-dashboard-ui.mjs", import.meta.url));
  const child = spawn(process.execPath, [scriptPath], {
    cwd: path.dirname(path.dirname(scriptPath)),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errors = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    errors += chunk;
  });

  let startupTimer;
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        child.stdout.on("data", (chunk) => {
          output += chunk;
          if (output.includes("\n")) resolve();
        });
        child.once("exit", (code) => {
          reject(new Error(`Server exited before startup (${code}): ${errors}`));
        });
      }),
      new Promise((_, reject) => {
        startupTimer = setTimeout(() => reject(new Error("Server startup timed out")), 10_000);
      }),
    ]);
    assert.equal(output, "Dashboard UI server: http://127.0.0.1:4173\n");
    assert.equal(
      (await fetch("http://127.0.0.1:4173/bundles/logger-system/dashboard/log-viewer.html")).status,
      200,
    );
  } finally {
    clearTimeout(startupTimer);
    if (child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
});
