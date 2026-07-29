---
name: audit-document-system
description: Audit an existing policy, specification, charter, plan, checklist, procedure, research report, knowledge document, or human-agent operating contract for authority, scope, evidence, state transitions, exceptions, verification, acceptance, and change control. Use when a user asks whether a document is complete, governable, internally consistent, operationally usable, or safe to promote.
---

# Audit Document System

Audit the document as a behavioral system. Do not rewrite or promote it unless
the user separately asks for implementation.

## Workflow

1. Identify the document's stated type, status, owner, authority, and audience.
2. Distinguish source text from your interpretation.
3. If an Expression exists, use it. Otherwise extract a proposal Expression
   without treating the extraction as authoritative.
4. Call `list_document_profiles` for the apparent primary profile.
5. Call `validate_document_expression` with only the lineage records actually
   supplied. Never describe unsupplied repository lineage as valid.
6. Perform the semantic review in
   [references/audit-rubric.md](references/audit-rubric.md).
7. Classify findings as `keep`, `clarify`, `relocate`, `promote-to-code`,
   `delete`, or `needs-evidence`.
8. Report integrity, readiness, behavioral proof, and human acceptance
   separately.

## Hard boundaries

- A structurally valid document is not necessarily ready for use.
- A passed test is not intended-use validation.
- Validation is not human acceptance.
- A title, uppercase keyword, checkbox, or official appearance does not create
  authority.
- An exception without an owner, stop rule, and closure evidence remains open.
- A generated audit finding is a review candidate, not automatic truth.

## Output contract

Return:

- scoped document and profile;
- observed findings with exact evidence;
- deterministic validation receipt, exact validation scope, and
  `not_established` states;
- semantic findings and failure consequences;
- proposed changes with expected behavioral effect;
- unresolved human decisions;
- unchanged source status unless promotion was explicitly authorized.
