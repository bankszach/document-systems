# Security

## Supported version

Security fixes are currently applied to the latest `0.3.x` release.

## Report a vulnerability

Use GitHub's private vulnerability reporting or security-advisory feature for
this repository. Do not include credentials, private documents, or production
data in a public issue.

## Data and authority boundary

The bundled MCP server is stateless, unauthenticated, and read-only. It does not
make downstream network requests or persist inputs. It validates
caller-supplied objects and returns proposal-scoped results, including portable
packets that remain `NOT_PERSISTED` until a caller stores them.

Document content, semantic assertions, and portable packets can still be
sensitive. Users remain responsible for deciding which content may be supplied
to Codex and for governing any artifact they choose to save outside this
plugin. A content digest is an integrity handle, not confidentiality,
authorization, or durable storage.
