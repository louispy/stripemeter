# MinIO profile for CSV/S3 parity tests

This profile runs a local MinIO instance for working with S3-compatible CSV parity and backfill workflows.

## Start MinIO

```bash
# Bring up postgres/redis + MinIO
docker compose --profile minio up -d

# Environment to use MinIO from services
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
export AWS_REGION=us-east-1
export S3_ENDPOINT=http://localhost:9000
export S3_BUCKET=stripemeter-backfill
export S3_FORCE_PATH_STYLE=true
```

## Upload a CSV and run backfill

```bash
# Upload sample CSV
mc alias set local http://localhost:9000 $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY
mc cp ./docs/simulator/examples/sample.csv local/$S3_BUCKET/sample.csv

# Trigger backfill via API using s3 URL reference (planned API support)
# s3://stripemeter-backfill/sample.csv
```

Notes:
- Buckets are auto-created by the `createbuckets` init container.
- Backfill worker reads from S3/MinIO when `sourceUrl` is provided.


