import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "document-systems";
const SERVER_VERSION = "0.3.0";
const EXPRESSION_SCHEMA = "document-systems/expression@0.1";
const RECEIPT_SCHEMA = "document-systems/validation-receipt@0.1";
const MANIFEST_SCHEMA = "document-systems/view-manifest@0.1";
const CATALOG_SCHEMA = "document-systems/profile-catalog@0.1";
const PACKET_SCHEMA = "document-systems/release-packet@0.1";
const PACKET_VERIFICATION_SCHEMA =
  "document-systems/release-packet-verification@0.1";
export const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_ELEMENTS = 500;
const MAX_SOURCES = 200;
const MAX_ASSERTIONS = 500;
const PROFILE_IDS = ["normative", "operational", "research", "human-agent"];
const VIEW_TYPES = ["HUMAN_REVIEW", "HUMAN_ACTION", "MACHINE"];
const FORMATS = ["MARKDOWN", "JSON"];
const ELEMENT_KINDS = [
  "AUTHORITY",
  "ROLE",
  "CLAIM",
  "REQUIREMENT",
  "STATE",
  "TRANSITION",
  "EXCEPTION",
  "VERIFICATION",
  "ASSUMPTION",
  "DECISION_GATE",
  "HANDOFF",
  "HUMAN_AGENT_ALLOCATION",
  "EVALUATION_CRITERION",
];
const EPISTEMIC_STATES = [
  "OBSERVED",
  "INFERRED",
  "PROPOSED",
  "CONTRADICTED",
  "NOT_ESTABLISHED",
];
const ASSERTION_OPERATORS = ["EQUALS", "INCLUDES"];
const ASSERTION_FIELDS = new Set([
  "statement",
  "actor_ref",
  "authority_ref",
  "verification_ref",
  "from_state",
  "to_state",
  "owner_ref",
  "exception_route_ref",
  "target_ref",
  "criterion",
  "allocation_party",
  "allocation_type",
]);
const FORBIDDEN_KEYS = new Set([
  "accepted",
  "accepted_by",
  "acceptance",
  "approved",
  "approved_by",
  "effective",
  "operative",
  "superseded",
  "validated",
  "verified",
]);
const ALLOWED_ELEMENT_KEYS = new Set([
  "element_id",
  "kind",
  "title",
  "statement",
  "epistemic_status",
  "source_refs",
  "evidence_refs",
  "assumption_refs",
  "counterevidence_refs",
  "actor_ref",
  "authority_ref",
  "verification_ref",
  "from_state",
  "to_state",
  "owner_ref",
  "gate_evidence_refs",
  "exception_route_ref",
  "target_ref",
  "criterion",
  "allocation_party",
  "allocation_type",
]);
const TOOL_NAMES = {
  listProfiles: "list_document_profiles",
  composeExpression: "compose_document_expression",
  validateExpression: "validate_document_expression",
  renderView: "render_document_view",
  compilePacket: "compile_document_packet",
  verifyPacket: "verify_document_packet",
};

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawCatalog = JSON.parse(
  fs.readFileSync(path.join(currentDirectory, "profiles.json"), "utf8"),
);

function assertUnicode(value, pathValue = "$") {
  if (typeof value === "string") {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          throw new Error(`${pathValue} contains an unpaired high surrogate.`);
        }
        index += 1;
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        throw new Error(`${pathValue} contains an unpaired low surrogate.`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertUnicode(item, `${pathValue}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertUnicode(key, `${pathValue} key`);
      assertUnicode(item, `${pathValue}.${key}`);
    }
  }
}

// RFC 8785 JCS: ECMAScript primitive serialization with recursively sorted
// object properties. Unsupported JSON values and malformed Unicode fail.
function canonicalize(value) {
  assertUnicode(value);
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("RFC8785 does not permit non-finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) =>
      `${JSON.stringify(key)}:${canonicalize(value[key])}`
    ).join(",")}}`;
  }
  throw new Error(`RFC8785 cannot canonicalize ${typeof value}.`);
}

function digest(value) {
  return {
    algorithm: "sha-256",
    canonicalization: "RFC8785",
    value: crypto.createHash("sha256").update(canonicalize(value)).digest("hex"),
  };
}

function verifyCanonicalizer() {
  const rfc8785Sample = {
    numbers: [
      333333333.33333329,
      1e30,
      4.50,
      2e-3,
      0.000000000000000000000000001,
    ],
    string: "€$\u000f\nA'B\"\\\\\"/",
    literals: [null, true, false],
  };
  const expected =
    `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA'B\\"\\\\\\\\\\"/"}`;
  if (canonicalize(rfc8785Sample) !== expected) {
    throw new Error("RFC8785 fixed-vector self-test failed.");
  }
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, "\udead"]) {
    let rejected = false;
    try {
      canonicalize(invalid);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("RFC8785 invalid-input self-test failed.");
    }
  }
}

verifyCanonicalizer();

const profiles = rawCatalog.profiles.map((profile) => ({
  ...profile,
  profile_digest: digest(profile),
}));
const profilesById = new Map(
  profiles.map((profile) => [profile.profile_id, profile]),
);
const rulesetDigest = digest({
  server_version: SERVER_VERSION,
  profile_catalog: rawCatalog,
  rules: "document-systems-rules@0.1",
});
const rendererDigest = digest({
  server_version: SERVER_VERSION,
  renderer: "document-systems-renderer@0.1",
  view_types: VIEW_TYPES,
  formats: FORMATS,
});

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value;
}

function requireString(value, name, maxLength = 4000) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new Error(`${name} exceeds ${maxLength} characters.`);
  }
  assertUnicode(result, name);
  return result;
}

