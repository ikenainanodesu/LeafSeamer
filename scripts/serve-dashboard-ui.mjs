import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const sendNotFound = (response) => {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
};

let idleTimer;
const scheduleIdleShutdown = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => server.close(() => process.exit(0)), 10_000);
  idleTimer.unref();
};

const server = http.createServer((request, response) => {
  scheduleIdleShutdown();
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    sendNotFound(response);
    return;
  }

  const target = path.resolve(projectRoot, pathname.replace(/^[/\\]+/, ""));
  const relativeTarget = path.relative(projectRoot, target);
  if (
    relativeTarget === "" ||
    path.isAbsolute(relativeTarget) ||
    relativeTarget.startsWith(`..${path.sep}`) ||
    relativeTarget === ".." ||
    !fs.existsSync(target) ||
    fs.statSync(target).isDirectory()
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
  fs.createReadStream(target).pipe(response);
});

server.listen(4173, "127.0.0.1", () => {
  process.stdout.write("Dashboard UI server: http://127.0.0.1:4173\\n");
  scheduleIdleShutdown();
});

const closeServer = () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
};
process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
