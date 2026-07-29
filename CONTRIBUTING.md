# Contributing

Contributions should preserve the v0.1 boundary:

- proposal Expressions remain immutable and content-addressed;
- profile composition remains one primary plus at most one secondary;
- validation remains distinct from truth, authority, behavior, and acceptance;
- rendering remains traceable and fails closed for incomplete action views;
- MCP tools remain stateless and read-only.

Before opening a pull request:

```bash
npm test
```

Include a behavioral probe for any change intended to prevent a recurring
failure. Keep new profile or persistence proposals separate until real usage
demonstrates the need.