function normalizeStringArray(value, name, maxItems = 50) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${name} must be an array with at most ${maxItems} items.`);
  }
  return value.map((item, index) =>
    requireString(item, `${name}[${index}]`, 500)
  );
}

function profileRef(profileId) {
  const profile = profilesById.get(profileId);
  if (!profile) {
    throw new Error(`Unknown profile: ${profileId}`);
  }
  return {
    profile_id: profile.profile_id,
    version: profile.version,
    profile_digest: profile.profile_digest,
  };
}

function selectProfiles(primaryId, secondaryId) {
  if (!PROFILE_IDS.includes(primaryId)) {
    throw new Error(`primary_profile must be one of: ${PROFILE_IDS.join(", ")}.`);
  }
  if (secondaryId !== undefined && !PROFILE_IDS.includes(secondaryId)) {
    throw new Error(`secondary_profile must be one of: ${PROFILE_IDS.join(", ")}.`);
  }
  if (secondaryId === primaryId) {
    throw new Error("Primary and secondary profiles must be different.");
  }
  return {
    primary: profileRef(primaryId),
    ...(secondaryId === undefined ? {} : { secondary: profileRef(secondaryId) }),
  };
}

function normalizeDigest(value, name) {
  const input = requireObject(value, name);
  if (
    input.algorithm !== "sha-256" ||
    input.canonicalization !== "RFC8785" ||
    typeof input.value !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.value)
  ) {
    throw new Error(`${name} must be an RFC8785 sha-256 digest.`);
  }
  return {
    algorithm: "sha-256",
    canonicalization: "RFC8785",
    value: input.value,
  };
}

function normalizeParent(value, name) {
  const input = requireObject(value, name);
  if (!["DERIVED_FROM", "REVISES", "TRANSLATES"].includes(input.relation)) {
    throw new Error(`${name}.relation is not supported in v0.1.`);
  }
  const expressionId = requireString(input.expression_id, `${name}.expression_id`, 100);
  if (!/^expr:sha256:[a-f0-9]{64}$/.test(expressionId)) {
    throw new Error(`${name}.expression_id has invalid syntax.`);
  }
  return {
    relation: input.relation,
    work_id: normalizeWorkId(input.work_id, `${name}.work_id`),
    expression_id: expressionId,
    expression_digest: normalizeDigest(
      input.expression_digest,
      `${name}.expression_digest`,
    ),
  };
}

function normalizeWorkId(value, name = "work_id") {
  const result = requireString(value, name, 200);
  if (!/^work:[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9.-]*$/.test(result)) {
    throw new Error(
      `${name} must use work:<namespace>:<stable-name> lowercase syntax.`,
    );
  }
  return result;
}

function normalizeSource(value, index) {
  const name = `source_refs[${index}]`;
  const input = requireObject(value, name);
  const sourceId = requireString(input.source_id, `${name}.source_id`, 100);
  if (!/^SRC-[A-Z0-9][A-Z0-9_-]*$/.test(sourceId)) {
    throw new Error(`${name}.source_id must use SRC-* syntax.`);
  }
  const kinds = [
    "RESEARCH_PACKET",
    "PRIMARY_SOURCE",
    "PROVIDED_RECORD",
    "OBSERVATION",
    "MEASUREMENT",
    "TEST_RESULT",
  ];
  if (!kinds.includes(input.source_kind)) {
    throw new Error(`${name}.source_kind is invalid.`);
  }
  const locator = requireObject(input.locator, `${name}.locator`);
  const availability = input.availability;
  if (!["REFERENCE_ONLY", "EXCERPT_SUPPLIED", "CONTENT_SUPPLIED"].includes(availability)) {
    throw new Error(`${name}.availability is invalid.`);
  }
  const review = requireObject(input.review_assertion, `${name}.review_assertion`);
  if (!["NOT_ASSERTED", "REVIEWED_BY_CALLER"].includes(review.status)) {
    throw new Error(`${name}.review_assertion.status is invalid.`);
  }
  const normalized = {
    source_id: sourceId,
    source_kind: input.source_kind,
    locator: {
      uri: requireString(locator.uri, `${name}.locator.uri`, 2000),
      ...(locator.selector === undefined
        ? {}
        : { selector: requireString(locator.selector, `${name}.locator.selector`, 500) }),
      ...(locator.label === undefined
        ? {}
        : { label: requireString(locator.label, `${name}.locator.label`, 300) }),
    },
    availability,
    ...(input.integrity === undefined
      ? {}
      : {
        integrity: {
          digest: normalizeDigest(
            requireObject(input.integrity, `${name}.integrity`).digest,
            `${name}.integrity.digest`,
          ),
          digest_origin: (() => {
            const origin = input.integrity.digest_origin;
            if (![
              "CALLER_SUPPLIED",
              "SERVER_COMPUTED_FROM_SUPPLIED_CONTENT",
            ].includes(origin)) {
              throw new Error(`${name}.integrity.digest_origin is invalid.`);
            }
            return origin;
          })(),
        },
      }),
    review_assertion: {
      status: review.status,
      ...(review.asserted_by === undefined
        ? {}
        : { asserted_by: requireString(review.asserted_by, `${name}.review_assertion.asserted_by`, 200) }),
    },
  };
  if (review.status === "REVIEWED_BY_CALLER" && !normalized.review_assertion.asserted_by) {
    throw new Error(`${name}.review_assertion.asserted_by is required.`);
  }
  return normalized;
}

function normalizeElement(value, index) {
  const name = `elements[${index}]`;
  const input = requireObject(value, name);
  for (const key of Object.keys(input)) {
    if (!ALLOWED_ELEMENT_KEYS.has(key)) {
      throw new Error(`${name}.${key} is not an allowed semantic field.`);
    }
  }
  const elementId = requireString(input.element_id, `${name}.element_id`, 100);
  if (!/^[A-Z][A-Z0-9_-]*$/.test(elementId)) {
    throw new Error(`${name}.element_id must be an uppercase typed identifier.`);
  }
  if (!ELEMENT_KINDS.includes(input.kind)) {
    throw new Error(`${name}.kind is invalid.`);
  }
  const normalized = {
    element_id: elementId,
    kind: input.kind,
    title: requireString(input.title, `${name}.title`, 300),
    statement: requireString(input.statement, `${name}.statement`, 4000),
  };
  const stringFields = [
    "actor_ref",
    "authority_ref",
    "verification_ref",
    "from_state",
    "to_state",
    "owner_ref",
    "exception_route_ref",
    "target_ref",
    "criterion",
  ];
  const arrayFields = [
    "source_refs",
    "evidence_refs",
    "assumption_refs",
    "counterevidence_refs",
    "gate_evidence_refs",
  ];
  for (const field of stringFields) {
    if (input[field] !== undefined) {
      normalized[field] = requireString(input[field], `${name}.${field}`, 500);
    }
  }
  for (const field of arrayFields) {
    if (input[field] !== undefined) {
      normalized[field] = normalizeStringArray(input[field], `${name}.${field}`, 100);
    }
  }
  if (input.epistemic_status !== undefined) {
    if (!EPISTEMIC_STATES.includes(input.epistemic_status)) {
      throw new Error(`${name}.epistemic_status is invalid.`);
    }
    normalized.epistemic_status = input.epistemic_status;
  }
  if (input.allocation_party !== undefined) {
    if (!["HUMAN", "AGENT", "JOINT"].includes(input.allocation_party)) {
      throw new Error(`${name}.allocation_party is invalid.`);
    }
    normalized.allocation_party = input.allocation_party;
  }
  if (input.allocation_type !== undefined) {
    const types = [
      "GOAL",
      "COURSE",
      "FORMULATION",
      "REVISION",
      "EXECUTION",
      "AUTHORITY",
      "EVALUATION",
    ];
    if (!types.includes(input.allocation_type)) {
      throw new Error(`${name}.allocation_type is invalid.`);
    }
    normalized.allocation_type = input.allocation_type;
  }
  return normalized;
}

function normalizeSemanticAssertion(value, index) {
  const name = `semantic_assertions[${index}]`;
  const input = requireObject(value, name);
  const allowedKeys = new Set([
    "assertion_id",
    "element_ref",
    "field",
    "operator",
    "expected",
    "source_refs",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${name}.${key} is not an allowed assertion field.`);
    }
  }
  const assertionId = requireString(
    input.assertion_id,
    `${name}.assertion_id`,
    100,
  );
  if (!/^ASSERT-[A-Z0-9][A-Z0-9_-]*$/.test(assertionId)) {
    throw new Error(`${name}.assertion_id must use ASSERT-* syntax.`);
  }
  const field = requireString(input.field, `${name}.field`, 80);
  if (!ASSERTION_FIELDS.has(field)) {
    throw new Error(`${name}.field is not assertable.`);
  }
  if (!ASSERTION_OPERATORS.includes(input.operator)) {
    throw new Error(
      `${name}.operator must be one of: ${ASSERTION_OPERATORS.join(", ")}.`,
    );
  }
  const sourceRefs = normalizeStringArray(
    input.source_refs,
    `${name}.source_refs`,
    20,
  );
  if (sourceRefs.length === 0) {
    throw new Error(`${name}.source_refs must identify supplied evidence.`);
  }
  return {
    assertion_id: assertionId,
    element_ref: requireString(input.element_ref, `${name}.element_ref`, 100),
    field,
    operator: input.operator,
    expected: requireString(input.expected, `${name}.expected`, 4000),
    source_refs: sourceRefs,
  };
}

