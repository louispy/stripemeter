# StripeMeter Python SDK

Python SDK for StripeMeter usage metering and cost tracking.

## Installation

```bash
pip install stripemeter
```

## Quick Start

```python
from stripemeter import StripeMeterClient

# Initialize the client
client = StripeMeterClient(
    api_url="https://api.stripemeter.io",
    api_key="your_api_key",
    tenant_id="your_tenant_id"
)

# Track a usage event
response = client.track(
    metric="api_calls",
    customer_ref="cus_ABC123",
    quantity=100,
    meta={"endpoint": "/v1/search", "region": "us-east-1"}
)

# Track multiple events
events = [
    {
        "metric": "api_calls",
        "customer_ref": "cus_ABC123",
        "quantity": 50
    },
    {
        "metric": "storage_gb",
        "customer_ref": "cus_ABC123",
        "quantity": 2.5
    }
]
response = client.track_batch(events)

# Buffer events for batch sending
client.buffer(
    metric="api_calls",
    customer_ref="cus_ABC123",
    quantity=10
)
# Events are automatically flushed when buffer is full or after timeout
await client.flush()  # Manual flush

# Get current usage
usage = client.get_usage("cus_ABC123")

# Get cost projection
projection = client.get_projection("cus_ABC123")

# Close the client (flushes remaining events)
client.close()
```

## Async Support

```python
from stripemeter import AsyncStripeMeterClient

async def main():
    client = AsyncStripeMeterClient(
        api_url="https://api.stripemeter.io",
        api_key="your_api_key",
        tenant_id="your_tenant_id"
    )
    
    await client.track(
        metric="api_calls",
        customer_ref="cus_ABC123",
        quantity=100
    )
    
    await client.close()
```

## Configuration

- `api_url`: The StripeMeter API endpoint
- `api_key`: Your API key for authentication
- `tenant_id`: Your tenant ID
- `timeout`: Request timeout in seconds (default: 10)
- `retry_attempts`: Number of retry attempts (default: 3)
- `batch_size`: Maximum events in buffer before auto-flush (default: 100)

## Error Handling

```python
from stripemeter import StripeMeterError

try:
    response = client.track(metric="api_calls", customer_ref="cus_ABC123", quantity=100)
except StripeMeterError as e:
    print(f"Error: {e.message}, Status: {e.status_code}")
```
