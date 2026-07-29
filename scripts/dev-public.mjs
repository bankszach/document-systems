import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthHandler from "../api/health.mjs";
import mcpHandler from "../api/mcp.mjs";
import challengeHandler from "../api/openai-apps-challenge.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(repositoryRoot, "public");
const port = Number(process.env.PORT ?? 4173);
const cleanPages = new Map([
  ["/", "index.html"],
  ["/demo", "demo.html"],
  ["/privacy", "privacy.html"],
  ["/support", "support.html"],
  ["/terms", "terms.html"],
]);
const mediaTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const cleanPage = cleanPages.get(requestUrl.pathname);
  const relativePath = cleanPage ?? requestUrl.pathname.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicRoot, relativePath);
  if (!absolutePath.startsWith(`${publicRoot}${path.sep}`)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }
  try {
    const content = await fs.readFile(absolutePath);
    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      mediaTypes.get(path.extname(absolutePath)) ?? "application/octet-stream",
    );
    response.end(content);
  } catch {
    response.statusCode = 404;
    response.end("Not Found");
  }
}

const server = http.createServer(async (request, response) => {
  const requestPath = new URL(
    request.url,
    `http://${request.headers.host}`,
  ).pathname;
  if (requestPath === "/mcp") {
    await mcpHandler(request, response);
    return;
  }
  if (requestPath === "/health") {
    healthHandler(request, response);
    return;
  }
  if (requestPath === "/.well-known/openai-apps-challenge") {
    challengeHandler(request, response);
    return;
  }
  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Document Systems development server: http://127.0.0.1:${port}\n`);
});
