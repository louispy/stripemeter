# Backfill & Event Replay System (deprecated endpoints)

The Backfill & Event Replay System allows you to import historical usage events into StripeMeter for processing and aggregation. This system is designed to handle bulk imports safely while maintaining data integrity and watermark consistency.

## Features

- **Idempotent Bulk Import**: Supports both JSON and CSV formats
- **Watermark-Safe Replay**: Maintains aggregation watermarks during historical imports
- **Status Tracking**: Real-time monitoring of backfill operations
- **Audit Trail**: Complete history of all backfill operations
- **Late Event Handling**: Automatically routes late events to adjustments
- **S3/MinIO Support**: For large file uploads (planned)

## API Endpoints

> Note: In v0.3.0, bulk reprocessing has moved to `POST /v1/replay` with dry-run/apply and watermark/cursor semantics. The `/v1/events/backfill` endpoints below are deprecated and may be removed in a future minor release.

### POST /v1/events/backfill (deprecated)

Submit a backfill operation to import historical events.

**Request Body:**
```json
{
  "tenantId": "string",
  "metric": "string",
  "customerRef": "string (optional)",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD (optional, defaults to periodStart)",
  "reason": "string",
  "events": [
    {
      "tenantId": "string",
      "metric": "string",
      "customerRef": "string",
      "resourceId": "string (optional)",
      "quantity": "number",
      "ts": "ISO 8601 datetime",
      "meta": "object (optional)",
      "idempotencyKey": "string (optional)",
      "source": "string (optional)"
    }
  ],
  "csvData": "string (alternative to events)"
}
```

**Response:**
```json
{
  "operationId": "uuid",
  "status": "pending",
  "message": "Backfill operation queued successfully"
}
```

### GET /v1/events/backfill/:operationId (deprecated)

Get the status and details of a specific backfill operation.

**Response:**
```json
{
  "id": "uuid",
  "tenantId": "string",
  "metric": "string",
  "customerRef": "string",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "status": "pending|processing|completed|failed|cancelled",
  "reason": "string",
  "actor": "string",
  "totalEvents": "number",
  "processedEvents": "number",
  "failedEvents": "number",
  "duplicateEvents": "number",
  "sourceType": "json|csv|api",
  "errorMessage": "string (if failed)",
  "startedAt": "ISO 8601 datetime",
  "completedAt": "ISO 8601 datetime",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### GET /v1/events/backfill (deprecated)

List backfill operations with optional filtering.

**Query Parameters:**
- `tenantId` (optional): Filter by tenant
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "operations": [
    {
      "id": "uuid",
      "tenantId": "string",
      "metric": "string",
      "status": "string",
      // ... other fields
    }
  ],
  "total": "number"
}
```

## Data Formats

### JSON Format

Events can be provided as a JSON array in the `events` field:

```json
{
  "tenantId": "my-tenant",
  "metric": "api_calls",
  "periodStart": "2024-01-01",
  "reason": "Historical data import",
  "events": [
    {
      "tenantId": "my-tenant",
      "metric": "api_calls",
      "customerRef": "customer-1",
      "quantity": 100,
      "ts": "2024-01-15T10:00:00Z",
      "source": "import"
    }
  ]
}
```

### CSV Format

Events can be provided as CSV data in the `csvData` field:

```csv
tenantId,metric,customerRef,quantity,ts,source
my-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import
my-tenant,api_calls,customer-2,200,2024-01-16T10:00:00Z,import
```

**Supported CSV column names:**
- `tenantId` or `tenant_id`
- `metric`
- `customerRef` or `customer_ref`
- `resourceId` or `resource_id`
- `quantity`
- `ts` or `timestamp` or `created_at`
- `source`
- `meta` (JSON string)
- `idempotencyKey` or `idempotency_key`

## Operation Status

Backfill operations progress through the following states:

