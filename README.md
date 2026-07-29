# Document Systems

Document Systems is a proposal-scoped Codex plugin for composing, validating,
auditing, and rendering consequential documents from a small semantic model.

It packages three skills and a stateless MCP server. The server writes nothing,
accepts nothing, and cannot make a document authoritative or operative.

## Capabilities

- Compose immutable, content-addressed document Expressions.
- Validate structure, profile conformance, evidence references, status
  separation, and supplied lineage.
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

All tools advertise `readOnlyHint: true` and `openWorldHint: false`.

## Safety boundary

An Expression is always `PROPOSED`. Validation can establish structural
properties of supplied data, but it does not establish:

- source truth or source authority;
- behavioral success or intended-use fitness;
- human acceptance or operative status;
- repository head or complete lineage;
- persistence of returned objects.

Every returned object declares `persistence_status: NOT_PERSISTED`.

## Validate

```bash
npm test
```

The test suite exercises deterministic composition, content tampering,
profile drift, supplied lineage, evidence laundering, lifecycle contamination,
profile overcomposition, fail-closed action rendering, HTML escaping,
element-level traceability, and the no-write boundary.

## Distribution status

This repository is a public GitHub marketplace for Codex. It is not yet a
listing in the universal ChatGPT and Codex Plugins Directory. Universal
submission requires a production HTTPS MCP endpoint, verified publisher
identity, public policy and support pages, review test cases, and OpenAI review.

## License

MIT
