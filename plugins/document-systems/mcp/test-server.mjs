import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(currentDirectory, "server.mjs");
const pluginRoot = path.dirname(currentDirectory);
let nextId = 1;

function rpc(calls) {
  const messages = [
    {
      jsonrpc: "2.0",
      id: nextId++,
      method: "initialize",
      params: { protocolVersion: "2025-11-25" },
    },
    ...calls.map((call) => ({
      jsonrpc: "2.0",
      id: nextId++,
      method: call.method ?? "tools/call",
      params: call.params,
    })),
  ];
  const result = spawnSync(process.execPath, [serverPath], {
    input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
    encoding: "utf8",
    timeout: 10000,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `Server exited ${result.status}`);
  }
  const responses = result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return responses.slice(1);
}

function call(name, args) {
  return rpc([{ params: { name, arguments: args } }])[0];
}

function structured(response) {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.result.structuredContent;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function treeState(root) {
  const output = {};
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      Object.assign(output, Object.fromEntries(
        Object.entries(treeState(fullPath)).map(([key, value]) => [
          `${entry.name}/${key}`,
          value,
        ]),
      ));
    } else {
      const stat = fs.statSync(fullPath);
      output[entry.name] = `${stat.size}:${stat.mtimeMs}`;
    }
  }
  return output;
}

const beforeState = treeState(pluginRoot);
const source = {
  source_id: "SRC-TEST",
  source_kind: "TEST_RESULT",
  locator: { uri: "urn:test:result", label: "Bounded test input" },
  availability: "CONTENT_SUPPLIED",
  review_assertion: {
    status: "REVIEWED_BY_CALLER",
    asserted_by: "test-suite",
  },
};
const completeOperationalInput = {
  work_id: "work:test:operational-plan",
  title: "Bounded operational plan",
  purpose: "Exercise the stateless document-system contracts.",
  primary_profile: "operational",
  scope: ["Local protocol validation"],
  non_goals: ["External execution", "Acceptance"],
  source_refs: [source],
  elements: [
    {
      element_id: "ROLE-OPERATOR",
      kind: "ROLE",
      title: "Operator",
      statement: "Own the bounded test.",
    },
    {
      element_id: "STATE-READY",
      kind: "STATE",
      title: "Ready",
      statement: "All test inputs are supplied.",
    },
    {
      element_id: "STATE-DONE",
      kind: "STATE",
      title: "Done",
      statement: "Expected protocol results were observed.",
    },
    {
      element_id: "EXC-BLOCKED",
      kind: "EXCEPTION",
      title: "Blocked",
      statement: "Return a structured failure and stop.",
      owner_ref: "ROLE-OPERATOR",
    },
    {
      element_id: "TRANS-RUN",
      kind: "TRANSITION",
      title: "Run bounded test",
      statement: "Move from ready to done after observing the expected result.",
      from_state: "STATE-READY",
      to_state: "STATE-DONE",
      owner_ref: "ROLE-OPERATOR",
      gate_evidence_refs: ["SRC-TEST"],
      exception_route_ref: "EXC-BLOCKED",
    },
  ],
};

const toolList = rpc([{ method: "tools/list", params: {} }])[0].result.tools;
assert(toolList.length === 4, "Expected four callable tools.");
assert(
  toolList.every((tool) =>
    tool.annotations.readOnlyHint === true &&
    tool.annotations.openWorldHint === false &&
    tool.annotations.destructiveHint === false &&
    tool.outputSchema &&
    tool.inputSchema.additionalProperties === false
  ),
  "Tool safety/schema declarations are incomplete.",
);

const profileCatalog = structured(call("list_document_profiles", {}));
assert(profileCatalog.profiles.length === 4, "Expected the four-profile catalog.");
assert(
  profileCatalog.profiles.every((profile) =>
    /^[a-f0-9]{64}$/.test(profile.profile_digest.value)
  ),
  "Profile digests are missing.",
);

// Probe 1 and 2: deterministic composition and lifecycle isolation.
const firstEnvelope = structured(
  call("compose_document_expression", completeOperationalInput),
);
const secondEnvelope = structured(
  call("compose_document_expression", JSON.parse(JSON.stringify(completeOperationalInput))),
);
assert(
  JSON.stringify(firstEnvelope) === JSON.stringify(secondEnvelope),
  "Byte-equivalent input did not compose deterministically.",
);
assert(
  firstEnvelope.expression.proposal_state === "PROPOSED" &&
  firstEnvelope.persistence_status === "NOT_PERSISTED",
  "Composition crossed its proposal or persistence boundary.",
);
const lifecycleTamper = structured(
  call("validate_document_expression", {
    envelope: {
      ...firstEnvelope,
      expression: { ...firstEnvelope.expression, proposal_state: "ACCEPTED" },
    },
  }),
);
assert(
  lifecycleTamper.checks.some((item) => item.check_id === "LIFECYCLE_CONTAMINATION"),
  "Lifecycle contamination was not rejected.",
);