1. **pending**: Operation created and queued
2. **processing**: Worker is processing the events
3. **completed**: All events processed successfully
4. **failed**: Operation failed with errors
5. **cancelled**: Operation was cancelled (e.g., timeout)

## Watermark Safety

The backfill system maintains watermark safety by:

1. **Period Filtering**: Only events within the specified period are processed
2. **Late Event Detection**: Events that arrive after the watermark are handled as adjustments
3. **Aggregation Updates**: Counters are recalculated after backfill completion
4. **Idempotency**: Duplicate events are safely ignored

## Error Handling

### Validation Errors

The API validates:
- Required fields are present
- Date formats are correct (YYYY-MM-DD for periods, ISO 8601 for timestamps)
- Event data matches the expected schema
- At least one of `events` or `csvData` is provided

### Processing Errors

During processing:
- Invalid events are skipped and counted as failed
- Database errors are logged and may cause operation failure
- Partial failures are tracked in the operation status

### Large Data Handling

- Direct data storage is limited (default: 1MB)
- Larger datasets require S3/MinIO upload (planned feature)
- Batch processing prevents memory exhaustion

## Best Practices

1. **Batch Size**: Keep individual backfill operations reasonable in size
2. **Period Boundaries**: Use appropriate period ranges to avoid processing too much data
3. **Monitoring**: Check operation status regularly for long-running imports
4. **Error Handling**: Review failed events and retry if necessary
5. **Data Quality**: Validate your source data before submission

## Examples

### Basic JSON Backfill

```bash
curl -X POST "https://api.stripemeter.com/v1/events/backfill" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "my-tenant",
    "metric": "api_calls",
    "periodStart": "2024-01-01",
    "reason": "Historical data import",
    "events": [
      {
        "tenantId": "my-tenant",
        "metric": "api_calls",
        "customerRef": "customer-1",
        "quantity": 100,
        "ts": "2024-01-15T10:00:00Z",
        "source": "import"
      }
    ]
  }'
```

### CSV Backfill

```bash
curl -X POST "https://api.stripemeter.com/v1/events/backfill" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "my-tenant",
    "metric": "api_calls",
    "periodStart": "2024-01-01",
    "reason": "CSV import",
    "csvData": "tenantId,metric,customerRef,quantity,ts,source\nmy-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import"
  }'
```

### Check Operation Status

```bash
curl -X GET "https://api.stripemeter.com/v1/events/backfill/operation-uuid" \
  -H "x-api-key: your-api-key"
```

## Configuration

### Environment Variables

- `MAX_DIRECT_BACKFILL_SIZE`: Maximum size for direct data storage (default: 1MB)
- `BACKFILL_BATCH_SIZE`: Batch size for processing events (default: 100)
- `BACKFILL_WORKER_CONCURRENCY`: Number of concurrent backfill workers (default: 2)

### S3/MinIO Configuration (Planned)

- `AWS_ACCESS_KEY_ID`: S3 access key
- `AWS_SECRET_ACCESS_KEY`: S3 secret key
- `AWS_REGION`: S3 region
- `S3_ENDPOINT`: Custom S3 endpoint (for MinIO)
- `S3_BUCKET`: S3 bucket name
- `S3_FORCE_PATH_STYLE`: Use path-style URLs

## Monitoring and Alerts

The system provides monitoring through:

1. **Operation Status**: Real-time status updates
2. **Progress Tracking**: Events processed, failed, and duplicated
3. **Error Logging**: Detailed error messages for failed operations
4. **Metrics**: Prometheus metrics for operation counts and durations

## Troubleshooting

### Common Issues

1. **Operation Stuck in Processing**: Check worker logs and consider cancelling/recreating
2. **High Failure Rate**: Validate source data format and content
3. **Memory Issues**: Reduce batch size or split large operations
4. **Timeout Errors**: Check worker configuration and resource limits

### Debug Information

- Check operation details via GET endpoint
- Review worker logs for processing errors
- Validate source data format
- Ensure proper authentication and permissions
