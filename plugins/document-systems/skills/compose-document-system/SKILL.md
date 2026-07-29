---
name: compose-document-system
description: Compose a consequential charter, standard, plan, procedure, checklist, research object, or human-agent contract as a content-addressed proposal Expression or portable release packet. Use when a user asks to synthesize document types, create a reusable semantic template, turn requirements into a structured document system, enforce source-backed semantic invariants, or generate traceable views from one immutable source.
---

# Compose Document System

Perform the semantic reasoning, then ask the deterministic MCP to construct a
proposal-scoped Expression. Render documents as traceable views of that
Expression. Do not begin with a universal prose template.

## Workflow

1. Identify the document's primary job and intended user.
2. Call `list_document_profiles` and select one primary profile plus no more
   than one secondary profile.
3. Read the supplied sources yourself. Mark source review only as
   `REVIEWED_BY_CALLER`; this remains your assertion, not an MCP finding.
4. Build explicit SourceRefs, semantic elements, and assertions for
   consequential values or transitions supported by caller-reviewed evidence.
5. Prefer `compile_document_packet` to compose, validate, gate, and render once.
   Use `SUMMARY` for an efficient review handoff and `FULL` only when the caller
   needs a portable packet to store or transfer.
6. Use the separate compose, validate, and render tools only when an existing
   Expression or staged diagnostic workflow requires them.
7. Resolve integrity and semantic-assertion failures. Report readiness warnings
   rather than filling them speculatively.
8. Hand off the packet identity, release gate, artifact, and unresolved human
   decisions. A ready gate still requires a human decision.

Populate only elements supported by the user's request or cited evidence.
   Keep unknown fields explicit; do not invent authority, acceptance, or proof.

## Boundaries

- The Expression state is always `PROPOSED`; this skill cannot promote it.
- Treat generated requirements, claims, and procedures as proposals.
- Never infer acceptance from validation, a completed checklist, or polished
  formatting.
- Do not put acceptance, operative status, views, or validation results inside
  an Expression.
- Do not create multiple independently maintained versions of the same facts.
- Do not force a multi-profile document when one focused profile is enough.
- If the task is a simple low-consequence note, use ordinary writing instead
  of this system.
- The MCP writes nothing. A FULL packet is portable but remains
  `NOT_PERSISTED`; save it with ordinary repository tools only when the user
  explicitly requested project writes.

## Object and status model

Read [references/model.md](references/model.md) before building or revising a
record. Use stable typed identifiers only where later reference, verification,
or amendment is valuable.

## Output contract

Return:

1. selected profiles and why;
2. content-addressed packet and Expression identities;
3. structural and semantic-assertion gate status;
4. requested artifact and traceability digest;
5. unresolved authority, evidence, exception, or acceptance decisions.
