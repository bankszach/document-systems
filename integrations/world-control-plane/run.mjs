import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [sequenceText, originX, originY, originZ] = process.argv.slice(2);
if (
  !sequenceText ||
  [originX, originY, originZ].some((value) => value === undefined)
) {
  throw new Error(
    "usage: node integrations/world-control-plane/run.mjs <sequence> <origin-x> <origin-y> <origin-z>",
  );
}
const sequence = Number(sequenceText);
const origin = [originX, originY, originZ].map(Number);
if (
  !Number.isSafeInteger(sequence) ||
  sequence < 1 ||
  origin.some((value) => !Number.isSafeInteger(value))
) {
  throw new Error("sequence and origin must be integers.");
}

const engineRoot = process.env.SEMANTIC_CONSENSUS_ENGINE_ROOT;
const plannerRoot = process.env.MINECRAFT_SEMANTIC_PLANNER_ROOT;
const wcpRoot = process.env.WORLD_CONTROL_PLANE_ROOT;
for (const [name, value] of Object.entries({
  SEMANTIC_CONSENSUS_ENGINE_ROOT: engineRoot,
  MINECRAFT_SEMANTIC_PLANNER_ROOT: plannerRoot,
  WORLD_CONTROL_PLANE_ROOT: wcpRoot,
})) {
  if (!value || !path.isAbsolute(value)) {
    throw new Error(`${name} must be an absolute repository path.`);
  }
}

const endpoint =
  process.env.DOCUMENT_SYSTEMS_MCP_URL ?? "https://documents.banksinc.us/mcp";
const python = process.env.PYTHON_EXECUTABLE ?? "python3";
const outputRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "document-systems-wcp-"),
);
const engineOutput = path.join(outputRoot, "semantic-engine");
const proposalPath = path.join(outputRoot, "minecraft-semantic-proposal.json");
const previewOutput = path.join(outputRoot, "wcp-preview");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    timeout: options.timeout ?? 120_000,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} failed with ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout.trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot canonicalize a non-finite number.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`,
    ).join(",")}}`;
  }
  throw new Error(`Cannot canonicalize ${typeof value}.`);
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalize(value))
    .digest("hex");
}

function timestamp(date) {
  return date.toISOString().replace(".000Z", "Z");
}

function source(sourceId, label, value) {
  return {
    source_id: sourceId,
    source_kind: "TEST_RESULT",
    locator: {
      uri: `urn:document-systems:wcp-integration:${sourceId.toLowerCase()}`,
      label,
    },
    availability: "CONTENT_SUPPLIED",
    integrity: {
      digest: {
        algorithm: "sha-256",
        canonicalization: "RFC8785",
        value: digest(value),
      },
      digest_origin: "CALLER_SUPPLIED",
    },
    review_assertion: {
      status: "REVIEWED_BY_CALLER",
      asserted_by: "document-systems WCP integration harness",
    },
  };
}

let requestId = 0;
async function callTool(name, args) {
  requestId += 1;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://documents.banksinc.us",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${name} HTTP ${response.status}: ${text}`);
  }
  const message = JSON.parse(text);
  if (message.error || message.result?.isError) {
    throw new Error(`${name} failed: ${text}`);
  }
  return message.result.structuredContent;
}

run(
  python,
  [
    "-m",
    "semantic_consensus_engine.cli",
    "demo",
    "--input",
    path.join(engineRoot, "examples", "youtube-commentThreads-v1.json"),
    "--output",
    engineOutput,
  ],
  {
    cwd: engineRoot,
    env: { PYTHONPATH: path.join(engineRoot, "src") },
  },
);
const envelopePath = path.join(
  engineOutput,
  "semantic-consensus-envelope.json",
);
const envelope = readJson(envelopePath);
const now = new Date();
const issuedAt = timestamp(now);
const expiresAt = timestamp(new Date(now.getTime() + 10 * 60_000));
const roundId =
  `round.document-systems.${issuedAt.replace(/[-:.TZ]/g, "").toLowerCase()}`;

run(
  python,
  [
    "-m",
    "minecraft_semantic_planner.cli",
    "proposal",
    envelopePath,
    "--round-id",
    roundId,
    "--round-digest",
    envelope.envelope_digest,
    "--issued-at",
    issuedAt,
    "--ttl-seconds",
    "900",
    "--proposal-output",
    proposalPath,
  ],
  {
    cwd: plannerRoot,
    env: { PYTHONPATH: path.join(plannerRoot, "src") },
  },
);
const proposal = readJson(proposalPath);

