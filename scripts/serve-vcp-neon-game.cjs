const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..", "public");
const port = Number(process.env.PORT || 3017);
const host = "127.0.0.1";
const gameUrl = `http://${host}:${port}/vcp-neon-game/index.html`;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function safeResolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(root, normalized);
  if (!fullPath.startsWith(root)) return null;
  return fullPath;
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/vcp-neon-game/index.html" : req.url;
  let filePath = safeResolve(requestPath);

  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 404, `Not found: ${requestPath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
});

server.listen(port, host, () => {
  console.log("");
  console.log("==========================================");
  console.log("  VCP Neon Runtime Survivor - Static Dev");
  console.log("==========================================");
  console.log("");
  console.log(`Serving: ${root}`);
  console.log(`Game URL: ${gameUrl}`);
  console.log("");
  console.log("Press Ctrl+C in this window to stop the server.");
  console.log("");

  const opener = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", gameUrl] : [gameUrl];
  spawn(opener, args, { detached: true, stdio: "ignore" }).unref();
});

process.on("SIGINT", () => {
  console.log("\nStopping VCP Neon Game server...");
  server.close(() => process.exit(0));
});