# Real-World Benchmark v0.2

## Decision

**This benchmark establishes deterministic behavior against four self-authored
fixtures. It does not establish production readiness or marginal value over
ordinary review. The earlier production conclusion is withdrawn.**

All seeded structural and semantic defects are blocked, and the compact
one-call path reduces pipeline payload by 75.78 percent. Those are engineering
measurements. The fixtures, assertions, seeded defects, and evaluator were
created within the same development process, so they are not a blinded or
independent product test.

## Question

Does Document Systems catch consequential defects often enough to justify its
model-visible payload overhead?

## External cases

The benchmark uses four official sources outside Banks Inc.:

1. **Normative:** OSHA
   [29 CFR 1910.38](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38).
2. **Operational:** CISA
   [Federal Government Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf).
3. **Research:** CDC
   [Measles Update - United States, January 1-April 17, 2025](https://www.cdc.gov/mmwr/volumes/74/wr/mm7414a1.htm).
4. **Human-agent:** NIST
   [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) and
   [Appendix C](https://airc.nist.gov/airmf-resources/airmf/appendices/app-c-ai-risk-management-and-human-ai-interaction/).

The CISA PDF was inspected as rendered pages as well as extracted text. Source
facts are bounded paraphrases; the repository does not republish the source
documents.

## Method

For each source:

1. A caller extracted a bounded set of critical facts.
2. The same facts were represented as a concise flat Markdown baseline.
3. Each consequential value or transition became a semantic assertion citing a
   supplied SourceRef marked `REVIEWED_BY_CALLER`.
4. `compile_document_packet` composed, validated, gated, and rendered the
   document in one call with `response_mode=SUMMARY`.
5. Compilation ran twice to test deterministic packet identity.
6. One structural and one semantic defect were seeded through a fresh
   composition so each mutated Expression had a valid digest.
7. A defect counted as detected when validation failed, semantic conformance
   failed, or the release gate blocked.

Payload is exact UTF-8 bytes across the compile arguments and compact result.
The token proxy is `ceil(bytes / 4)`, a deterministic comparison aid rather than
an OpenAI billing-token count. Tool schemas are omitted.

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
| Deterministic, passing, release-ready cases | 4 / 4 |
| Supplied critical assertions passed | 12 / 12 |
| Profiles exercised | 4 / 4 |

These results establish deterministic conformance to supplied reviewed
invariants. The caller still performs research, interpretation, and assertion
authoring.

### Seeded defects

| Case | Defect | Class | Detected | Release gate |
| --- | --- | --- | --- | --- |
| OSHA | Missing small-employer exception | Structural | Yes | Blocked |
| OSHA | Threshold changed from 10 to 100 employees | Semantic | Yes | Blocked |
| CISA | Transition points to a missing state | Structural | Yes | Blocked |
| CISA | Analysis-to-containment transition reversed | Semantic | Yes | Blocked |
| CDC | `OBSERVED` claims retain only reference-only support | Structural | Yes | Blocked |
| CDC | Reported case count changed from 800 to 8,000 | Semantic | Yes | Blocked |
| NIST | Evaluation criterion removed | Structural | Yes | Blocked |
| NIST | Allocation party and type removed | Semantic | Yes | Blocked |

| Measure | v0.1 | v0.2 |
| --- | ---: | ---: |
| Structural defects detected | 4 / 4 | 4 / 4 |
| Semantic defects detected | 0 / 4 | 4 / 4 |
| Semantic defects blocked | 0 / 4 | 4 / 4 |

The semantic improvement comes from explicit caller-reviewed assertions and
mandatory typed allocation fields. It is not autonomous fact checking.

### Payload

| Measure | Flat baseline | v0.1 three-call | v0.2 compact compile |
| --- | ---: | ---: | ---: |
| UTF-8 bytes | 1,346 | 81,874 | 19,832 |
| Token proxy | 337 | 20,469 | 4,958 |
| Ratio to flat baseline | 1.00x | 60.83x | 14.73x |

The compact path reduces measured pipeline bytes by **75.78 percent** compared
with v0.1. It accepts the semantic input once and omits the artifact body from
the default summary while retaining its view ID and content digest. Callers can
request an artifact or a FULL portable packet when needed.

## Experimental interpretation

### Engineering capabilities demonstrated

- Consequential workflows where exact values, state transitions, authority
  allocation, exceptions, or evidence status must fail closed.
- Release and audit packets that reuse content identities, receipts, and views.
- Machine-contract handoffs where the caller can derive exact assertions from
  versioned source objects.

### Uses not justified by this benchmark

- Independent legal, medical, scientific, or factual verification.
- Low-consequence notes and summaries that do not reuse packet identities or
  gates.
- Work where the caller cannot provide trustworthy source extraction or
  assertions.
- Any use that treats `READY_FOR_HUMAN_DECISION` as approval, acceptance,
  deployment, or execution.
- Any claim that the MCP catches consequential defects better, faster, or more
  cheaply than an ordinary model or human review.

## Gate outcome

The v0.1 next-experiment requirements are met:

- structural detection: **4 / 4**;
- semantic detection or blocking: **4 / 4**, exceeding the 3 / 4 threshold;
- payload reduction: **75.78 percent**, exceeding the 75 percent threshold;
- clean-case determinism and fail-closed rendering: **no regression observed**.

These results support continued experimentation with deterministic,
assertion-backed packet processing. They do **not** support a production-ready
claim. A subsequent World Control Plane use case passed the Document Systems
gate while missing a consequential underground-placement defect; see
[Experimental Evaluation v0.3](EXPERIMENTAL-EVALUATION.md).
