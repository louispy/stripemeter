### ADR 0001: Authentication, Tenancy, and RBAC for Stripemeter API

Date: 2025-09-10

Status: Accepted

#### Context

Stripemeter needs multi-tenant isolation with API-key based auth for programmatic access, simple role-based access control (RBAC), per-tenant rate limiting, and tamper-evident audit logging. Security must be simple to operate and safe-by-default, while enabling rotation and revocation of credentials.

#### Decision

- API authentication uses signed API keys with a human-friendly prefix and last-4 display.
  - Format: `<prefix>.<secret>` where `prefix` is short and identifies the key family.
  - Only `prefix` and `lastFour(secret)` are stored in plaintext.
  - Verification uses HMAC-SHA256 over the full presented key using a server-side salt: `HMAC(salt, apiKey)`. Only the resulting `secretHash` is stored.
  - Keys carry `organisationId` (tenant), optional `projectId`, `scopes`, `expiresAt`, `revokedAt`, and `active` flag.

- Tenancy is explicit across data models using `tenantId`/`organisationId` columns. New tables:
  - `organisations(id, name, slug, createdAt, updatedAt)`
  - `projects(id, organisationId, name, slug, createdAt, updatedAt)`
  - `api_keys(id, organisationId, projectId?, secretHash, prefix, lastFour, name, scopes, expiresAt?, revokedAt?, active, createdAt, updatedAt)`
  - `org_members(organisationId, userId, role, createdAt, updatedAt)`
  - `audit_logs(id, organisationId, projectId?, actorType, actorId, action, resourceType?, resourceId?, ip?, userAgent?, meta, createdAt)`

- RBAC uses three roles at the organisation scope: `owner`, `maintainer`, `viewer`.
  - Initial enforcement is kept at the API-key scope via `scopes` (e.g. `project:read`, `project:write`).
  - Future enhancement: join `org_members` to user identity provider and enforce per-route RBAC.

- Middleware pipeline:
  - Auth: Extract API key from `Authorization: Bearer` or `X-API-Key`. Verify via prefix/last-4 candidate lookup and HMAC comparison. Attach `tenant` context to the request: `{ organisationId, projectId?, apiKeyId, apiKeyPrefix, scopes[] }`.
  - Per-tenant rate limiting: Fixed window in Redis keyed by `org:project:window`. Defaults `1000 req / 60s`, configurable via `TENANT_RATE_LIMIT`, `TENANT_RATE_LIMIT_WINDOW`.
  - Audit logging: On response, persist an audit record for authenticated calls with request metadata and actor context.

- Admin endpoints:
  - POST `/v1/admin/api-keys` create key (returns plaintext once), POST `/v1/admin/api-keys/:id/rotate`, POST `/v1/admin/api-keys/:id/revoke`.

#### Security Considerations

- Secret material is never stored; only HMAC hash with server-side salt. Salt is configured via `API_KEY_SALT` and must be rotated via key rollovers.
- Prefix/last-4 are safe to display and log for support without leaking secrets.
- Replay-resistant: idempotency keys at the events layer; rate limiting throttles high-volume abuse per tenant.
- Key rotation path returns new plaintext once; callers must update their stored secret promptly.
- Key expiration and revocation are enforced during verification. Disabled keys are rejected immediately.
- Audit logs provide non-repudiation for configuration and data access events. Storage resides in Postgres; move to WORM/immutable store can be considered later.

#### Alternatives Considered

1) Store bcrypt/argon2 of the secret: strong but unnecessary for API-key format (HMAC keyed with server secret achieves the same property with O(1) verification without slow KDF).
2) JWTs for service-to-service: suitable for user auth; here API key lifecycle and simplicity trump JWT complexity.
3) Global rate limit only: rejected; per-tenant isolation is necessary to prevent noisy-neighbor issues.

#### Operational Notes

- ENV:
  - `API_KEY_SALT` (required in prod)
  - `TENANT_RATE_LIMIT`, `TENANT_RATE_LIMIT_WINDOW`
  - `BYPASS_AUTH=1` for tests/dev-only to bypass auth hook
- Rotation procedure:
  1) Create new key via admin API, deploy client with new key.
  2) Revoke old key after cutover.
- Observability: Audit logs + HTTP metrics provide visibility into actor actions and call volume. Add alerting for invalid key spikes.

#### Rollout Plan

- Migrate DB via Drizzle (tables above).
- Seed a sample organisation, project, and default API key for local dev.
- Enable middleware in API server with test bypass for CI.
- Add admin UI wiring later; for now, use admin endpoints.

#### Future Work

- Full RBAC enforcement for user-authenticated routes using `org_members`.
- Key-scoped rate limits by `scope` or endpoint class.
- Audit log shipping to centralized immutable store.


