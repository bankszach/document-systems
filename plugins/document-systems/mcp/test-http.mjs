import http from "node:http";
import handler from "../../../api/mcp.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const server = http.createServer((request, response) => {
  handler(request, response).catch((error) => {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : String(error));
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("HTTP test server did not bind to a TCP port.");
}
const endpoint = `http://127.0.0.1:${address.port}/mcp`;

async function post(message, headers = {}) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(message),
  });
}

try {
  const initializeResponse = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      clientInfo: { name: "document-systems-http-test", version: "1.0.0" },
      capabilities: {},
    },
  });
  const initialize = await initializeResponse.json();
  assert(initializeResponse.status === 200, "Initialize did not return HTTP 200.");
  assert(
    initialize.result.protocolVersion === "2025-11-25",
    "Initialize did not negotiate the expected protocol version.",
  );

  const toolsResponse = await post({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  const toolList = await toolsResponse.json();
  assert(toolList.result.tools.length === 6, "HTTP transport did not expose six tools.");
  assert(
    toolList.result.tools.every((tool) =>
      tool.annotations.readOnlyHint === true &&
      tool.annotations.openWorldHint === false &&
      tool.annotations.destructiveHint === false &&
      tool.outputSchema
    ),
    "HTTP tool scan metadata is incomplete.",
  );

  const callResponse = await post({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "list_document_profiles",
      arguments: {},
    },
  });
  const callResult = await callResponse.json();
  assert(
    callResult.result.structuredContent.profiles.length === 4,
    "HTTP tool call did not return the four-profile catalog.",
  );

  const notificationResponse = await post({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });
  assert(
    notificationResponse.status === 202,
    "A notification should return HTTP 202 without a JSON-RPC body.",
  );

  const getResponse = await fetch(endpoint);
  assert(getResponse.status === 405, "GET must return 405 when SSE is unsupported.");

  const originResponse = await post(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "ping",
    },
    { origin: "https://untrusted.example" },
  );
  assert(originResponse.status === 403, "Untrusted browser origins must fail closed.");

  process.stdout.write(`${JSON.stringify({
    ok: true,
    transport: "streamable-http-json",
    tools: 6,
    notification_status: notificationResponse.status,
    get_status: getResponse.status,
    origin_status: originResponse.status,
  })}\n`);
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
}
