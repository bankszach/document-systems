# Document Systems

> **Experimental — not submitted to the OpenAI Plugins Directory.**
> Document Systems is a public research prototype with verified engineering
> properties and unproven product utility. Do not treat its validation receipts
> or release gates as evidence that a document is correct, fit for use, or safer
> than an ordinary review.

Document Systems is a proposal-scoped Codex plugin prototype for composing,
validating, gating, packaging, auditing, and rendering consequential documents
from a small semantic model. It is published as a Banks Inc. service publication at
[documents.banksinc.us](https://documents.banksinc.us).

It packages four skills and a stateless MCP server. The server writes nothing,
accepts nothing, and cannot make a document authoritative or operative.

## Capabilities

- Compose immutable, content-addressed document Expressions.
- Validate structure, profile conformance, evidence references, status
  separation, caller-reviewed semantic invariants, and supplied lineage.
- Compile one-call release summaries or portable content-addressed packets.
- Verify a portable packet after caller-managed storage or transfer.
- Render traceable human-review, human-action, or machine projections.
- Audit authority, exceptions, evidence, readiness, and acceptance boundaries.

The v0.1 profile catalog contains:

- `normative`
- `operational`
- `research`
- `human-agent`

Each Expression selects exactly one primary profile and at most one secondary
profile.

## Install

Add this GitHub marketplace:

```bash
codex plugin marketplace add bankszach/document-systems
```

Install the plugin:

```bash
codex plugin add document-systems@document-systems-public
```

Start a new Codex session, then invoke a skill explicitly:

```text
$compose-document-system Turn this operating requirement into a proposal Expression.
```

The plugin requires Node.js and uses no third-party runtime packages.

## Tools

| Tool | Purpose |
| --- | --- |
| `list_document_profiles` | Return the four compiled profiles and their digests. |
| `compose_document_expression` | Normalize explicit semantic inputs into a deterministic proposal Expression. |
| `validate_document_expression` | Return a scoped structural receipt for an Expression and supplied lineage. |
| `render_document_view` | Render a bounded, traceable projection without writing an artifact. |
| `compile_document_packet` | Compose, validate, semantically gate, and render in one call; return a summary or portable packet. |
| `verify_document_packet` | Recompute a portable packet's identity, receipt, view, and release gate. |

All tools advertise `readOnlyHint: true`, `openWorldHint: false`, and
`destructiveHint: false`, and each declares an output schema.

The public stateless Streamable HTTP endpoint is:

```text
https://documents.banksinc.us/mcp
```

## Safety boundary

An Expression is always `PROPOSED`. Validation can establish structural
properties and conformance to caller-reviewed semantic assertions, but it does
not independently establish:

- source truth or source authority;
- behavioral success or intended-use fitness;
- human acceptance or operative status;
- repository head or complete lineage;
- persistence of returned objects.

Every returned object declares `persistence_status: NOT_PERSISTED`. A FULL
release packet is portable and content-addressed so a caller can store and
later verify it; the service itself does not store or resolve packets.

## Validate

```bash
npm test
```

The test suite exercises deterministic composition, content tampering,
profile drift, supplied lineage, evidence laundering, lifecycle contamination,
profile overcomposition, fail-closed action rendering, HTML escaping,
element-level traceability, semantic drift, typed allocation completeness,
portable-packet verification, and the no-write boundary.

Run the external OSHA, CISA, CDC, and NIST benchmark:

```bash
npm run benchmark:real-world
```

See [Real-World Benchmark v0.2](docs/REAL-WORLD-BENCHMARK.md) for the measured
self-authored structural and semantic-defect detection, payload reduction, and
why those results do not establish marginal product value.

See [Experimental Evaluation v0.3](docs/EXPERIMENTAL-EVALUATION.md) for the
World Control Plane failure that caused the production claim to be withdrawn
and the evidence required before reconsidering public submission.

## Distribution status

This repository is a public GitHub marketplace for Codex and contains a public
experimental HTTPS MCP transport, policy pages, test cases, and dormant
submission materials. The plugin has **not** been submitted to OpenAI for
review. Banks Inc. will not submit or publish it in the universal Plugins
Directory unless a blinded baseline-versus-candidate evaluation demonstrates
repeatable marginal value.

## License

MIT
