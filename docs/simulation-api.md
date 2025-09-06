# Simulation API Documentation

## Observability endpoints (early release)

The API and workers expose minimal health and metrics endpoints to aid monitoring.

API service:
- `GET /health` returns `{ status: "ok", timestamp }`.
- `GET /health/live` returns `{ status: "alive" }`.
- `GET /health/ready` performs simple DB and Redis checks and returns status `healthy|degraded|unhealthy`.
- `GET /metrics` exposes Prometheus metrics including default Node.js process metrics and basic HTTP metrics.

Workers service (internal server on `WORKER_HTTP_PORT`, default `3100`):
- `GET /health/live` and `GET /health/ready` return process status.
- `GET /metrics` exposes Prometheus metrics for workers.

Notes:
- These endpoints are intentionally simple for early versions. `/metrics` is not protected; restrict via network if needed.
- Future versions may include richer checks (Stripe probe, worker heartbeat, pending work gauges).

## Overview

The Simulation API provides a comprehensive system for managing and executing pricing simulations in StripeMeter. This enables teams to:

- **Test pricing changes** before deploying to production
- **Validate billing calculations** against expected outcomes
- **Run regression tests** on pricing models
- **Compare different pricing strategies** side-by-side
- **Integrate with CI/CD** for automated pricing validation

## Architecture

```
┌─────────────────────┐
│   Admin UI / CLI    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Simulation API    │
│  /v1/simulations/*  │
└──────────┬──────────┘
           │
           ├──► Scenarios DB (PostgreSQL)
           │
           ▼
┌─────────────────────┐
│  Simulation Queue   │
│     (BullMQ)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Simulation Runner   │
│     (Worker)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Pricing Library   │
│  (Core Calculator)  │
└─────────────────────┘
```

## API Endpoints

### Scenario Management

#### Create Scenario
```http
POST /v1/simulations/scenarios
```

Create a reusable pricing scenario.

**Request:**
```json
{
  "name": "Enterprise Tiered Pricing",
  "description": "Test scenario for enterprise tier",
  "version": "1.0",
  "tags": ["enterprise", "tiered", "production"],
  "model": {
    "model": "tiered",
    "currency": "USD",
    "tiers": [
      { "upTo": 1000, "unitPrice": 0.10 },
      { "upTo": 5000, "unitPrice": 0.08 },
      { "upTo": null, "unitPrice": 0.05 }
    ]
  },
  "inputs": {
    "customerId": "cust_123",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-31",
    "usageItems": [
      {
        "metric": "api_calls",
        "quantity": 3500,
        "priceConfig": { /* same as model */ }
      }
    ],
    "commitments": [],
    "credits": [],
    "taxRate": 0
  },
  "expected": {
    "total": 260.00,
    "subtotal": 260.00,
    "tax": 0
  },
  "tolerances": {
    "absolute": 0.01,
    "relative": 0.001
  }
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Enterprise Tiered Pricing",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### List Scenarios
```http
GET /v1/simulations/scenarios?active=true&tag=production&limit=20&offset=0
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Enterprise Tiered Pricing",
      "description": "Test scenario for enterprise tier",
      "version": "1.0",
      "tags": ["enterprise", "tiered", "production"],
      "active": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### Get Scenario
```http
GET /v1/simulations/scenarios/{id}
```

Returns complete scenario configuration including model, inputs, and expected results.

#### Update Scenario
```http
PUT /v1/simulations/scenarios/{id}
```

Update scenario configuration. Validates any changes to inputs/model.

#### Delete Scenario
```http
DELETE /v1/simulations/scenarios/{id}
```

Soft deletes a scenario (marks as inactive).

### Simulation Execution

#### Run Single Simulation
```http
POST /v1/simulations/runs
```

Execute a simulation either by referencing a saved scenario or providing inline configuration.

**Request (with scenario ID):**
```json
{
  "scenarioId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q1 2024 Pricing Test",
  "description": "Testing Q1 pricing changes",
  "metadata": {
    "environment": "staging",
    "triggeredBy": "CI/CD",
    "commitHash": "abc123"
  }
}
```

**Request (inline scenario):**
```json
{
  "scenario": {
    "name": "Ad-hoc Test",
    "model": { /* pricing model */ },
    "inputs": { /* simulation inputs */ }
  },
  "name": "Quick Test Run"
}
```

