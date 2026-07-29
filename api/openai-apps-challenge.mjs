export default function handler(_request, response) {
  const token = process.env.OPENAI_APPS_CHALLENGE;
  if (!token) {
    if (typeof response.status === "function") {
      response.status(404);
    } else {
      response.statusCode = 404;
    }
    response.end("Not configured");
    return;
  }
  if (typeof response.status === "function") {
    response.status(200);
  } else {
    response.statusCode = 200;
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(token);
}
