# Experimental evaluation v0.3

Date: 2026-07-29

## Current decision

Document Systems is an **experimental, value-unproven research prototype**.
Do not submit it to the OpenAI Plugins Directory or describe it as
production-ready.

## Evidence ledger

| Claim | Status | Evidence |
| --- | --- | --- |
| Stateless, read-only MCP transport works | PROVEN | Protocol tests and public health endpoint |
| Deterministic packet composition and tamper detection work | PROVEN | 13 repository behavioral probes |
| Seeded fixture defects are blocked | PROVEN | Four self-authored benchmark cases |
| Compact compile reduces bytes versus the earlier three-call path | PROVEN | 75.78% measured reduction |
| Results are better than ordinary model or human review | UNKNOWN | No blinded baseline-versus-candidate evaluation |
| The system catches consequential real-world defects | NOT PROVEN | WCP use case passed while missing underground placement |
| Product demand or willingness to pay exists | UNKNOWN | No buyer or transaction evidence |

## Named failure

The World Control Plane integration successfully exchanged typed packets and
performed a zero-mutation Paper preview. Document Systems packaged and gated a
synthetic cottage proposal but did not identify that the planned cottage was
underground. The downstream WCP preview exposed the consequential placement
problem.

The counterfactual is unfavorable: without Document Systems, WCP still would
have exposed the defect. The MCP added packet and token overhead without an
observed improvement in the decision.

## Why the earlier benchmark did not settle value

The OSHA, CISA, CDC, and NIST fixtures demonstrate deterministic checks against
defects and assertions authored by the same development process. This is useful
engineering evidence, but it is not blinded, independent, or comparative.
Passing those fixtures cannot establish marginal review value.

## Promotion gate

Reconsider submission only after a frozen, blinded evaluation of ten unseen,
consequential document problems:

1. Compare the same model and source material with and without Document Systems.
2. Score material defects uniquely caught, false confidence, unsafe release
   recommendations, reviewer interventions, elapsed time, and token/API cost.
3. Require no critical safety regression.
4. Require Document Systems to catch at least three material defects missed by
   the baseline across the ten cases.
5. Require median combined review time and token/API cost to be no worse than
   120 percent of baseline.
6. Retire the MCP if it misses the value threshold; simplify it around the
   demonstrated behavior if it passes.

The cases, expected defects, and scoring should be fixed before either variant
runs. Self-authored repository tests do not satisfy this gate.

## Distribution status

- Banks Inc. organization verification: verified.
- OpenAI plugin submission: not submitted.
- Public MCP and GitHub marketplace: online for transparent experimentation.
- Public-directory publication: on hold pending the promotion gate.