**Response (202 Accepted):**
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "message": "Simulation queued for execution"
}
```

#### Get Run Status/Results
```http
GET /v1/simulations/runs/{id}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "tenantId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "scenarioId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q1 2024 Pricing Test",
  "status": "completed",
  "startedAt": "2024-01-15T10:31:00Z",
  "completedAt": "2024-01-15T10:31:02Z",
  "durationMs": 2000,
  "result": {
    "customerId": "cust_123",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-31",
    "lineItems": [
      {
        "metric": "api_calls",
        "quantity": 3500,
        "unitPrice": 0.074,
        "subtotal": 260.00,
        "description": "3500 units of api_calls"
      }
    ],
    "subtotal": 260.00,
    "credits": 0,
    "adjustments": 0,
    "tax": 0,
    "total": 260.00,
    "currency": "USD"
  },
  "comparison": {
    "passed": true,
    "differences": []
  },
  "passed": true
}
```

#### List Runs
```http
GET /v1/simulations/runs?scenarioId={id}&status=completed&runType=manual
```

### Batch Operations

#### Run Batch Simulations
```http
POST /v1/simulations/batch
```

Execute multiple scenarios in parallel.

**Request:**
```json
{
  "name": "Monthly Regression Test",
  "description": "Test all production pricing scenarios",
  "scenarioIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Response (202 Accepted):**
```json
{
  "batchId": "770e8400-e29b-41d4-a716-446655440000",
  "totalRuns": 3,
  "message": "Batch simulation with 3 runs queued for execution"
}
```

#### Get Batch Status
```http
GET /v1/simulations/batch/{id}
```

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "name": "Monthly Regression Test",
  "status": "completed",
  "totalRuns": 3,
  "completedRuns": 3,
  "failedRuns": 0,
  "startedAt": "2024-01-15T10:35:00Z",
  "completedAt": "2024-01-15T10:35:10Z",
  "summary": {
    "successRate": 100,
    "completed": 3,
    "failed": 0
  },
  "runs": [
    {
      "id": "run_1",
      "scenarioId": "scenario_1",
      "status": "completed",
      "passed": true
    },
    // ... more runs
  ]
}
```

## Pricing Models Supported

### Tiered Pricing
```json
{
  "model": "tiered",
  "currency": "USD",
  "tiers": [
    { "upTo": 100, "unitPrice": 0.10 },
    { "upTo": 500, "unitPrice": 0.08 },
    { "upTo": null, "unitPrice": 0.05 }
  ]
}
```

### Volume Pricing
```json
{
  "model": "volume",
  "currency": "USD",
  "tiers": [
    { "upTo": 100, "unitPrice": 0.10 },
    { "upTo": 500, "unitPrice": 0.07 },
    { "upTo": null, "unitPrice": 0.04 }
  ]
}
```

### Graduated Pricing
```json
{
  "model": "graduated",
  "currency": "USD",
  "tiers": [
    { "upTo": 100, "flatPrice": 10, "unitPrice": 0.05 },
    { "upTo": 500, "flatPrice": 30, "unitPrice": 0.03 },
    { "upTo": null, "flatPrice": 100, "unitPrice": 0.02 }
  ]
}
```

### Flat Rate
```json
{
  "model": "flat",
  "currency": "USD",
  "unitPrice": 0.05
}
```

### Package Pricing
```json
{
  "model": "package",
  "currency": "USD",
  "packageSize": 100,
  "unitPrice": 5.00
}
```

## Authentication & Authorization

All endpoints require:
- `X-Tenant-ID` header for tenant isolation
- `X-User-ID` header for audit trails
- Bearer token authentication (when enabled)

Scenarios and runs are scoped to tenants - users can only access their tenant's data.

## Use Cases

### 1. CI/CD Integration
```bash
# Run pricing regression tests in CI
curl -X POST https://api.stripemeter.com/v1/simulations/batch \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "name": "CI Build #123",
    "scenarioIds": ["prod_scenario_1", "prod_scenario_2"]
  }'
```

### 2. A/B Testing Pricing
```javascript
// Compare two pricing strategies
const scenarios = [
  { name: "Current Pricing", model: currentPricing },
  { name: "Proposed Pricing", model: proposedPricing }
];

for (const scenario of scenarios) {
  const response = await fetch('/v1/simulations/runs', {
    method: 'POST',
    headers: {
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ scenario })
  });
  
  const { runId } = await response.json();
  // Poll for results...
}
```

### 3. Customer Impact Analysis
```python
# Analyze how pricing changes affect specific customers
customers = ["cust_123", "cust_456", "cust_789"]
new_pricing = {...}

for customer_id in customers:
    response = requests.post(
        f"{API_URL}/v1/simulations/runs",
        headers={"X-Tenant-ID": tenant_id},
        json={
            "scenario": {
                "name": f"Impact on {customer_id}",
                "model": new_pricing,
                "inputs": {
                    "customerId": customer_id,
                    "periodStart": "2024-01-01",
                    "periodEnd": "2024-01-31",
                    "usageItems": get_customer_usage(customer_id)
                }
            }
        }
    )
```

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid scenario configuration",
  "details": "Price tiers must be in ascending order"
}
```

**404 Not Found:**
```json
{
  "error": "Scenario not found"
}
```

**422 Unprocessable Entity:**
```json
{
  "error": "Simulation failed",
  "details": "Invalid pricing model configuration"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "requestId": "req_123"
}
```

## Performance Considerations

- Simulations run asynchronously via queue workers
- Default concurrency: 5 simultaneous simulations per worker
- Typical execution time: < 100ms per simulation
- Batch operations process scenarios in parallel
- Results are cached for 24 hours

## Migration Guide

To migrate existing scenarios from the CLI to the API:

1. Export scenarios from CLI format
2. Transform to API schema format
3. POST to `/v1/simulations/scenarios`
4. Update CI/CD scripts to use API instead of CLI

## Future Enhancements

- WebSocket support for real-time simulation status
- Scheduled/recurring simulation runs
- Simulation result comparison UI
- Export results to CSV/Excel
- Integration with Stripe Test Mode for validation
- Machine learning-based pricing optimization suggestions

