import assert from "node:assert/strict";
import { fork } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  startDashboardServer,
  stopDashboardServer,
} from "../scripts/serve-dashboard-ui.mjs";

const requestStatus = (server, requestPath) =>
  new Promise((resolve, reject) => {
    const address = server.address();
    assert(address && typeof address === "object");
    const request = http.request({
      host: "127.0.0.1",
      method: "GET",
      path: requestPath,
      port: address.port,
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    request.once("error", reject);
    request.end();
  });

test("Dashboard server can be started and stopped in the current process", async () => {
  const server = await startDashboardServer({ port: 0 });

  assert.equal(server.listening, true);
  await stopDashboardServer(server);
  assert.equal(server.listening, false);
});

test("Concurrent dashboard server stops share one completion promise", async () => {
  const server = await startDashboardServer({ port: 0 });
  let firstStop;

  try {
    firstStop = stopDashboardServer(server);
    const secondStop = stopDashboardServer(server);
    assert.strictEqual(secondStop, firstStop);
    await Promise.all([firstStop, secondStop]);
    assert.equal(server.listening, false);
  } finally {
    if (firstStop) await firstStop;
    else if (server.listening) await stopDashboardServer(server);
  }
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

test("Dashboard server rejects raw dot segments before URL normalization", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-dots-"));
  const dashboardRoot = path.join(fixtureRoot, "bundles", "logger-system", "dashboard");
  fs.mkdirSync(dashboardRoot, { recursive: true });
  fs.writeFileSync(path.join(dashboardRoot, "log-viewer.html"), "allowed");

  let server;
  try {
    server = await startDashboardServer({ port: 0, root: fixtureRoot });
    for (const requestPath of [
      "/bundles/graphics-package/../logger-system/dashboard/log-viewer.html",
      "/bundles/graphics-package/%2e%2e%2flogger-system/dashboard/log-viewer.html",
      "/bundles/graphics-package/%2e%2e%5clogger-system/dashboard/log-viewer.html",
    ]) {
      assert.equal(await requestStatus(server, requestPath), 404);
    }
  } finally {
    if (server?.listening) await stopDashboardServer(server);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("Dashboard server rejects a bundles root junction that escapes the project", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-project-"));
  const outsideBundlesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-bundles-"));
  const dashboardRoot = path.join(outsideBundlesRoot, "logger-system", "dashboard");
  fs.mkdirSync(dashboardRoot, { recursive: true });
  fs.writeFileSync(path.join(dashboardRoot, "log-viewer.html"), "outside");
  fs.symlinkSync(outsideBundlesRoot, path.join(fixtureRoot, "bundles"), "junction");

  let server;
  try {
    server = await startDashboardServer({ port: 0, root: fixtureRoot });
    assert.equal(
      await requestStatus(server, "/bundles/logger-system/dashboard/log-viewer.html"),
      404,
    );
  } finally {
    if (server?.listening) await stopDashboardServer(server);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(outsideBundlesRoot, { recursive: true, force: true });
  }
});

test("Dashboard server exits naturally after an internal IPC shutdown request", async () => {
  const scriptPath = fileURLToPath(new URL("../scripts/serve-dashboard-ui.mjs", import.meta.url));
  const child = fork(scriptPath, [], {
    cwd: path.dirname(path.dirname(scriptPath)),
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "";
  let errors = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    errors += chunk;
  });

  let startupTimer;
  let shutdownTimer;
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
    const naturalExit = new Promise((resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    child.send({ type: "leafseamer:shutdown" });
    const exitResult = await Promise.race([
      naturalExit,
      new Promise((_, reject) => {
        shutdownTimer = setTimeout(() => reject(new Error("Server IPC shutdown timed out")), 2_000);
      }),
    ]);
    clearTimeout(shutdownTimer);
    assert.deepEqual(exitResult, { code: 0, signal: null });
  } finally {
    clearTimeout(startupTimer);
    clearTimeout(shutdownTimer);
    if (child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
});
