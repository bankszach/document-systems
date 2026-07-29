---
name: verify-document-packet
description: Verify a FULL portable Document Systems release packet after storage, transfer, revision review, or audit. Use when a user asks whether a packet's content address, Expression, validation receipt, rendered view, or release gate still agrees, or when tampering and ruleset drift must fail closed without claiming source truth or acceptance.
---

# Verify Document Packet

Verify internal packet consistency with the deterministic MCP. Treat a valid
packet as integrity evidence, never as source truth, persistence proof, human
acceptance, or execution authority.

## Workflow

1. Confirm the input is a FULL packet containing `packet_id`,
   `expression_envelope`, `validation_receipt`, `view`, and `release_gate`.
2. Supply only lineage envelopes actually available to the caller.
3. Call `verify_document_packet`.
4. Stop if `valid` is false. Report every machine reason without repairing the
   packet in place.
5. If the packet is valid, report the current receipt identity and restate its
   explicit non-findings.
6. Create a new Expression and packet for any revision; never overwrite the
   historical packet while retaining its old identity.

## Boundaries

- A valid content address proves supplied bytes agree, not that a server stored
  them durably.
- Recomputed assertion conformance proves agreement with caller-reviewed
  invariants, not independent source verification.
- A ready release gate means ready for a human decision, not approved,
  accepted, operative, deployed, or executed.
- Do not retrieve missing packets, lineage, or sources by guessing a location.

## Output contract

Return packet ID, computed digest, validity, reason codes, current validation
receipt ID, supplied-lineage scope, and the exact states still not established.