function normalizeInputs(args) {
  const input = requireObject(args, "arguments");
  const allowedInputKeys = new Set([
    "work_id",
    "title",
    "purpose",
    "primary_profile",
    "secondary_profile",
    "scope",
    "non_goals",
    "source_refs",
    "elements",
    "semantic_assertions",
    "parents",
    "generated_by",
    "generation_method",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedInputKeys.has(key)) {
      throw new Error(`${key} is not an allowed composition input.`);
    }
  }
  if (JSON.stringify(input).length > MAX_PAYLOAD_BYTES) {
    throw new Error(`Input exceeds ${MAX_PAYLOAD_BYTES} bytes.`);
  }
  if (!Array.isArray(input.source_refs) || input.source_refs.length > MAX_SOURCES) {
    throw new Error(`source_refs must contain at most ${MAX_SOURCES} items.`);
  }
  if (!Array.isArray(input.elements) || input.elements.length > MAX_ELEMENTS) {
    throw new Error(`elements must contain at most ${MAX_ELEMENTS} items.`);
  }
  const semanticAssertions = input.semantic_assertions ?? [];
  if (
    !Array.isArray(semanticAssertions) ||
    semanticAssertions.length > MAX_ASSERTIONS
  ) {
    throw new Error(
      `semantic_assertions must contain at most ${MAX_ASSERTIONS} items.`,
    );
  }
  const parents = input.parents === undefined ? [] : input.parents;
  if (!Array.isArray(parents) || parents.length > 8) {
    throw new Error("parents must contain at most 8 items.");
  }
  const generatedBy = input.generated_by === undefined
    ? { kind: "CODEX_SKILL", id: "compose-document-system", version: "0.1.0" }
    : requireObject(input.generated_by, "generated_by");
  if (!["CODEX_SKILL", "CALLER"].includes(generatedBy.kind)) {
    throw new Error("generated_by.kind must be CODEX_SKILL or CALLER.");
  }
  const generationMethod = input.generation_method ?? "SYNTHESIS";
  if (!["SYNTHESIS", "TRANSFORMATION", "REVISION"].includes(generationMethod)) {
    throw new Error("generation_method is invalid.");
  }
  const normalizedParents = parents.map(normalizeParent);
  const expression = {
    schema: EXPRESSION_SCHEMA,
    work_id: normalizeWorkId(input.work_id),
    title: requireString(input.title, "title", 300),
    proposal_state: "PROPOSED",
    profiles: selectProfiles(input.primary_profile, input.secondary_profile),
    purpose: {
      statement: requireString(input.purpose, "purpose", 2000),
      scope: normalizeStringArray(input.scope, "scope"),
      non_goals: normalizeStringArray(input.non_goals, "non_goals"),
    },
    source_refs: input.source_refs.map(normalizeSource),
    elements: input.elements.map(normalizeElement),
    ...(semanticAssertions.length === 0
      ? {}
      : {
        semantic_assertions: semanticAssertions.map(normalizeSemanticAssertion),
      }),
    lineage: { parents: normalizedParents },
    provenance: {
      generated_by: {
        kind: generatedBy.kind,
        id: requireString(generatedBy.id, "generated_by.id", 200),
        ...(generatedBy.version === undefined
          ? {}
          : { version: requireString(generatedBy.version, "generated_by.version", 80) }),
      },
      generation_method: generationMethod,
      input_expression_refs: normalizedParents,
    },
  };
  return expression;
}

function envelopeExpression(expression) {
  const integrity = digest(expression);
  return {
    expression_id: `expr:sha256:${integrity.value}`,
    expression,
    integrity,
    persistence_status: "NOT_PERSISTED",
  };
}

function check(status, severity, checkId, message, options = {}) {
  return {
    check_id: checkId,
    status,
    severity,
    ...(options.path ? { path: options.path } : {}),
    element_refs: options.element_refs ?? [],
    source_refs: options.source_refs ?? [],
    message,
  };
}

function validateProfileRef(ref, role, checks) {
  const expected = profilesById.get(ref?.profile_id);
  if (
    !expected ||
    ref.version !== expected.version ||
    ref.profile_digest?.value !== expected.profile_digest.value ||
    ref.profile_digest?.algorithm !== "sha-256" ||
    ref.profile_digest?.canonicalization !== "RFC8785"
  ) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "PROFILE_REF_MISMATCH",
      `${role} profile is unknown or its version/digest differs from the compiled registry.`,
      { path: `$.expression.profiles.${role}` },
    ));
    return null;
  }
  return expected;
}

function inspectForbiddenKeys(value, pathValue, checks) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectForbiddenKeys(item, `${pathValue}[${index}]`, checks)
    );
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      checks.push(check(
        "FAIL",
        "ERROR",
        "STATUS_SEPARATION",
        `${key} is an acceptance, validation, or operative-state field and is forbidden in an Expression.`,
        { path: `${pathValue}.${key}` },
      ));
    }
    inspectForbiddenKeys(item, `${pathValue}.${key}`, checks);
  }
}

function validateLineage(expression, suppliedEnvelopes, checks) {
  const declared = expression.lineage?.parents ?? [];
  if (declared.length === 0) {
    return {
      status: "NONE_DECLARED",
      declared_parent_count: 0,
      supplied_parent_count: suppliedEnvelopes.length,
    };
  }
  if (suppliedEnvelopes.length === 0) {
    return {
      status: "ANCHOR_DECLARED",
      declared_parent_count: declared.length,
      supplied_parent_count: 0,
    };
  }
  const supplied = new Map();
  let invalid = false;
  for (const envelope of suppliedEnvelopes) {
    if (!envelope?.expression || !envelope?.integrity || !envelope?.expression_id) {
      invalid = true;
      continue;
    }
    const actual = digest(envelope.expression);
    if (
      actual.value !== envelope.integrity.value ||
      envelope.expression_id !== `expr:sha256:${actual.value}`
    ) {
      invalid = true;
    }
    supplied.set(envelope.expression_id, { envelope, actual });
  }
  let incomplete = false;
  const queue = [...declared];
  const seen = new Set();
  while (queue.length > 0) {
    const parentRef = queue.shift();
    if (seen.has(parentRef.expression_id)) {
      continue;
    }
    seen.add(parentRef.expression_id);
    const suppliedParent = supplied.get(parentRef.expression_id);
    if (!suppliedParent) {
      incomplete = true;
      continue;
    }
    if (
      suppliedParent.actual.value !== parentRef.expression_digest.value ||
      suppliedParent.envelope.expression.work_id !== parentRef.work_id
    ) {
      invalid = true;
      continue;
    }
    queue.push(...(suppliedParent.envelope.expression.lineage?.parents ?? []));
  }
  if (invalid) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "SUPPLIED_LINEAGE_INVALID",
      "A supplied parent digest, identity, or Work link does not match its declared anchor.",
      { path: "$.expression.lineage.parents" },
    ));
    return {
      status: "SUPPLIED_CHAIN_INVALID",
      declared_parent_count: declared.length,
      supplied_parent_count: suppliedEnvelopes.length,
    };
  }
  return {
    status: incomplete ? "SUPPLIED_CHAIN_INCOMPLETE" : "SUPPLIED_CHAIN_VALID",
    declared_parent_count: declared.length,
    supplied_parent_count: suppliedEnvelopes.length,
  };
}