// Probe 3: post-composition tampering.
const tampered = structured(
  call("validate_document_expression", {
    envelope: {
      ...firstEnvelope,
      expression: { ...firstEnvelope.expression, title: "Tampered title" },
    },
  }),
);
assert(
  tampered.integrity_ok === false &&
  tampered.checks.some((item) => item.check_id === "INTEGRITY_MISMATCH"),
  "Post-composition tampering did not fail integrity.",
);

// Probe 4: a well-formed anchor is not complete lineage.
const childEnvelope = structured(
  call("compose_document_expression", {
    ...completeOperationalInput,
    title: "Revision proposal",
    parents: [{
      relation: "REVISES",
      work_id: firstEnvelope.expression.work_id,
      expression_id: firstEnvelope.expression_id,
      expression_digest: firstEnvelope.integrity,
    }],
    generation_method: "REVISION",
  }),
);
const anchorOnly = structured(
  call("validate_document_expression", { envelope: childEnvelope }),
);
assert(
  anchorOnly.lineage_result.status === "ANCHOR_DECLARED" &&
  anchorOnly.not_established.includes("COMPLETE_LINEAGE"),
  "Unsupplied lineage was overstated.",
);

// Probe 5: mismatched supplied parent fails the chain.
const wrongParent = {
  ...firstEnvelope,
  expression: { ...firstEnvelope.expression, title: "Wrong supplied parent" },
};
const invalidLineage = structured(
  call("validate_document_expression", {
    envelope: childEnvelope,
    supplied_lineage: [wrongParent],
  }),
);
assert(
  invalidLineage.result === "FAIL" &&
  invalidLineage.lineage_result.status === "SUPPLIED_CHAIN_INVALID",
  "Invalid supplied lineage was not rejected.",
);
const validLineage = structured(
  call("validate_document_expression", {
    envelope: childEnvelope,
    supplied_lineage: [firstEnvelope],
  }),
);
assert(
  validLineage.lineage_result.status === "SUPPLIED_CHAIN_VALID",
  "Valid supplied lineage did not validate.",
);

// Probe 6: a bare reference cannot launder an OBSERVED claim.
const evidenceLaunderingEnvelope = structured(
  call("compose_document_expression", {
    work_id: "work:test:research-note",
    title: "Research proposal",
    purpose: "Exercise evidence boundaries.",
    primary_profile: "research",
    source_refs: [{
      source_id: "SRC-BARE",
      source_kind: "PRIMARY_SOURCE",
      locator: { uri: "urn:test:bare" },
      availability: "REFERENCE_ONLY",
      review_assertion: { status: "NOT_ASSERTED" },
    }],
    elements: [
      {
        element_id: "CLAIM-OBSERVED",
        kind: "CLAIM",
        title: "Observed claim",
        statement: "This claim is deliberately unsupported.",
        epistemic_status: "OBSERVED",
        evidence_refs: ["SRC-BARE"],
        assumption_refs: [],
        counterevidence_refs: [],
      },
      {
        element_id: "TEST-CLAIM",
        kind: "VERIFICATION",
        title: "Claim test",
        statement: "Review the supporting source.",
      },
      {
        element_id: "EXC-EVIDENCE",
        kind: "EXCEPTION",
        title: "Evidence unavailable",
        statement: "Return the claim as unsupported.",
      },
    ],
  }),
);
const evidenceLaundering = structured(
  call("validate_document_expression", {
    envelope: evidenceLaunderingEnvelope,
  }),
);
assert(
  evidenceLaundering.checks.some(
    (item) => item.check_id === "OBSERVED_CLAIM_LACKS_REVIEWED_SUPPORT",
  ),
  "Evidence laundering was not detected.",
);