const proposalPacket = await callTool("compile_document_packet", {
  work_id: "work:integration:wcp-semantic-proposal",
  title: "WCP Semantic Proposal Preview Admission",
  purpose:
    "Gate one synthetic Semantic Consensus Engine proposal before zero-mutation WCP preview.",
  primary_profile: "operational",
  scope: [
    "semantic envelope",
    "relative Minecraft proposal",
    "WCP preview admission",
  ],
  non_goals: [
    "world mutation",
    "human acceptance",
    "authentic audience authority",
  ],
  source_refs: [
    source("SRC-CONSENSUS", "Synthetic consensus envelope", envelope),
    source("SRC-PROPOSAL", "Minecraft semantic proposal", proposal),
  ],
  elements: [
    {
      element_id: "ROLE-SEMANTIC-ENGINE",
      kind: "ROLE",
      title: "Semantic Consensus Engine",
      statement: "Produces a qualified synthetic consensus envelope only.",
      source_refs: ["SRC-CONSENSUS"],
    },
    {
      element_id: "ROLE-WCP",
      kind: "ROLE",
      title: "World Control Plane",
      statement: "Owns placement, Paper preview, and any later execution gate.",
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      element_id: "STATE-PROPOSED",
      kind: "STATE",
      title: "Proposal compiled",
      statement:
        `${proposal.selected_position} proposal ${proposal.proposal_id} is compiled with ${proposal.change_count_upper_bound} maximum changes.`,
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      element_id: "STATE-PREVIEW-ADMITTED",
      kind: "STATE",
      title: "Preview admitted",
      statement: "WCP may run only world.semantic-proposal.preview.v1.",
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      element_id: "EXC-PROPOSAL-MISMATCH",
      kind: "EXCEPTION",
      title: "Proposal mismatch",
      statement: "Stop before Paper preview on any digest or invariant mismatch.",
      owner_ref: "ROLE-WCP",
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      element_id: "TRANS-PROPOSAL-PREVIEW",
      kind: "TRANSITION",
      title: "Admit zero-mutation preview",
      statement:
        "Move the exact digest-bound proposal to WCP preview admission.",
      from_state: "STATE-PROPOSED",
      to_state: "STATE-PREVIEW-ADMITTED",
      owner_ref: "ROLE-WCP",
      gate_evidence_refs: ["SRC-CONSENSUS", "SRC-PROPOSAL"],
      exception_route_ref: "EXC-PROPOSAL-MISMATCH",
    },
  ],
  semantic_assertions: [
    {
      assertion_id: "ASSERT-PROPOSAL-CHOICE",
      element_ref: "STATE-PROPOSED",
      field: "statement",
      operator: "INCLUDES",
      expected: proposal.selected_position,
      source_refs: ["SRC-CONSENSUS", "SRC-PROPOSAL"],
    },
    {
      assertion_id: "ASSERT-PROPOSAL-CHANGE-CAP",
      element_ref: "STATE-PROPOSED",
      field: "statement",
      operator: "INCLUDES",
      expected: String(proposal.change_count_upper_bound),
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      assertion_id: "ASSERT-PREVIEW-CAPABILITY",
      element_ref: "STATE-PREVIEW-ADMITTED",
      field: "statement",
      operator: "INCLUDES",
      expected: "world.semantic-proposal.preview.v1",
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      assertion_id: "ASSERT-TRANSITION-FROM",
      element_ref: "TRANS-PROPOSAL-PREVIEW",
      field: "from_state",
      operator: "EQUALS",
      expected: "STATE-PROPOSED",
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      assertion_id: "ASSERT-TRANSITION-TO",
      element_ref: "TRANS-PROPOSAL-PREVIEW",
      field: "to_state",
      operator: "EQUALS",
      expected: "STATE-PREVIEW-ADMITTED",
      source_refs: ["SRC-PROPOSAL"],
    },
  ],
  generated_by: {
    kind: "CALLER",
    id: "document-systems-wcp-integration",
    version: "0.1.0",
  },
  response_mode: "SUMMARY",
  view_type: "HUMAN_ACTION",
  audience: "WCP release operator",
});
if (proposalPacket.release_gate.status !== "READY_FOR_HUMAN_DECISION") {
  throw new Error(
    `Document Systems blocked WCP preview: ${JSON.stringify(proposalPacket)}`,
  );
}