function validateEnvelope(envelopeInput, suppliedEnvelopes = []) {
  const checks = [];
  const envelope = envelopeInput && typeof envelopeInput === "object"
    ? envelopeInput
    : {};
  const expression = envelope.expression && typeof envelope.expression === "object"
    ? envelope.expression
    : {};
  let actualDigest = null;
  try {
    actualDigest = digest(expression);
  } catch (error) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "CANONICALIZATION_FAILED",
      error.message,
      { path: "$.expression" },
    ));
  }
  if (
    !actualDigest ||
    envelope.integrity?.value !== actualDigest.value ||
    envelope.integrity?.algorithm !== "sha-256" ||
    envelope.integrity?.canonicalization !== "RFC8785" ||
    envelope.expression_id !== `expr:sha256:${actualDigest?.value ?? ""}`
  ) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "INTEGRITY_MISMATCH",
      "Expression content, digest, and content-derived identity do not agree.",
      { path: "$.integrity" },
    ));
  }
  if (expression.schema !== EXPRESSION_SCHEMA) {
    checks.push(check("FAIL", "ERROR", "SCHEMA", `schema must equal ${EXPRESSION_SCHEMA}.`, {
      path: "$.expression.schema",
    }));
  }
  if (expression.proposal_state !== "PROPOSED") {
    checks.push(check(
      "FAIL",
      "ERROR",
      "LIFECYCLE_CONTAMINATION",
      "The only v0.1 Expression lifecycle value is PROPOSED.",
      { path: "$.expression.proposal_state" },
    ));
  }
  if (!/^work:[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9.-]*$/.test(expression.work_id ?? "")) {
    checks.push(check("FAIL", "ERROR", "WORK_ID", "work_id syntax is invalid.", {
      path: "$.expression.work_id",
    }));
  }
  inspectForbiddenKeys(expression, "$.expression", checks);
  const selectedProfiles = [];
  const primary = validateProfileRef(expression.profiles?.primary, "primary", checks);
  if (primary) {
    selectedProfiles.push(primary);
  }
  if (expression.profiles?.secondary) {
    const secondary = validateProfileRef(
      expression.profiles.secondary,
      "secondary",
      checks,
    );
    if (secondary) {
      selectedProfiles.push(secondary);
    }
    if (
      expression.profiles.secondary.profile_id ===
      expression.profiles.primary?.profile_id
    ) {
      checks.push(check(
        "FAIL",
        "ERROR",
        "PROFILE_COMPOSITION_LIMIT",
        "Primary and secondary profiles must be different.",
        { path: "$.expression.profiles" },
      ));
    }
  }
  if (Object.keys(expression.profiles ?? {}).some(
    (key) => !["primary", "secondary"].includes(key),
  )) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "PROFILE_COMPOSITION_LIMIT",
      "v0.1 permits exactly one primary and at most one secondary profile.",
      { path: "$.expression.profiles" },
    ));
  }

  const sources = Array.isArray(expression.source_refs) ? expression.source_refs : [];
  const elements = Array.isArray(expression.elements) ? expression.elements : [];
  const assertions = expression.semantic_assertions === undefined
    ? []
    : expression.semantic_assertions;
  const boundedAssertions = Array.isArray(assertions) ? assertions : [];
  if (!Array.isArray(expression.source_refs) || sources.length > MAX_SOURCES) {
    checks.push(check("FAIL", "ERROR", "SOURCE_COLLECTION", "source_refs is invalid.", {
      path: "$.expression.source_refs",
    }));
  }
  if (!Array.isArray(expression.elements) || elements.length > MAX_ELEMENTS) {
    checks.push(check("FAIL", "ERROR", "ELEMENT_COLLECTION", "elements is invalid.", {
      path: "$.expression.elements",
    }));
  }
  if (!Array.isArray(assertions) || assertions.length > MAX_ASSERTIONS) {
    checks.push(check(
      "FAIL",
      "ERROR",
      "SEMANTIC_ASSERTION_COLLECTION",
      "semantic_assertions is invalid.",
      { path: "$.expression.semantic_assertions" },
    ));
  }
  const sourceById = new Map();
  sources.forEach((source, index) => {
    if (!source?.source_id || sourceById.has(source.source_id)) {
      checks.push(check(
        "FAIL",
        "ERROR",
        "SOURCE_ID",
        "Source IDs must be present and unique.",
        { path: `$.expression.source_refs[${index}].source_id` },
      ));
    } else {
      sourceById.set(source.source_id, source);
    }
  });
  const elementById = new Map();
  elements.forEach((element, index) => {
    const pathValue = `$.expression.elements[${index}]`;
    for (const key of Object.keys(element ?? {})) {
      if (!ALLOWED_ELEMENT_KEYS.has(key)) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "ELEMENT_FIELD",
          `${key} is not an allowed semantic field.`,
          { path: `${pathValue}.${key}`, element_refs: [element.element_id].filter(Boolean) },
        ));
      }
    }
    if (!element?.element_id || elementById.has(element.element_id)) {
      checks.push(check("FAIL", "ERROR", "ELEMENT_ID", "Element IDs must be present and unique.", {
        path: `${pathValue}.element_id`,
      }));
      return;
    }
    elementById.set(element.element_id, element);
    if (!ELEMENT_KINDS.includes(element.kind)) {
      checks.push(check("FAIL", "ERROR", "ELEMENT_KIND", "Element kind is invalid.", {
        path: `${pathValue}.kind`,
        element_refs: [element.element_id],
      }));
    }
    if (element.kind === "CLAIM") {
      if (!EPISTEMIC_STATES.includes(element.epistemic_status)) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "CLAIM_EPISTEMIC_STATUS",
          "Claim elements require a valid epistemic_status.",
          { path: `${pathValue}.epistemic_status`, element_refs: [element.element_id] },
        ));
      }
      for (const field of [
        "evidence_refs",
        "assumption_refs",
        "counterevidence_refs",
      ]) {
        if (!Array.isArray(element[field])) {
          checks.push(check(
            "FAIL",
            "ERROR",
            "CLAIM_EVIDENCE_SHAPE",
            `Claim elements require ${field} as an array.`,
            { path: `${pathValue}.${field}`, element_refs: [element.element_id] },
          ));
        }
      }
      const evidenceRefs = [...(element.source_refs ?? []), ...(element.evidence_refs ?? [])];
      if (element.epistemic_status === "OBSERVED") {
        const supported = evidenceRefs.some((id) => {
          const source = sourceById.get(id);
          return source &&
            source.availability !== "REFERENCE_ONLY" &&
            source.review_assertion?.status === "REVIEWED_BY_CALLER";
        });
        if (!supported) {
          checks.push(check(
            "FAIL",
            "ERROR",
            "OBSERVED_CLAIM_LACKS_REVIEWED_SUPPORT",
            "An OBSERVED claim needs a non-reference-only SourceRef asserted reviewed by the caller.",
            {
              path: pathValue,
              element_refs: [element.element_id],
              source_refs: evidenceRefs,
            },
          ));
        }
      }
    } else if (element.epistemic_status !== undefined) {
      checks.push(check(
        "FAIL",
        "ERROR",
        "STATUS_SEPARATION",
        "Only CLAIM elements may carry epistemic_status.",
        { path: `${pathValue}.epistemic_status`, element_refs: [element.element_id] },
      ));
    }
  });

  elements.forEach((element, index) => {
    const pathValue = `$.expression.elements[${index}]`;
    for (const sourceRef of element.source_refs ?? []) {
      if (!sourceById.has(sourceRef)) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "REFERENCE_INTEGRITY",
          `${sourceRef} does not identify a supplied SourceRef.`,
          { path: `${pathValue}.source_refs`, element_refs: [element.element_id], source_refs: [sourceRef] },
        ));
      }
    }
    for (const mixedRef of [
      ...(element.evidence_refs ?? []),
      ...(element.gate_evidence_refs ?? []),
    ]) {
      if (!sourceById.has(mixedRef) && !elementById.has(mixedRef)) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "REFERENCE_INTEGRITY",
          `${mixedRef} does not identify a supplied SourceRef or element.`,
          { path: pathValue, element_refs: [element.element_id], source_refs: [mixedRef] },
        ));
      }
    }
    for (const field of [
      "actor_ref",
      "authority_ref",
      "verification_ref",
      "from_state",
      "to_state",
      "owner_ref",
      "exception_route_ref",
      "target_ref",
    ]) {
      if (element[field] && !elementById.has(element[field])) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "REFERENCE_INTEGRITY",
          `${element[field]} does not identify a supplied element.`,
          { path: `${pathValue}.${field}`, element_refs: [element.element_id, element[field]] },
        ));
      }
    }
    if (element.kind === "REQUIREMENT") {
      for (const field of ["actor_ref", "authority_ref", "verification_ref"]) {
        if (!element[field]) {
          checks.push(check(
            "WARNING",
            "WARNING",
            "NORMATIVE_REQUIREMENT_INCOMPLETE",
            `Requirement lacks ${field}.`,
            { path: `${pathValue}.${field}`, element_refs: [element.element_id] },
          ));
        }
      }
    }
    if (element.kind === "TRANSITION") {
      const missing = [];
      for (const field of [
        "from_state",
        "to_state",
        "owner_ref",
        "exception_route_ref",
      ]) {
        if (!element[field]) {
          missing.push(field);
        }
      }
      if (!Array.isArray(element.gate_evidence_refs) || element.gate_evidence_refs.length === 0) {
        missing.push("gate_evidence_refs");
      }
      if (missing.length > 0) {
        checks.push(check(
          "WARNING",
          "WARNING",
          "TRANSITION_NOT_ACTION_READY",
          `Transition lacks ${missing.join(", ")}.`,
          { path: pathValue, element_refs: [element.element_id] },
        ));
      }
      if (
        element.from_state &&
        element.to_state &&
        element.from_state === element.to_state
      ) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "TRANSITION_SELF_LOOP",
          "A transition must change state unless an explicit future profile permits a self-loop.",
          { path: pathValue, element_refs: [element.element_id] },
        ));
      }
    }
    if (element.kind === "HUMAN_AGENT_ALLOCATION") {
      const missing = [
        "owner_ref",
        "allocation_party",
        "allocation_type",
      ].filter((field) => !element[field]);
      if (missing.length > 0) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "ALLOCATION_INCOMPLETE",
          `Human-agent allocation lacks ${missing.join(", ")}.`,
          { path: pathValue, element_refs: [element.element_id] },
        ));
      }
    }
    if (element.kind === "EVALUATION_CRITERION") {
      const missing = ["owner_ref", "criterion"].filter(
        (field) => !element[field],
      );
      if (missing.length > 0) {
        checks.push(check(
          "FAIL",
          "ERROR",
          "EVALUATION_CRITERION_INCOMPLETE",
          `Evaluation criterion lacks ${missing.join(", ")}.`,
          { path: pathValue, element_refs: [element.element_id] },
        ));
      }
    }
  });

  let assertionPassed = 0;
  let assertionFailed = 0;
  const assertionIds = new Set();
  for (const [index, assertion] of boundedAssertions.entries()) {
    const pathValue = `$.expression.semantic_assertions[${index}]`;
    if (
      !assertion?.assertion_id ||
      assertionIds.has(assertion.assertion_id)
    ) {
      assertionFailed += 1;
      checks.push(check(
        "FAIL",
        "ERROR",
        "SEMANTIC_ASSERTION_ID",
        "Semantic assertion IDs must be present and unique.",
        { path: `${pathValue}.assertion_id` },
      ));
      continue;
    }
    assertionIds.add(assertion.assertion_id);
    const element = elementById.get(assertion.element_ref);
    if (!element || !ASSERTION_FIELDS.has(assertion.field)) {
      assertionFailed += 1;
      checks.push(check(
        "FAIL",
        "ERROR",
        "SEMANTIC_ASSERTION_TARGET",
        "Semantic assertion target or field is not present.",
        {
          path: pathValue,
          element_refs: [assertion.element_ref].filter(Boolean),
        },
      ));
      continue;
    }
    const assertionSources = Array.isArray(assertion.source_refs)
      ? assertion.source_refs
      : [];
    const unavailableSources = assertionSources.filter((sourceRef) => {
      const source = sourceById.get(sourceRef);
      return !source ||
        source.availability === "REFERENCE_ONLY" ||
        source.review_assertion?.status !== "REVIEWED_BY_CALLER";
    });
    if (
      assertionSources.length === 0 ||
      unavailableSources.length > 0
    ) {
      assertionFailed += 1;
      checks.push(check(
        "FAIL",
        "ERROR",
        "SEMANTIC_ASSERTION_SOURCE_UNAVAILABLE",
        "Semantic assertions require supplied, caller-reviewed evidence references.",
        {
          path: `${pathValue}.source_refs`,
          element_refs: [assertion.element_ref],
          source_refs: assertionSources,
        },
      ));
      continue;
    }
    const actual = element[assertion.field];
    const matched = assertion.operator === "EQUALS"
      ? actual === assertion.expected
      : assertion.operator === "INCLUDES" &&
        typeof actual === "string" &&
        actual.includes(assertion.expected);
    if (!matched) {
      assertionFailed += 1;
      checks.push(check(
        "FAIL",
        "ERROR",
        "SEMANTIC_ASSERTION_FAILED",
        `${assertion.assertion_id} did not match the supplied ${assertion.operator} invariant.`,
        {
          path: `${pathValue}.expected`,
          element_refs: [assertion.element_ref],
          source_refs: assertionSources,
        },
      ));
    } else {
      assertionPassed += 1;
    }
  }

  const presentKinds = new Set(elements.map((element) => element.kind));
  for (const profile of selectedProfiles) {
    for (const kind of profile.required_element_kinds) {
      if (!presentKinds.has(kind)) {
        checks.push(check(
          "WARNING",
          "WARNING",
          "PROFILE_REQUIRED_ELEMENT_MISSING",
          `${profile.profile_id} readiness requires at least one ${kind} element.`,
          { path: "$.expression.elements" },
        ));
      }
    }
  }

  const lineageResult = validateLineage(expression, suppliedEnvelopes, checks);
  if (
    expression.lineage?.parents?.some((parent) =>
      parent.relation === "REVISES" && parent.work_id !== expression.work_id
    )
  ) {
    checks.push(check(
      "WARNING",
      "WARNING",
      "WORK_ID_MISMATCH",
      "A REVISES parent uses a different Work ID; logical continuity is not established.",
      { path: "$.expression.lineage.parents" },
    ));
  }

  if (checks.length === 0) {
    checks.push(check(
      "PASS",
      "INFO",
      "STRUCTURAL_CHECKS",
      "The supplied Expression passed the v0.1 structural checks.",
    ));
  }
  const hasFailure = checks.some((item) => item.status === "FAIL");
  const hasWarning = checks.some((item) => item.status === "WARNING");
  const integrityOk = !hasFailure;
  const readinessOk = integrityOk && !hasWarning;
  const semanticOk =
    boundedAssertions.length > 0 && assertionFailed === 0;
  const result = hasFailure ? "FAIL" : hasWarning ? "PARTIAL" : "PASS";
  const content = {
    schema: RECEIPT_SCHEMA,
    subject: {
      expression_id: envelope.expression_id ?? "NOT_ESTABLISHED",
      expression_digest: actualDigest ?? digest({ invalid: true }),
    },
    validator: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      ruleset_digest: rulesetDigest,
      profile_refs: selectedProfiles.map((profile) => profileRef(profile.profile_id)),
    },
    validation_scope: [
      "SCHEMA",
      "INTEGRITY",
      "REFERENCE_INTEGRITY",
      "STATUS_SEPARATION",
      "PROFILE_CONFORMANCE",
      "SOURCE_TRACEABILITY",
      "SUPPLIED_SEMANTIC_ASSERTIONS",
      "SUPPLIED_LINEAGE",
      "VIEW_READINESS",
    ],
    result,
    integrity_ok: integrityOk,
    readiness_ok: readinessOk,
    semantic_ok: semanticOk,
    semantic_assertions: {
      status: boundedAssertions.length === 0
        ? "NOT_SUPPLIED"
        : assertionFailed > 0
          ? "FAIL"
          : "PASS",
      supplied: boundedAssertions.length,
      passed: assertionPassed,
      failed: assertionFailed,
    },
    checks,
    lineage_result: lineageResult,
    establishes: [
      ...(integrityOk ? ["SCHEMA_CONFORMANCE", "DIGEST_INTEGRITY", "REFERENCE_CONSISTENCY"] : []),
      ...(selectedProfiles.length > 0 && integrityOk ? ["PROFILE_CONFORMANCE"] : []),
      ...(lineageResult.status === "SUPPLIED_CHAIN_VALID"
        ? ["SUPPLIED_LINEAGE_CONSISTENCY"]
        : []),
      ...(readinessOk ? ["VIEW_READINESS"] : []),
      ...(semanticOk ? ["SUPPLIED_SEMANTIC_ASSERTION_CONFORMANCE"] : []),
    ],
    not_established: [
      "SOURCE_TRUTH",
      "SOURCE_AUTHORITY",
      "BEHAVIORAL_SUCCESS",
      "INTENDED_USE_FITNESS",
      "HUMAN_ACCEPTANCE",
      "OPERATIVE_STATUS",
      "COMPLETE_LINEAGE",
    ],
    scope_limit:
      "Validates only the supplied Expression, caller-reviewed semantic assertions, and supplied lineage. Assertion conformance does not independently establish that a source is true, authoritative, complete, or current.",
    persistence_status: "NOT_PERSISTED",
  };
  const receiptDigest = digest(content);
  return {
    receipt_id: `val:sha256:${receiptDigest.value}`,
    ...content,
  };
}

