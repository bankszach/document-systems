# Real-World Benchmark v0.1

## Decision

**Document Systems has situational value as a deterministic structural gate,
but the current three-call interface is too payload-heavy for ordinary document
work and does not detect semantic falsity.**

Do not position v0.2 as general document intelligence. Use it where missing
roles, exceptions, evidence support, typed references, or fail-closed action
rendering justify substantial overhead. For summaries, notes, and low-stakes
one-off documents, a flat document is more efficient.

## Question

Does Document Systems catch consequential defects often enough to justify its
model-visible payload overhead?

## External cases

The benchmark uses four official sources outside Banks Inc.:

1. **Normative:** OSHA
   [29 CFR 1910.38](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38),
   including the written-plan rule, small-employer oral exception, minimum plan
   elements, alarms, training, and employee review.
2. **Operational:** CISA
   [Federal Government Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf),
   including the major-incident applicability boundary and incident lifecycle.
3. **Research:** CDC
   [Measles Update - United States, January 1-April 17, 2025](https://www.cdc.gov/mmwr/volumes/74/wr/mm7414a1.htm),
   including reported counts, outbreak association, severe outcomes, and
   limitations.
4. **Human-agent:** NIST
   [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) and
   [Appendix C](https://airc.nist.gov/airmf-resources/airmf/appendices/app-c-ai-risk-management-and-human-ai-interaction/),
   including executive authority, differentiated human-AI roles, oversight,
   and joint evaluation.

The CISA PDF was inspected as rendered pages as well as extracted text. Source
facts are bounded paraphrases; the repository does not republish the source
documents.

## Method

For each source:

1. A caller extracted a bounded set of critical facts.
2. The same facts were represented as a concise flat Markdown baseline.
3. The production MCP at `https://documents.banksinc.us/mcp` composed,
   validated, and rendered a profile-specific Expression.
4. Composition ran twice to test deterministic identity.
5. Three critical-fact assertions tested normalization retention.
6. One structural and one semantic defect were seeded through a fresh
   composition so each mutated Expression had a valid digest.
7. Each defect was validated and sent to `HUMAN_ACTION` rendering to test the
   fail-closed behavior.

Payload is measured as exact UTF-8 bytes across caller arguments and structured
tool results for compose, validate, and render. The token proxy is
`ceil(bytes / 4)`. It is a deterministic comparison aid, not an OpenAI
billing-token count. Tool schemas are omitted, so the reported overhead is a
lower bound.

Run:

```bash
npm run benchmark:real-world
```

Override the endpoint:

```bash
DOCUMENT_SYSTEMS_MCP_URL=https://example.test/mcp npm run benchmark:real-world
```

## Results

### Clean cases

| Measure | Result |
| --- | ---: |
| Deterministic, structurally passing, rendered cases | 4 / 4 |
| Supplied critical-fact assertions retained | 12 / 12 |
| Profiles exercised | 4 / 4 |

These results establish deterministic normalization and projection of supplied
facts. They do not establish correct source interpretation because the caller,
not the MCP, performed research and semantic extraction.

### Seeded defects

| Case | Defect | Class | Detected | Human-action view |
| --- | --- | --- | --- | --- |
| OSHA | Missing small-employer exception | Structural | Yes | Blocked |
| OSHA | Threshold changed from 10 to 100 employees | Semantic | No | Rendered |
| CISA | Transition points to a missing state | Structural | Yes | Blocked |
| CISA | Analysis-to-containment transition reversed | Semantic | No | Rendered |
| CDC | `OBSERVED` claims retain only reference-only support | Structural | Yes | Blocked |
| CDC | Reported case count changed from 800 to 8,000 | Semantic | No | Rendered |
| NIST | Evaluation criterion removed | Structural | Yes | Blocked |
| NIST | Allocation party and type removed | Semantic | No | Rendered |

Summary:

| Measure | Result |
| --- | ---: |
| Structural defects detected | 4 / 4 |
| Structural defects blocked from action rendering | 4 / 4 |
| Semantic defects detected | 0 / 4 |
| Semantic defects blocked from action rendering | 0 / 4 |

The structural result is meaningful: the system caught missing profile
elements, broken references, and evidence-status laundering, then blocked
action views. The semantic result is equally meaningful: valid structure can
carry a false number, incorrect threshold, reversed workflow, or incomplete
allocation semantics and still receive `PASS`.

### Payload

| Measure | Flat baseline | MCP pipeline |
| --- | ---: | ---: |
| UTF-8 bytes | 1,346 | 81,874 |
| Token proxy | 337 | 20,469 |
| Aggregate ratio | 1.00x | 60.83x |

Per-case pipeline ratios ranged from 57.27x to 63.64x. The main cause is
repetition of the complete Expression in compose output, validation input,
render input, receipts, and manifests.

## Interpretation

### Where it earns its cost

- Consequential workflows where a missing role, exception, state, or reference
  can create an unsafe action.
- Research packets where `OBSERVED` claims must not silently rely on
  reference-only evidence.
- Controlled publishing or operations where an action view must fail closed on
  structural unreadiness.
- Systems that persist or cache the Expression and receipts outside the model
  context and reuse them across many decisions.

### Where it is mostly ceremony

- Ordinary summaries, meeting notes, prose drafts, and one-off checklists.
- Work where source truth is the primary risk, because v0.2 does not retrieve or
  compare source content.
- Work where the full compose-validate-render exchange occurs inside a model
  context for every interaction.
- Work where nobody consumes element IDs, lineage, receipts, or alternate
  projections after generation.

## Required next experiment

Before promoting the system as broadly valuable:

1. Add a composite compile tool that accepts semantic inputs once and returns a
   compact receipt plus requested view, avoiding repeated envelopes.
2. Return compact model-visible summaries and move full manifests to a
   non-model payload or retrievable artifact where the host supports it.
3. Require `allocation_party` and `allocation_type` on
   `HUMAN_AGENT_ALLOCATION`.
4. Allow callers to supply semantic invariants such as permitted state
   transitions and numeric/source assertions.
5. Repeat this benchmark and require:
   - 4 / 4 structural detection;
   - at least 3 / 4 detection or explicit blocking of the seeded semantic
     defects;
   - at least a 75 percent reduction in pipeline bytes;
   - no regression in determinism or fail-closed rendering.

## Boundary

This benchmark supports the decision **situational value, current interface
inefficient**. It does not establish product-market fit, user willingness to
pay, source truth, legal correctness, or universal document coverage.
