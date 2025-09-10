### ADR: Tenancy, Authentication, RBAC, Rate Limiting, and Audit Logging

Date: 2025-09-10

#### Context

Stripemeter serves multiple organisations. We need API-key based access for service integrations, clear scoping to org/project, simple RBAC, per-tenant rate limiting to prevent noisy neighbors, and an audit trail. Security must be easy to operate (rotate/revoke) and safe by default.

#### Decision

- **Org/Project model**
  - `organisations(id, name, slug, createdAt, updatedAt)`
  - `projects(id, organisationId, name, slug, createdAt, updatedAt)`
  - Tenancy columns are explicit across domain tables as `tenantId` or `organisationId` and optional `projectId` where relevant.

- **API key format & storage**
  - Format presented to clients: `<prefix>.<secret>` (e.g., `sm_ab12cd.XYZ...`).
  - Server stores only: `prefix`, `lastFour(secret)`, and `secretHash = HMAC-SHA256(API_KEY_SALT, apiKey)`.
  - Keys carry metadata: `organisationId`, optional `projectId`, `name`, `scopes`, `expiresAt?`, `revokedAt?`, `active`.
  - Verification: lookup candidates by `(prefix, lastFour)`, compute HMAC, constant-time compare with stored `secretHash`.

- **RBAC & scopes**
  - Org-level roles: `owner`, `maintainer`, `viewer` (policy-level; for future user auth).
  - API-key scopes enforce route access initially (e.g., `project:read`, `project:write`).
  - Request context attaches `{ organisationId, projectId?, apiKeyId, apiKeyPrefix, scopes[] }` for downstream checks.

- **Rate limiting**
  - Global Fastify limit for abuse protection.
  - Per-tenant fixed-window limit in Redis keyed by `org:project:window` (defaults: `1000 req / 60s`, configurable via `TENANT_RATE_LIMIT`, `TENANT_RATE_LIMIT_WINDOW`). Requests beyond return 429.

- **Audit logging**
  - Persist an audit record for authenticated requests (excluding `/health` and `/docs`): `organisationId`, `projectId?`, `actorType='api_key'`, `actorId`, `action=METHOD path`, `ip`, `userAgent`, `meta{requestId,statusCode,path}`.
  - Stored in Postgres. Consider WORM/immutable storage in future for stronger tamper evidence.

- **Admin endpoints**
  - Create key: `POST /v1/admin/api-keys` (returns plaintext once)
  - Rotate key: `POST /v1/admin/api-keys/:id/rotate`
  - Revoke key: `POST /v1/admin/api-keys/:id/revoke`

#### Implementation Notes

- Auth: `apps/api/src/utils/auth.ts` (API key parsing, HMAC verification, tenant context attach)
- Rate limiting: global via Fastify plugin; per-tenant in `apps/api/src/utils/rate-limit.ts`
- Audit: `apps/api/src/utils/audit.ts` (hook on response)
- Admin routes: `apps/api/src/routes/admin.ts` (generate/rotate/revoke)
- Schema: `packages/database/src/schema/api-keys.ts`, `audit-logs.ts`, `projects.ts`

#### Security Assumptions & Boundaries

- `API_KEY_SALT` is secret and rotated via key rollovers; leaked salt does not compromise existing keys if roll handled properly (rotate keys and change salt).
- We do not store API-key secrets; support and logs may reference prefix/last-4 only.
- Scopes are enforced server-side; keys may be constrained to a project.
- BYPASS mode (`BYPASS_AUTH=1`) exists for tests and must never be enabled in production.
- Rate limit keys are per tenant/project; noisy neighbor isolation depends on accurate tenant resolution.

#### Alternatives Considered

- JWT for service-to-service auth: rejected for now; API keys provide simpler lifecycle and operational model.
- Storing bcrypt/argon2 of secrets: rejected; HMAC with server-side secret achieves required security properties without slow KDF costs.
- Global-only rate limiting: rejected; does not protect other tenants from a single tenant’s traffic spikes.

#### Operational Defaults

- Tenant limit: 1000 req / 60s (override via env)
- Key prefix namespace: `sm_` by default
- Key length: 24 bytes base64url secret; last-4 displayed for support

#### Consequences

- Clear multi-tenant isolation across auth, rate limiting, and auditing.
- Easy rotation/revocation without ever storing plaintext secrets.
- Predictable failure modes (401/403/429) and actionable audit trail.

#### Diagrams

```mermaid
erDiagram
  ORGANISATIONS ||--o{ PROJECTS : contains
  ORGANISATIONS ||--o{ API_KEYS : issues
  ORGANISATIONS ||--o{ AUDIT_LOGS : owns
  PROJECTS ||--o{ API_KEYS : scopes
  PROJECTS ||--o{ AUDIT_LOGS : context

  ORGANISATIONS {
    uuid id PK
    string name
    string slug
    timestamp created_at
    timestamp updated_at
  }
  PROJECTS {
    uuid id PK
    uuid organisation_id FK
    string name
    string slug
    timestamp created_at
    timestamp updated_at
  }
  API_KEYS {
    uuid id PK
    uuid organisation_id FK
    uuid project_id FK
    string prefix
    string last_four
    string secret_hash
    string scopes
    timestamp expires_at
    timestamp revoked_at
    boolean active
    timestamp created_at
    timestamp updated_at
  }
  AUDIT_LOGS {
    uuid id PK
    uuid organisation_id FK
    uuid project_id FK
    string actor_type
    uuid actor_id
    string action
    string resource_type
    uuid resource_id
    string ip
    string user_agent
    jsonb meta
    timestamp created_at
  }
```

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Fastify (server)
  participant RL as Redis (per-tenant RL)
  participant DB as Postgres (audit)

  C->>API: Request with API key (Bearer or X-API-Key)
  API->>API: Parse prefix/last4, verify HMAC(secretHash)
  API->>RL: Increment window key org:project:window
  alt within limit
    RL-->>API: ok
    API->>API: Attach tenant context + scopes
    API-->>C: Route handler executes
    API->>DB: Persist audit log on response
  else rate limited
    RL-->>API: limit exceeded
    API-->>C: 429 Too Many Requests
  end
```

```mermaid
flowchart LR
  A[Create API Key] --> B[Return plaintext once]
  B --> C[Use key in clients]
  C --> D{Rotate needed?}
  D -- Yes --> E[Rotate: issue new key]
  E --> F[Old key revoked or set expiry]
  D -- No --> G[Continue]
  F --> H[Revoke compromised key]
  H --> I[Requests with revoked key -> 401]
```