function escapeMarkdown(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_[\]{}()#+.!|])/g, "\\$1")
    .replace(/\r?\n/g, " ");
}

function selectedElements(expression, viewType) {
  if (viewType === "HUMAN_ACTION") {
    const actionKinds = new Set([
      "AUTHORITY",
      "ROLE",
      "REQUIREMENT",
      "STATE",
      "TRANSITION",
      "EXCEPTION",
      "DECISION_GATE",
      "HANDOFF",
      "HUMAN_AGENT_ALLOCATION",
    ]);
    return expression.elements.filter((element) => actionKinds.has(element.kind));
  }
  return [...expression.elements];
}

function renderArtifact(expression, elements, viewType, format) {
  if (format === "JSON") {
    return canonicalize({
      work_id: expression.work_id,
      title: expression.title,
      proposal_state: expression.proposal_state,
      view_type: viewType,
      purpose: expression.purpose,
      elements,
    });
  }
  const profileIds = [
    expression.profiles.primary.profile_id,
    ...(expression.profiles.secondary
      ? [expression.profiles.secondary.profile_id]
      : []),
  ];
  const lines = [
    `# ${escapeMarkdown(expression.title)}`,
    "",
    "> PROPOSAL ONLY — NOT OPERATIVE, NOT ACCEPTED, AND NOT PERSISTED.",
    "> Structural validation does not establish source truth, behavioral success, intended-use fitness, or human acceptance.",
    "",
    `**Work:** \`${escapeMarkdown(expression.work_id)}\``,
    "",
    `**Profiles:** ${profileIds.map(escapeMarkdown).join(", ")}`,
    "",
    `**Purpose:** ${escapeMarkdown(expression.purpose.statement)}`,
    "",
    "## Semantic elements",
    "",
  ];
  if (elements.length === 0) {
    lines.push("_No elements are available for this projection._");
  } else {
    for (const element of elements) {
      const status = element.epistemic_status
        ? ` [${escapeMarkdown(element.epistemic_status)}]`
        : "";
      lines.push(
        `- \`${escapeMarkdown(element.element_id)}\` **${escapeMarkdown(element.kind)}${status} — ${escapeMarkdown(element.title)}:** ${escapeMarkdown(element.statement)}`,
      );
    }
  }
  lines.push("", "## Limitations", "");
  lines.push(
    "- Every substantive line above traces to an included element ID.",
    "- Source review remains a caller assertion; this renderer does not verify truth or authority.",
  );
  return lines.join("\n");
}

