export default function handler(_request, response) {
  if (typeof response.status === "function") {
    response.status(200);
  } else {
    response.statusCode = 200;
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify({
    status: "ok",
    service: "document-systems",
    publisher: "Banks Inc.",
    persistence: "none",
  }));
}