const previewStdout = run(
  path.join(wcpRoot, "scripts", "semantic-proposal-preview.sh"),
  [
    proposalPath,
    ...origin.map(String),
    String(sequence),
    issuedAt,
    expiresAt,
    issuedAt,
    previewOutput,
  ],
  { cwd: wcpRoot, timeout: 180_000 },
);
const previewProofPath = path.join(previewOutput, "server-preview.proof.json");
const previewProof = readJson(previewProofPath);
const previewPacket = await callTool("compile_document_packet", {
  work_id: "work:integration:wcp-semantic-preview-proof",
  title: "WCP Semantic Proposal Zero-Mutation Proof",
  purpose:
    "Record the bounded result of a live WCP semantic-proposal preview.",
  primary_profile: "operational",
  scope: ["proposal admission", "Paper preview", "zero world mutation"],
  non_goals: ["apply", "verify mutation", "human acceptance"],
  source_refs: [
    source("SRC-PROPOSAL", "Minecraft semantic proposal", proposal),
    source("SRC-WCP-PREVIEW", "Live WCP preview proof", previewProof),
  ],
  elements: [
    {
      element_id: "ROLE-WCP",
      kind: "ROLE",
      title: "World Control Plane",
      statement: "Owns the named zero-mutation preview capability.",
      source_refs: ["SRC-WCP-PREVIEW"],
    },
    {
      element_id: "STATE-ADMITTED",
      kind: "STATE",
      title: "Proposal admitted",
      statement: `Proposal ${proposal.proposal_id} passed Document Systems gating.`,
      source_refs: ["SRC-PROPOSAL"],
    },
    {
      element_id: "STATE-PREVIEWED",
      kind: "STATE",
      title: "Paper previewed",
      statement:
        `WCP returned ${previewProof.status} with world_mutation=${previewProof.world_mutation}.`,
      source_refs: ["SRC-WCP-PREVIEW"],
    },
    {
      element_id: "EXC-PREVIEW-FAILED",
      kind: "EXCEPTION",
      title: "Preview failed",
      statement: "Stop without apply when preview or proof verification fails.",
      owner_ref: "ROLE-WCP",
      source_refs: ["SRC-WCP-PREVIEW"],
    },
    {
      element_id: "TRANS-ADMIT-PREVIEW",
      kind: "TRANSITION",
      title: "Run zero-mutation Paper preview",
      statement: "Move from admitted proposal to terminal preview proof.",
      from_state: "STATE-ADMITTED",
      to_state: "STATE-PREVIEWED",
      owner_ref: "ROLE-WCP",
      gate_evidence_refs: ["SRC-PROPOSAL", "SRC-WCP-PREVIEW"],
      exception_route_ref: "EXC-PREVIEW-FAILED",
    },
  ],
  semantic_assertions: [
    {
      assertion_id: "ASSERT-WORLD-NOT-MUTATED",
      element_ref: "STATE-PREVIEWED",
      field: "statement",
      operator: "INCLUDES",
      expected: "world_mutation=false",
      source_refs: ["SRC-WCP-PREVIEW"],
    },
    {
      assertion_id: "ASSERT-PREVIEW-FROM",
      element_ref: "TRANS-ADMIT-PREVIEW",
      field: "from_state",
      operator: "EQUALS",
      expected: "STATE-ADMITTED",
      source_refs: ["SRC-WCP-PREVIEW"],
    },
    {
      assertion_id: "ASSERT-PREVIEW-TO",
      element_ref: "TRANS-ADMIT-PREVIEW",
      field: "to_state",
      operator: "EQUALS",
      expected: "STATE-PREVIEWED",
      source_refs: ["SRC-WCP-PREVIEW"],
    },
  ],
  generated_by: {
    kind: "CALLER",
    id: "document-systems-wcp-integration",
    version: "0.1.0",
  },
  response_mode: "FULL",
  view_type: "HUMAN_ACTION",
  audience: "WCP release operator",
});
const packetVerification = await callTool("verify_document_packet", {
  packet: previewPacket,
});
if (!packetVerification.valid) {
  throw new Error(
    `Document Systems could not verify its WCP preview packet: ${JSON.stringify(packetVerification)}`,
  );
}

process.stdout.write(`${JSON.stringify({
  ok:
    previewPacket.release_gate.status === "READY_FOR_HUMAN_DECISION" &&
    previewProof.world_mutation === false,
  endpoint,
  evidence_class: "SYNTHETIC_INTEGRATION",
  semantic_envelope_id: envelope.envelope_id,
  proposal_id: proposal.proposal_id,
  proposal_packet_id: proposalPacket.packet_id,
  preview_packet_id: previewPacket.packet_id,
  preview_status: previewProof.status,
  world_mutation: previewProof.world_mutation,
  release_gate: previewPacket.release_gate.status,
  packet_verified: packetVerification.valid,
  wcp_output: previewStdout
    .split("\n")
    .filter((line) =>
      line.startsWith("submitted_request=") ||
      line.startsWith("semantic_preview_")
    ),
  proof_root: outputRoot,
}, null, 2)}\n`);