function renderView(args) {
  const envelope = requireObject(args.envelope, "envelope");
  const viewType = requireString(args.view_type, "view_type", 40);
  const format = args.format ?? "MARKDOWN";
  if (!VIEW_TYPES.includes(viewType)) {
    throw new Error(`view_type must be one of: ${VIEW_TYPES.join(", ")}.`);
  }
  if (!FORMATS.includes(format)) {
    throw new Error(`format must be one of: ${FORMATS.join(", ")}.`);
  }
  const supplied = args.supplied_lineage ?? [];
  if (!Array.isArray(supplied) || supplied.length > 32) {
    throw new Error("supplied_lineage must contain at most 32 envelopes.");
  }
  const receipt = validateEnvelope(envelope, supplied);
  if (!receipt.integrity_ok || (viewType === "HUMAN_ACTION" && !receipt.readiness_ok)) {
    return {
      status: "BLOCKED",
      reason: !receipt.integrity_ok
        ? "Expression integrity failed."
        : "HUMAN_ACTION rendering requires full structural readiness.",
      validation_receipt: receipt,
      manifest: null,
      artifact: null,
      persistence_status: "NOT_PERSISTED",
    };
  }
  const expression = envelope.expression;
  const included = selectedElements(expression, viewType);
  const includedIds = new Set(included.map((element) => element.element_id));
  const artifactText = renderArtifact(expression, included, viewType, format);
  const contentDigest = digest(artifactText);
  const manifestContent = {
    schema: MANIFEST_SCHEMA,
    subject: {
      expression_id: envelope.expression_id,
      expression_digest: envelope.integrity,
    },
    renderer: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      renderer_digest: rendererDigest,
      profile_refs: [
        expression.profiles.primary,
        ...(expression.profiles.secondary ? [expression.profiles.secondary] : []),
      ],
    },
    request: {
      view_type: viewType,
      format,
      ...(args.audience === undefined
        ? {}
        : { audience: requireString(args.audience, "audience", 300) }),
    },
    output: {
      media_type: format === "JSON" ? "application/json" : "text/markdown",
      content_digest: contentDigest,
    },
    projection: {
      included_element_ids: [...includedIds],
      omitted_elements: expression.elements
        .filter((element) => !includedIds.has(element.element_id))
        .map((element) => ({
          element_id: element.element_id,
          reason: "NOT_RELEVANT_TO_VIEW",
        })),
      generated_static_content: [
        "TITLE",
        "SECTION_LABELS",
        "PROPOSAL_BANNER",
        "LIMITATION_NOTICE",
      ],
    },
    validation_context: {
      receipt_id: receipt.receipt_id,
      expression_digest: envelope.integrity,
    },
    governance: {
      proposal_scope: "PROPOSAL_ONLY",
      authority_status: "NOT_RECORDED",
      behavioral_status: "NOT_ESTABLISHED",
      acceptance_status: "NOT_RECORDED",
      operative_status: "NOT_ESTABLISHED",
    },
    persistence_status: "NOT_PERSISTED",
  };
  const viewDigest = digest({
    manifest: manifestContent,
    output_digest: contentDigest,
  });
  return {
    status: "RENDERED",
    validation_receipt: receipt,
    manifest: {
      view_id: `view:sha256:${viewDigest.value}`,
      ...manifestContent,
    },
    artifact: {
      media_type: manifestContent.output.media_type,
      text: artifactText,
    },
    persistence_status: "NOT_PERSISTED",
  };
}

function releaseGate(receipt, rendered) {
  const reasons = [];
  if (!receipt.integrity_ok) {
    reasons.push("INTEGRITY_FAILED");
  }
  if (!receipt.readiness_ok) {
    reasons.push("STRUCTURAL_READINESS_FAILED");
  }
  if (!receipt.semantic_ok) {
    reasons.push(
      receipt.semantic_assertions.status === "NOT_SUPPLIED"
        ? "SEMANTIC_ASSERTIONS_NOT_SUPPLIED"
        : "SEMANTIC_ASSERTIONS_FAILED",
    );
  }
  if (rendered.status !== "RENDERED") {
    reasons.push("VIEW_BLOCKED");
  }
  return {
    status: reasons.length === 0 ? "READY_FOR_HUMAN_DECISION" : "BLOCKED",
    reasons,
    establishes: reasons.length === 0
      ? [
        "STRUCTURAL_READINESS",
        "SUPPLIED_SEMANTIC_ASSERTION_CONFORMANCE",
        "TRACEABLE_VIEW",
      ]
      : [],
    not_established: [
      "SOURCE_TRUTH",
      "SOURCE_AUTHORITY",
      "BEHAVIORAL_SUCCESS",
      "HUMAN_ACCEPTANCE",
      "OPERATIVE_STATUS",
    ],
  };
}

