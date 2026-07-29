# Document-system v0.1 model

## Boundary

The skill performs synthesis. The MCP performs deterministic normalization,
construction, hashing, structural validation, and bounded rendering. Project
authority decides whether outputs are saved, reviewed, accepted, or made
operative.

The MCP is stateless and read-only. A returned digest is not durable storage.

## Four profiles

Choose exactly one primary profile and at most one secondary profile:

| Profile | Primary job |
| --- | --- |
| `normative` | Define required, permitted, recommended, or prohibited behavior. |
| `operational` | Coordinate roles, states, gates, exceptions, and handoffs. |
| `research` | State questions, claims, evidence, tests, and limitations. |
| `human-agent` | Allocate goals, authority, formulation, execution, and evaluation across human-agent work. |

Use `human-agent` when allocation, interaction, authority, or evaluation of
human-agent work is itself the subject. Ordinary use of an agent does not
automatically require it.

## Immutable Expression

An Expression contains:

- caller-supplied stable `work_id`;
- content-derived `expression_id`;
- exactly `PROPOSED` lifecycle state;
- digested profile references;
- purpose, scope, and non-goals;
- SourceRefs;
- typed semantic elements;
- optional parent anchors;
- generation provenance.

The RFC 8785 canonical Expression is hashed with SHA-256. The digest is outside
the Expression, so it never hashes itself. No timestamp, random ID, machine
path, invocation ID, view, receipt, acceptance, or operative state belongs in
the digest-bearing object.

## Source boundary

`REVIEWED_BY_CALLER` is a caller assertion. It is not MCP verification.
Likewise:

- content supplied does not mean claim supported;
- digest integrity does not mean content true;
- a source locator does not mean the source was reviewed;
- structural PASS does not establish authority.

Use epistemic status only on `CLAIM` elements:

`OBSERVED`, `INFERRED`, `PROPOSED`, `CONTRADICTED`, or `NOT_ESTABLISHED`.

Acceptance, approval, validation, verification, effectiveness, and
supersession are not epistemic states and are forbidden in Expressions.

## Stateless lineage

Parent anchors may declare `DERIVED_FROM`, `REVISES`, or `TRANSLATES`.
Validation can report:

- `NONE_DECLARED`;
- `ANCHOR_DECLARED`;
- `SUPPLIED_CHAIN_VALID`;
- `SUPPLIED_CHAIN_INCOMPLETE`;
- `SUPPLIED_CHAIN_INVALID`.

It cannot establish current repository head, operative status, acceptance, or
complete lineage.

## Separate outputs

- `ExpressionEnvelope`: immutable semantic proposal and content digest.
- `ValidationReceipt`: deterministic structural checks, scope, established
  properties, and explicit non-findings.
- `ViewManifest`: projection identity, output digest, traceability, omissions,
  and governance limits.
- `artifact`: rendered Markdown or JSON returned separately from the manifest.
