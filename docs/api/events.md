# API — Events (v0.2.0)

GET /v1/events

Query params
- tenantId (string, required, UUID)
- metric (string, optional)
- customerRef (string, optional)
- source (string, optional)
- startTime (ISO date-time, optional)
- endTime (ISO date-time, optional)
- limit (int, default 25)
- offset (int, default 0)
- sort (string, optional; one of metric|customerRef|source|ts; default ts)
- sortDir (string, optional; one of asc|desc; default desc)

Response
```json
{
  "total": 0,
  "events": [
    {
      "id": "<idempotencyKey>",
      "tenantId": "<uuid>",
      "metric": "requests",
      "customerRef": "cus_123",
      "resourceId": "res_1",
      "quantity": 1,
      "timestamp": "2025-01-16T14:30:00.000Z",
      "source": "http",
      "meta": "{\"endpoint\":\"/v1/search\"}"
    }
  ]
}
```

Examples
```bash
curl -s "http://localhost:3000/v1/events?tenantId=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d&limit=25" | jq
curl -s "http://localhost:3000/v1/events?tenantId=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d&metric=requests&customerRef=cus_123&startTime=2025-01-01T00:00:00Z&endTime=2025-02-01T00:00:00Z&sort=ts&sortDir=desc" | jq
```

Notes
- The `id` field is the event idempotency key.
- The `meta` field is returned as a JSON string for consistency.
- Pagination uses `limit` and `offset`; always check `total` for client-side paging.
- For ingestion, use `POST /v1/events/ingest`.