function compilePacket(args) {
  const input = requireObject(args, "arguments");
  const responseMode = input.response_mode ?? "SUMMARY";
  if (!["SUMMARY", "FULL"].includes(responseMode)) {
    throw new Error("response_mode must be SUMMARY or FULL.");
  }
  const viewType = input.view_type ?? "HUMAN_ACTION";
  const format = input.format ?? "MARKDOWN";
  const includeArtifact = input.include_artifact ?? false;
  if (typeof includeArtifact !== "boolean") {
    throw new Error("include_artifact must be a boolean.");
  }
  const suppliedLineage = input.supplied_lineage ?? [];
  if (!Array.isArray(suppliedLineage) || suppliedLineage.length > 32) {
    throw new Error("supplied_lineage must contain at most 32 envelopes.");
  }
  const compositionInput = { ...input };
  for (const key of [
    "response_mode",
    "view_type",
    "format",
    "audience",
    "include_artifact",
    "supplied_lineage",
  ]) {
    delete compositionInput[key];
  }
  const envelope = composeExpression(compositionInput);
  const receipt = validateEnvelope(envelope, suppliedLineage);
  const rendered = renderView({
    envelope,
    view_type: viewType,
    format,
    ...(input.audience === undefined ? {} : { audience: input.audience }),
    supplied_lineage: suppliedLineage,
  });
  const gate = releaseGate(receipt, rendered);
  const unsignedPacket = {
    schema: PACKET_SCHEMA,
    packet_version: "0.1",
    expression_envelope: envelope,
    validation_receipt: receipt,
    view: {
      request: {
        view_type: viewType,
        format,
        ...(input.audience === undefined
          ? {}
          : { audience: requireString(input.audience, "audience", 300) }),
      },
      status: rendered.status,
      ...(rendered.reason === undefined ? {} : { reason: rendered.reason }),
      manifest: rendered.manifest,
      artifact: rendered.artifact,
    },
    release_gate: gate,
    storage_contract: {
      addressing: "CONTENT_ADDRESSED",
      server_storage: "NONE",
      caller_may_persist: true,
      verification_tool: TOOL_NAMES.verifyPacket,
    },
    persistence_status: "NOT_PERSISTED",
  };
  const packetDigest = digest(unsignedPacket);
  const packet = {
    packet_id: `packet:sha256:${packetDigest.value}`,
    ...unsignedPacket,
  };
  if (responseMode === "FULL") {
    return packet;
  }
  return {
    schema: PACKET_SCHEMA,
    packet_id: packet.packet_id,
    packet_version: packet.packet_version,
    expression_id: envelope.expression_id,
    expression_digest: envelope.integrity,
    validation: {
      receipt_id: receipt.receipt_id,
      result: receipt.result,
      integrity_ok: receipt.integrity_ok,
      readiness_ok: receipt.readiness_ok,
      semantic_ok: receipt.semantic_ok,
      semantic_assertions: receipt.semantic_assertions,
      blocking_checks: receipt.checks.filter(
        (item) => item.status === "FAIL" || item.status === "WARNING",
      ),
    },
    view: {
      status: rendered.status,
      view_id: rendered.manifest?.view_id ?? null,
      content_digest: rendered.manifest?.output?.content_digest ?? null,
      ...(includeArtifact ? { artifact: rendered.artifact } : {}),
    },
    release_gate: gate,
    storage_contract: packet.storage_contract,
    persistence_status: "NOT_PERSISTED",
  };
}

function verifyPacket(args) {
  const packet = requireObject(args.packet, "packet");
  const claimedId = packet.packet_id;
  const unsigned = { ...packet };
  delete unsigned.packet_id;
  const packetDigest = digest(unsigned);
  const reasons = [];
  if (
    claimedId !== `packet:sha256:${packetDigest.value}` ||
    packet.schema !== PACKET_SCHEMA
  ) {
    reasons.push("PACKET_INTEGRITY_MISMATCH");
  }
  const envelope = packet.expression_envelope;
  const suppliedLineage = args.supplied_lineage ?? [];
  if (!Array.isArray(suppliedLineage) || suppliedLineage.length > 32) {
    throw new Error("supplied_lineage must contain at most 32 envelopes.");
  }
  const receipt = validateEnvelope(envelope, suppliedLineage);
  if (
    packet.validation_receipt?.receipt_id !== receipt.receipt_id ||
    packet.validation_receipt?.result !== receipt.result
  ) {
    reasons.push("VALIDATION_RECEIPT_MISMATCH");
  }
  const request = packet.view?.request;
  if (!request || typeof request !== "object") {
    reasons.push("VIEW_REQUEST_MISSING");
  } else {
    const rendered = renderView({
      envelope,
      view_type: request.view_type,
      format: request.format,
      ...(request.audience === undefined ? {} : { audience: request.audience }),
      supplied_lineage: suppliedLineage,
    });
    if (
      canonicalize(packet.view?.manifest ?? null) !==
        canonicalize(rendered.manifest) ||
      canonicalize(packet.view?.artifact ?? null) !==
        canonicalize(rendered.artifact) ||
      packet.view?.status !== rendered.status
    ) {
      reasons.push("VIEW_MISMATCH");
    }
    if (
      canonicalize(packet.release_gate) !==
      canonicalize(releaseGate(receipt, rendered))
    ) {
      reasons.push("RELEASE_GATE_MISMATCH");
    }
  }
  return {
    schema: PACKET_VERIFICATION_SCHEMA,
    packet_id: typeof claimedId === "string" ? claimedId : "NOT_ESTABLISHED",
    packet_digest: packetDigest,
    valid: reasons.length === 0,
    reasons,
    current_validation_receipt_id: receipt.receipt_id,
    persistence_status: "NOT_PERSISTED",
  };
}

