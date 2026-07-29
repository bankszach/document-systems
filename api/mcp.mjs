import {
  MAX_PAYLOAD_BYTES,
  processJsonRpcMessage,
} from "../plugins/document-systems/mcp/server.mjs";

const ALLOWED_ORIGINS = new Set([
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://documents.banksinc.us",
]);

function applyCommonHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function withStatus(response, statusCode) {
  if (typeof response.status === "function") {
    return response.status(statusCode);
  }
  response.statusCode = statusCode;
  return response;
}

function allowOrigin(request, response) {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }
  if (
    ALLOWED_ORIGINS.has(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    return true;
  }
  return false;
}

async function readBody(request) {
  if (request.body !== undefined) {
    const serialized =
      typeof request.body === "string"
        ? request.body
        : Buffer.isBuffer(request.body)
          ? request.body.toString("utf8")
          : JSON.stringify(request.body);
    if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
      throw new RangeError("Payload too large");
    }
    return serialized;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_PAYLOAD_BYTES) {
      throw new RangeError("Payload too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  applyCommonHeaders(response);

  if (!allowOrigin(request, response)) {
    withStatus(response, 403).end("Origin not allowed");
    return;
  }

  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
    );
    withStatus(response, 204).end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    withStatus(response, 405).end("Method Not Allowed");
    return;
  }

  const contentType = String(request.headers["content-type"] ?? "");
  if (!contentType.toLowerCase().includes("application/json")) {
    withStatus(response, 415).end("Content-Type must be application/json");
    return;
  }

  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAYLOAD_BYTES) {
    withStatus(response, 413).end("Payload Too Large");
    return;
  }

  try {
    const rawBody = await readBody(request);
    const message = JSON.parse(rawBody);
    const rpcResponse = processJsonRpcMessage(message);
    if (rpcResponse === undefined) {
      withStatus(response, 202).end();
      return;
    }
    withStatus(response, 200)
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .end(JSON.stringify(rpcResponse));
  } catch (error) {
    if (error instanceof RangeError) {
      withStatus(response, 413).end("Payload Too Large");
      return;
    }
    withStatus(response, 200)
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .end(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      }));
  }
}
