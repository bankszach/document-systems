import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const marketplacePath = path.join(
  repositoryRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);
const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));

if (marketplace.name !== "document-systems-public") {
  throw new Error("Unexpected marketplace name.");
}
if (marketplace.plugins.length !== 1) {
  throw new Error("The public marketplace must contain exactly one plugin.");
}

const entry = marketplace.plugins[0];
const pluginRoot = path.resolve(repositoryRoot, entry.source.path);
const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.name !== entry.name || manifest.name !== "document-systems") {
  throw new Error("Marketplace and manifest plugin names differ.");
}
if (manifest.version !== "0.1.0") {
  throw new Error("The release manifest must use version 0.1.0.");
}
if (manifest.license !== "MIT") {
  throw new Error("The release manifest must declare the repository license.");
}

for (const relativePath of [
  manifest.skills,
  manifest.mcpServers,
  ".codex-plugin/plugin.json",
]) {
  const target = path.resolve(pluginRoot, relativePath);
  if (!target.startsWith(`${pluginRoot}${path.sep}`) || !fs.existsSync(target)) {
    throw new Error(`Manifest path does not resolve inside the plugin: ${relativePath}`);
  }
}

const mcpConfig = JSON.parse(
  fs.readFileSync(path.join(pluginRoot, manifest.mcpServers), "utf8"),
);
const server = mcpConfig.mcpServers?.documentSystems;
if (
  server?.command !== "node" ||
  server?.args?.length !== 1 ||
  server.args[0] !== "./mcp/server.mjs"
) {
  throw new Error("Unexpected MCP launch contract.");
}

const forbiddenPatterns = [
  /\/Users\//,
  new RegExp(["m5", "pro"].join("-"), "i"),
  /chatgpt\.com\/c\//i,
  /\bgh[opsu]_[A-Za-z0-9_]+\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /BEGIN [A-Z ]*PRIVATE KEY/,
];
const textExtensions = new Set([
  ".json",
  ".md",
  ".mjs",
  ".yaml",
  ".yml",
]);

function walk(directory) {
  for (const entryValue of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entryValue.name);
    if (entryValue.isSymbolicLink()) {
      throw new Error(`Symlinks are not allowed in the release: ${absolutePath}`);
    }
    if (entryValue.isDirectory()) {
      walk(absolutePath);
      continue;
    }
    if (!textExtensions.has(path.extname(entryValue.name))) {
      continue;
    }
    const text = fs.readFileSync(absolutePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        throw new Error(`Forbidden private or secret-like content in ${absolutePath}`);
      }
    }
  }
}

walk(repositoryRoot);

process.stdout.write(`${JSON.stringify({
  ok: true,
  marketplace: marketplace.name,
  plugin: manifest.name,
  version: manifest.version,
  mcp_command: [server.command, ...server.args],
})}\n`);
