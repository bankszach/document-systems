# Production readiness v0.3

Date: 2026-07-28

## Decision

Document Systems v0.3 is production-ready for **bounded,
caller-assertion-backed document release gating**. It is not an independent
source-truth engine, approval system, or execution authority.

## Release gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Package and protocol | Pass | 6 tools, 4 profiles, 13 behavioral probes |
| Clean external cases | 4 / 4 | OSHA, CISA, CDC, NIST |
| Structural defects blocked | 4 / 4 | Real-World Benchmark v0.2 |
| Semantic defects blocked | 4 / 4 | Real-World Benchmark v0.2 |
| Payload reduction | 75.78% | 81,874 to 19,832 UTF-8 bytes |
| WCP zero-mutation integration | Pass | Live Paper preview, sequence 3 |

## Live World Control Plane proof

Evidence class: `SYNTHETIC_INTEGRATION`

The production harness ran this typed chain:

```text
Semantic Consensus Engine fixture
  -> semantic-consensus-envelope-v1
  -> Minecraft Semantic Planner
  -> minecraft-semantic-proposal-v1
  -> Document Systems proposal release gate
  -> WCP world.semantic-proposal.preview.v1
  -> Paper zero-mutation preview
  -> Document Systems preview-proof packet
```

Observed identifiers:

- consensus envelope: `consensus.48b7376d7bbba57e`;
- semantic proposal: `semantic-proposal.bbb3f3114b3bae34`;
- proposal packet:
  `packet:sha256:66c28dd2e6222acfb594f3850b43620b86b573e9a4dc22748c373666e559d07b`;
- preview-proof packet:
  `packet:sha256:02c1e1caa8092016fa3266d0374f7c33c0d0e7dd67fc2339191dcb6d3b41bb3d`;
- WCP preview proof:
  `b913282891822865eea93a39d8fd92231b5016796e9929cf63bf68c70b0d92dc`;
- WCP plan:
  `d975ac1195dd78efdf9e14b2abc64294adfefcbb7e970aa6ee7da6c87a1d32ed`.

Paper predicted 194 changes, observed zero changes, and returned
`world_mutation=false`. No apply or verify-mutation capability ran.

## Reproduce

Set absolute local paths for the three independently governed repositories and
choose an operator-reviewed WCP sequence and origin:

```bash
SEMANTIC_CONSENSUS_ENGINE_ROOT=/path/to/semantic-consensus-engine \
MINECRAFT_SEMANTIC_PLANNER_ROOT=/path/to/minecraft-semantic-planner \
WORLD_CONTROL_PLANE_ROOT=/path/to/world-control-plane \
DOCUMENT_SYSTEMS_MCP_URL=https://documents.banksinc.us/mcp \
npm run integration:wcp -- SEQUENCE ORIGIN_X ORIGIN_Y ORIGIN_Z
```

The harness uses a temporary proof root and never invokes WCP apply. Repository
authority and WCP runtime gates remain authoritative.

## Remaining non-claims

- Semantic assertions are authored from caller-reviewed evidence; they do not
  independently prove the external source.
- A ready gate means ready for human decision, not accepted or operative.
- FULL packets are portable and verifiable but not stored by the MCP.
- The live WCP test used a synthetic consensus fixture, not a new authentic
  audience round.
- Product-market fit and willingness to pay remain unestablished.
