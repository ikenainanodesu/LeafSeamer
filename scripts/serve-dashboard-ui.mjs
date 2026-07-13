import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedBundles = new Set([
  "atem-control",
  "backup-system",
  "logger-system",
  "mixer-control",
  "obs-control",
  "schedule-manager",
  "seamer",
  "vb-matrix-control",
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const serverClosePromises = new WeakMap();

const sendNotFound = (response) => {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
};

const isWithin = (target, root) => {
  const relative = path.relative(root, target);
  return relative !== "" && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`);
};

const getRawPathname = (requestTarget) => {
  const queryIndex = requestTarget.indexOf("?");
  const fragmentIndex = requestTarget.indexOf("#");
  const endIndex = Math.min(
    queryIndex === -1 ? requestTarget.length : queryIndex,
    fragmentIndex === -1 ? requestTarget.length : fragmentIndex,
  );
  const targetWithoutQuery = requestTarget.slice(0, endIndex);
  if (targetWithoutQuery.startsWith("/")) return targetWithoutQuery;
  const schemeIndex = targetWithoutQuery.indexOf("://");
  if (schemeIndex === -1) return targetWithoutQuery;
  const pathIndex = targetWithoutQuery.indexOf("/", schemeIndex + 3);
  return pathIndex === -1 ? "/" : targetWithoutQuery.slice(pathIndex);
};

const createRequestHandler = (projectRoot) => (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    const rawPathname = decodeURIComponent(getRawPathname(request.url ?? "/"));
    if (rawPathname.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
      sendNotFound(response);
      return;
    }
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    sendNotFound(response);
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  const [bundlesDirectory, bundleName, outputDirectory, ...fileSegments] = segments;
  if (
    bundlesDirectory !== "bundles" ||
    !allowedBundles.has(bundleName) ||
    (outputDirectory !== "dashboard" && outputDirectory !== "shared") ||
    fileSegments.length === 0
  ) {
    sendNotFound(response);
    return;
  }

  const bundlesRoot = path.resolve(projectRoot, "bundles");
  const bundleRoot = path.resolve(bundlesRoot, bundleName);
  const outputRoot = path.resolve(bundleRoot, outputDirectory);
  const target = path.resolve(outputRoot, ...fileSegments);
  if (
    !isWithin(target, outputRoot) ||
    !fs.existsSync(target) ||
    fs.statSync(target).isDirectory()
  ) {
    sendNotFound(response);
    return;
  }

  let realProjectRoot;
  let realBundlesRoot;
  let realBundleRoot;
  let realOutputRoot;
  let realTarget;
  try {
    realProjectRoot = fs.realpathSync(projectRoot);
    realBundlesRoot = fs.realpathSync(bundlesRoot);
    realBundleRoot = fs.realpathSync(bundleRoot);
    realOutputRoot = fs.realpathSync(outputRoot);
    realTarget = fs.realpathSync(target);
  } catch {
    sendNotFound(response);
    return;
  }
  if (
    !isWithin(realBundlesRoot, realProjectRoot) ||
    !isWithin(realBundleRoot, realBundlesRoot) ||
    !isWithin(realOutputRoot, realBundleRoot) ||
    !isWithin(realTarget, realOutputRoot)
  ) {
    sendNotFound(response);
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(target)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(realTarget).pipe(response);
};

export const startDashboardServer = ({ host = "127.0.0.1", port = 4173, root = defaultProjectRoot } = {}) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(createRequestHandler(path.resolve(root)));
    const handleError = (error) => reject(error);
    server.once("error", handleError);
    server.listen(port, host, () => {
      server.off("error", handleError);
      resolve(server);
    });
  });

export const stopDashboardServer = (server) => {
  const existingClose = serverClosePromises.get(server);
  if (existingClose) return existingClose;
  const closePromise = server.listening
    ? new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        server.closeAllConnections();
      })
    : Promise.resolve();
  serverClosePromises.set(server, closePromise);
  return closePromise;
};

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const server = await startDashboardServer();
  process.stdout.write("Dashboard UI server: http://127.0.0.1:4173\n");

  let closePromise;
  const closeServer = async () => {
    closePromise ??= stopDashboardServer(server);
    try {
      await closePromise;
    } catch (error) {
      process.stderr.write(`Dashboard UI server shutdown failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    } finally {
      if (process.connected) process.disconnect();
    }
  };
  process.once("SIGINT", () => void closeServer());
  process.once("SIGTERM", () => void closeServer());
  if (process.send) {
    process.on("message", (message) => {
      if (message && typeof message === "object" && message.type === "leafseamer:shutdown") {
        void closeServer();
      }
    });
  }
}
