---
name: render-document-view
description: Render a content-addressed document-system Expression into a human-review, human-action, or machine projection with a deterministic manifest. Use when a user asks for a checklist, field view, evidence matrix, operating plan, or inspectable document generated from an existing proposal without creating another source of truth.
---

# Render Document View

Render a bounded projection of an existing Expression. Do not use a view as a
replacement for its immutable semantic source.

## Workflow

1. Confirm that the input is an Expression envelope. If it is raw prose or
   an unstructured need, use `compose-document-system` first.
2. Name the stakeholder and concern.
3. Call `validate_document_expression`.
4. Stop on integrity errors. For a consequential `HUMAN_ACTION` view, also stop
   when semantic assertions are absent or fail; warnings may remain visible in
   a draft `HUMAN_REVIEW` view.
5. Select one view:
   - `HUMAN_REVIEW`: full proposal with epistemic labels and limitations;
   - `HUMAN_ACTION`: action-relevant authority, roles, states, transitions,
     requirements, gates, exceptions, and handoffs;
   - `MACHINE`: canonical JSON projection for another deterministic consumer.
6. Call `render_document_view`.
7. Return the artifact separately from its manifest and validation receipt.

## Boundaries

- Never add facts that are absent from the Expression.
- Never hide unresolved exceptions or missing evidence to improve appearance.
- Never label a rendered proposal operative, persistent, or accepted.
- Fail closed on `HUMAN_ACTION` when structural readiness is incomplete.
- Keep element identifiers and source links stable across views.
- Return to the Expression when a view reveals a missing or conflicting
  element.
- Renderer-owned prose is limited to title, section labels, proposal banner,
  and limitation notice.

## Output contract

Return the artifact, its content digest, source Expression identity, view
manifest, validation receipt, included element IDs, and explicit omission
reasons.