function toolResult(structuredContent) {
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function listProfiles(args) {
  const ids = args.profile_ids ?? PROFILE_IDS;
  if (!Array.isArray(ids) || ids.length > PROFILE_IDS.length) {
    throw new Error("profile_ids must be a bounded array.");
  }
  const selected = ids.map((id) => {
    const profile = profilesById.get(id);
    if (!profile) {
      throw new Error(`Unknown profile: ${id}`);
    }
    return profile;
  });
  return {
    schema: CATALOG_SCHEMA,
    profiles: selected,
    composition_limit: {
      primary: 1,
      secondary: 1,
    },
    persistence_status: "NOT_PERSISTED",
  };
}

function composeExpression(args) {
  const expression = normalizeInputs(args);
  return envelopeExpression(expression);
}

function strictObject(properties, required) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const digestSchema = strictObject({
  algorithm: { const: "sha-256" },
  canonicalization: { const: "RFC8785" },
  value: { type: "string", pattern: "^[a-f0-9]{64}$" },
}, ["algorithm", "canonicalization", "value"]);

const genericEnvelopeSchema = strictObject({
  expression_id: { type: "string" },
  expression: { type: "object" },
  integrity: digestSchema,
  persistence_status: { const: "NOT_PERSISTED" },
}, ["expression_id", "expression", "integrity", "persistence_status"]);

function compositionProperties(profileEnum) {
  return {
    work_id: { type: "string" },
    title: { type: "string" },
    purpose: { type: "string" },
    primary_profile: profileEnum,
    secondary_profile: profileEnum,
    scope: { type: "array", items: { type: "string" } },
    non_goals: { type: "array", items: { type: "string" } },
    source_refs: {
      type: "array",
      maxItems: MAX_SOURCES,
      items: { type: "object" },
    },
    elements: {
      type: "array",
      maxItems: MAX_ELEMENTS,
      items: { type: "object" },
    },
    semantic_assertions: {
      type: "array",
      maxItems: MAX_ASSERTIONS,
      items: { type: "object" },
    },
    parents: { type: "array", maxItems: 8, items: { type: "object" } },
    generated_by: { type: "object" },
    generation_method: {
      type: "string",
      enum: ["SYNTHESIS", "TRANSFORMATION", "REVISION"],
    },
  };
}

function tools() {
  const profileEnum = { type: "string", enum: PROFILE_IDS };
  return [
    {
      name: TOOL_NAMES.listProfiles,
      title: "List Document Profiles",
      description:
        "Return the four compiled v0.1 profiles with content digests. Use these exact refs across composition, validation, and rendering.",
      inputSchema: strictObject({
        profile_ids: {
          type: "array",
          maxItems: 4,
          uniqueItems: true,
          items: profileEnum,
        },
      }, []),
      outputSchema: strictObject({
        schema: { const: CATALOG_SCHEMA },
        profiles: { type: "array" },
        composition_limit: { type: "object" },
        persistence_status: { const: "NOT_PERSISTED" },
      }, ["schema", "profiles", "composition_limit", "persistence_status"]),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    {
      name: TOOL_NAMES.composeExpression,
      title: "Compose Document Expression",
      description:
        "Use when Codex has already performed semantic synthesis and needs a deterministic proposal-scoped Expression assembled from explicit structured inputs. This tool does not research, infer authority, verify sources, persist output, or accept the result.",
      inputSchema: strictObject(compositionProperties(profileEnum), [
        "work_id",
        "title",
        "purpose",
        "primary_profile",
        "source_refs",
        "elements",
      ]),
      outputSchema: genericEnvelopeSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    {
      name: TOOL_NAMES.validateExpression,
      title: "Validate Document Expression",
      description:
        "Return a deterministic structural receipt for the supplied Expression and optional supplied lineage. A PASS does not establish source truth, repository head, behavior, fitness, authority, acceptance, operative status, or complete lineage.",
      inputSchema: strictObject({
        envelope: { type: "object" },
        supplied_lineage: {
          type: "array",
          maxItems: 32,
          items: { type: "object" },
        },
      }, ["envelope"]),
      outputSchema: strictObject({
        receipt_id: { type: "string" },
        schema: { const: RECEIPT_SCHEMA },
        subject: { type: "object" },
        validator: { type: "object" },
        validation_scope: { type: "array" },
        result: { enum: ["PASS", "PARTIAL", "FAIL"] },
        integrity_ok: { type: "boolean" },
        readiness_ok: { type: "boolean" },
        semantic_ok: { type: "boolean" },
        semantic_assertions: { type: "object" },
        checks: { type: "array" },
        lineage_result: { type: "object" },
        establishes: { type: "array" },
        not_established: { type: "array" },
        scope_limit: { type: "string" },
        persistence_status: { const: "NOT_PERSISTED" },
      }, [
        "receipt_id",
        "schema",
        "subject",
        "validator",
        "validation_scope",
        "result",
        "integrity_ok",
        "readiness_ok",
        "semantic_ok",
        "semantic_assertions",
        "checks",
        "lineage_result",
        "establishes",
        "not_established",
        "scope_limit",
        "persistence_status",
      ]),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    {
      name: TOOL_NAMES.renderView,
      title: "Render Document View",
      description:
        "Render a bounded human-review, human-action, or machine projection with element traceability. HUMAN_ACTION fails closed unless structural readiness passes; use compile_document_packet when semantic assertions must also gate release. This tool writes nothing.",
      inputSchema: strictObject({
        envelope: { type: "object" },
        view_type: { type: "string", enum: VIEW_TYPES },
        format: { type: "string", enum: FORMATS },
        audience: { type: "string" },
        supplied_lineage: {
          type: "array",
          maxItems: 32,
          items: { type: "object" },
        },
      }, ["envelope", "view_type"]),
      outputSchema: strictObject({
        status: { enum: ["RENDERED", "BLOCKED"] },
        reason: { type: "string" },
        validation_receipt: { type: "object" },
        manifest: { type: ["object", "null"] },
        artifact: { type: ["object", "null"] },
        persistence_status: { const: "NOT_PERSISTED" },
      }, [
        "status",
        "validation_receipt",
        "manifest",
        "artifact",
        "persistence_status",
      ]),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    {
      name: TOOL_NAMES.compilePacket,
      title: "Compile Document Release Packet",
      description:
        "Compose, validate, gate, and render in one call. Human-action release requires caller-reviewed semantic assertions. SUMMARY avoids repeating the full Expression; FULL returns a portable content-addressed packet that the caller may persist and later verify.",
      inputSchema: strictObject({
        ...compositionProperties(profileEnum),
        response_mode: { type: "string", enum: ["SUMMARY", "FULL"] },
        include_artifact: { type: "boolean" },
        view_type: { type: "string", enum: VIEW_TYPES },
        format: { type: "string", enum: FORMATS },
        audience: { type: "string" },
        supplied_lineage: {
          type: "array",
          maxItems: 32,
          items: { type: "object" },
        },
      }, [
        "work_id",
        "title",
        "purpose",
        "primary_profile",
        "source_refs",
        "elements",
      ]),
      outputSchema: {
        type: "object",
        properties: {
          schema: { const: PACKET_SCHEMA },
          packet_id: { type: "string" },
          persistence_status: { const: "NOT_PERSISTED" },
        },
        required: ["schema", "packet_id", "persistence_status"],
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    {
      name: TOOL_NAMES.verifyPacket,
      title: "Verify Document Release Packet",
      description:
        "Recompute a FULL portable packet's content address, validation receipt, rendered view, and release gate. This verifies supplied packet consistency, not source truth, human acceptance, persistence, or operative status.",
      inputSchema: strictObject({
        packet: { type: "object" },
        supplied_lineage: {
          type: "array",
          maxItems: 32,
          items: { type: "object" },
        },
      }, ["packet"]),
      outputSchema: strictObject({
        schema: { const: PACKET_VERIFICATION_SCHEMA },
        packet_id: { type: "string" },
        packet_digest: digestSchema,
        valid: { type: "boolean" },
        reasons: { type: "array" },
        current_validation_receipt_id: { type: "string" },
        persistence_status: { const: "NOT_PERSISTED" },
      }, [
        "schema",
        "packet_id",
        "packet_digest",
        "valid",
        "reasons",
        "current_validation_receipt_id",
        "persistence_status",
      ]),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
  ];
}

function resultMessage(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function errorMessage(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function handleToolCall(params) {
  const args = params?.arguments ?? {};
  if (JSON.stringify(args).length > MAX_PAYLOAD_BYTES) {
    throw new Error(`Input exceeds ${MAX_PAYLOAD_BYTES} bytes.`);
  }
  if (params?.name === TOOL_NAMES.listProfiles) {
    return toolResult(listProfiles(args));
  }
  if (params?.name === TOOL_NAMES.composeExpression) {
    return toolResult(composeExpression(args));
  }
  if (params?.name === TOOL_NAMES.validateExpression) {
    const supplied = args.supplied_lineage ?? [];
    if (!Array.isArray(supplied) || supplied.length > 32) {
      throw new Error("supplied_lineage must contain at most 32 envelopes.");
    }
    return toolResult(validateEnvelope(args.envelope, supplied));
  }
  if (params?.name === TOOL_NAMES.renderView) {
    return toolResult(renderView(args));
  }
  if (params?.name === TOOL_NAMES.compilePacket) {
    return toolResult(compilePacket(args));
  }
  if (params?.name === TOOL_NAMES.verifyPacket) {
    return toolResult(verifyPacket(args));
  }
  throw new Error(`Unknown tool: ${params?.name ?? ""}`);
}

export function getToolDefinitions() {
  return tools();
}

export function processJsonRpcMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return errorMessage(null, -32600, "Invalid Request");
  }
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return errorMessage(message.id ?? null, -32600, "Invalid Request");
  }
  const { id, method, params } = message;
  if (method === "initialize") {
    const requestedVersion = params?.protocolVersion;
    const supportedVersions = new Set([
      "2025-11-25",
      "2025-06-18",
      "2024-11-05",
    ]);
    return resultMessage(id, {
      protocolVersion: supportedVersions.has(requestedVersion)
        ? requestedVersion
        : "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions:
        "This stateless read-only server normalizes explicit semantic inputs, creates content-addressed proposal Expressions, validates supplied structure, assertions, and lineage, and compiles portable release packets. It writes nothing and cannot independently establish source authority, source truth, behavior, acceptance, operative status, repository head, or complete lineage.",
    });
  }
  if (method === "ping") {
    return resultMessage(id, {});
  }
  if (method === "tools/list") {
    return resultMessage(id, { tools: tools() });
  }
  if (method === "tools/call") {
    try {
      return resultMessage(id, handleToolCall(params));
    } catch (error) {
      return errorMessage(
        id,
        -32602,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  if (id !== undefined) {
    return errorMessage(id, -32601, `Method not found: ${method}`);
  }
  return undefined;
}

function runStdioServer() {
  const lines = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  lines.on("line", (line) => {
    if (line.trim().length === 0) {
      return;
    }
    try {
      const response = processJsonRpcMessage(JSON.parse(line));
      if (response !== undefined) {
        process.stdout.write(`${JSON.stringify(response)}\n`);
      }
    } catch {
      process.stdout.write(
        `${JSON.stringify(errorMessage(null, -32700, "Parse error"))}\n`,
      );
    }
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runStdioServer();
}