// Probe 7: validation/acceptance terms cannot enter claim epistemology.
const badEpistemology = call("compose_document_expression", {
  ...completeOperationalInput,
  elements: [{
    element_id: "CLAIM-BAD",
    kind: "CLAIM",
    title: "Bad status",
    statement: "This must fail.",
    epistemic_status: "VALIDATED",
    evidence_refs: [],
    assumption_refs: [],
    counterevidence_refs: [],
  }],
});
assert(badEpistemology.error, "Invalid epistemic status was accepted.");
const acceptedField = call("compose_document_expression", {
  ...completeOperationalInput,
  elements: [{
    element_id: "CLAIM-BAD",
    kind: "CLAIM",
    title: "Bad field",
    statement: "This must fail.",
    epistemic_status: "PROPOSED",
    evidence_refs: [],
    assumption_refs: [],
    counterevidence_refs: [],
    accepted_by: "someone",
  }],
});
assert(acceptedField.error, "Acceptance field entered an Expression.");

// Probe 8: profile overcomposition fails at the construction boundary.
const overcomposed = call("compose_document_expression", {
  ...completeOperationalInput,
  secondary_profile: "normative",
  tertiary_profile: "research",
});
assert(
  overcomposed.error?.message.includes("tertiary_profile"),
  "A third profile was not rejected.",
);
const duplicateProfiles = call("compose_document_expression", {
  ...completeOperationalInput,
  secondary_profile: "operational",
});
assert(duplicateProfiles.error, "Duplicate profiles were accepted.");

// Probe 9: incomplete transitions cannot produce a human-action artifact.
const incompleteActionEnvelope = structured(
  call("compose_document_expression", {
    ...completeOperationalInput,
    elements: completeOperationalInput.elements.map((element) =>
      element.element_id === "TRANS-RUN"
        ? { ...element, owner_ref: undefined }
        : element
    ),
  }),
);
const blockedAction = structured(
  call("render_document_view", {
    envelope: incompleteActionEnvelope,
    view_type: "HUMAN_ACTION",
    format: "MARKDOWN",
  }),
);
assert(
  blockedAction.status === "BLOCKED" &&
  blockedAction.artifact === null,
  "An incomplete transition produced a human-action view.",
);

// Probe 10: renderer output is traced and source text cannot inject raw HTML.
const maliciousInput = {
  ...completeOperationalInput,
  title: "<script>alert(1)</script>",
  elements: completeOperationalInput.elements.map((element) =>
    element.element_id === "ROLE-OPERATOR"
      ? { ...element, statement: "<img src=x onerror=alert(1)>" }
      : element
  ),
};
const maliciousEnvelope = structured(
  call("compose_document_expression", maliciousInput),
);
const rendered = structured(
  call("render_document_view", {
    envelope: maliciousEnvelope,
    view_type: "HUMAN_REVIEW",
    format: "MARKDOWN",
  }),
);
assert(rendered.status === "RENDERED", "Review rendering failed.");
assert(
  !rendered.artifact.text.includes("<script>") &&
  !rendered.artifact.text.includes("<img"),
  "Raw HTML survived renderer escaping.",
);
assert(
  rendered.manifest.projection.included_element_ids.length ===
    maliciousEnvelope.expression.elements.length &&
  maliciousEnvelope.expression.elements.every((element) =>
    rendered.artifact.text.includes(element.element_id)
  ),
  "Rendered propositions lack element-level traceability.",
);
const artifactDigest = crypto
  .createHash("sha256")
  .update(JSON.stringify(rendered.artifact.text))
  .digest("hex");
assert(
  artifactDigest === rendered.manifest.output.content_digest.value,
  "Rendered artifact digest does not match its manifest.",
);

// Profile drift must be visible even when an old envelope is presented.
const profileDrift = structured(
  call("validate_document_expression", {
    envelope: {
      ...firstEnvelope,
      expression: {
        ...firstEnvelope.expression,
        profiles: {
          primary: {
            ...firstEnvelope.expression.profiles.primary,
            version: "0.1.1",
          },
        },
      },
    },
  }),
);
assert(
  profileDrift.checks.some((item) => item.check_id === "PROFILE_REF_MISMATCH"),
  "Profile drift was not detected.",
);

const afterState = treeState(pluginRoot);
assert(
  JSON.stringify(beforeState) === JSON.stringify(afterState),
  "The MCP test changed plugin files; the no-write boundary failed.",
);

process.stdout.write(`${JSON.stringify({
  ok: true,
  tools: toolList.map((tool) => tool.name),
  profiles: profileCatalog.profiles.map((profile) => profile.profile_id),
  probes_passed: 10,
  deterministic_expression_id: firstEnvelope.expression_id,
  valid_lineage: validLineage.lineage_result.status,
  blocked_action_view: blockedAction.status,
  persistence_status: firstEnvelope.persistence_status,
})}\n`);
