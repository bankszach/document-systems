# Contributing

Contributions should preserve the experimental safety boundary:

- proposal Expressions remain immutable and content-addressed;
- profile composition remains one primary plus at most one secondary;
- validation and caller-reviewed semantic assertion conformance remain distinct
  from source truth, authority, behavior, and acceptance;
- rendering remains traceable and fails closed for incomplete action views;
- MCP tools remain stateless and read-only;
- portable packets remain caller-managed and never imply server persistence.

Before opening a pull request:

```bash
npm test
```

Include a behavioral probe for any change intended to prevent a recurring
failure. New profiles or server-owned persistence require separate evidence,
privacy review, and an explicit authority change.

Do not describe the project as production-ready or submit it to a public
directory until the promotion gate in
`docs/EXPERIMENTAL-EVALUATION.md` is independently satisfied.
