"""
Stripemeter Python Client
"""

import hashlib
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from threading import Timer
import asyncio

import requests
import backoff
from pydantic import BaseModel, Field

from .models import UsageEvent, IngestResponse, UsageResponse, ProjectionResponse
from .exceptions import StripemeterError


class StripemeterClient:
    """Synchronous Stripemeter client"""
    
    def __init__(
        self,
        api_url: str,
        tenant_id: str,
        api_key: Optional[str] = None,
        timeout: int = 10,
        retry_attempts: int = 3,
        batch_size: int = 100,
    ):
        self.api_url = api_url.rstrip("/")
        self.tenant_id = tenant_id
        self.api_key = api_key
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.batch_size = batch_size
        self.event_buffer: List[UsageEvent] = []
        self.flush_timer: Optional[Timer] = None
        
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Stripemeter-Python/1.0.0",
        })
        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"
    
    def _generate_idempotency_key(
        self,
        metric: str,
        customer_ref: str,
        ts: str,
        resource_id: Optional[str] = None,
    ) -> str:
        """Generate deterministic idempotency key"""
        # Extract period bucket (minute precision)
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        period_bucket = dt.strftime("%Y-%m-%dT%H:%M")
        
        components = [
            self.tenant_id,
            metric,
            customer_ref,
            resource_id or "default",
            period_bucket,
            str(int(time.time() * 1000)),
        ]
        
        hash_input = "|".join(components)
        hash_value = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        return f"evt_{hash_value}"
    
    @backoff.on_exception(
        backoff.expo,
        (requests.exceptions.RequestException, StripemeterError),
        max_tries=3,
        max_time=30,
        giveup=lambda e: isinstance(e, StripemeterError) and 400 <= e.status_code < 500,
    )
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Dict:
        """Make HTTP request with retry logic"""
        url = f"{self.api_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                pass
            raise StripemeterError(
                message=error_data.get("message", str(e)),
                status_code=e.response.status_code,
                data=error_data,
            )
        except requests.exceptions.RequestException as e:
            raise StripemeterError(
                message=str(e),
                status_code=0,
                data=None,
            )
    
    def track(
        self,
        metric: str,
        customer_ref: str,
        quantity: float,
        resource_id: Optional[str] = None,
        ts: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> IngestResponse:
        """Track a single usage event"""
        if ts is None:
            ts = datetime.utcnow().isoformat() + "Z"
        
        if idempotency_key is None:
            idempotency_key = self._generate_idempotency_key(
                metric, customer_ref, ts, resource_id
            )
        
        event = UsageEvent(
            tenant_id=self.tenant_id,
            metric=metric,
            customer_ref=customer_ref,
            quantity=quantity,
            resource_id=resource_id,
            ts=ts,
            meta=meta or {},
            idempotency_key=idempotency_key,
            source="sdk",
        )
        
        response = self._make_request(
            method="POST",
            endpoint="/v1/events/ingest",
            data={"events": [event.model_dump(exclude_none=True)]},
        )
        
        return IngestResponse(**response)
    
    def track_batch(self, events: List[Dict[str, Any]]) -> IngestResponse:
        """Track multiple usage events"""
        processed_events = []
        
        for event_data in events:
            ts = event_data.get("ts") or datetime.utcnow().isoformat() + "Z"
            idempotency_key = event_data.get("idempotency_key")
            
            if not idempotency_key:
                idempotency_key = self._generate_idempotency_key(
                    event_data["metric"],
                    event_data["customer_ref"],
                    ts,
                    event_data.get("resource_id"),
                )
            
            event = UsageEvent(
                tenant_id=self.tenant_id,
                metric=event_data["metric"],
                customer_ref=event_data["customer_ref"],
                quantity=event_data["quantity"],
                resource_id=event_data.get("resource_id"),
                ts=ts,
                meta=event_data.get("meta", {}),
                idempotency_key=idempotency_key,
                source="sdk",
            )
            processed_events.append(event.model_dump(exclude_none=True))
        
        response = self._make_request(
            method="POST",
            endpoint="/v1/events/ingest",
            data={"events": processed_events},
        )
        
        return IngestResponse(**response)
    
    def buffer(
        self,
        metric: str,
        customer_ref: str,
        quantity: float,
        resource_id: Optional[str] = None,
        ts: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ):
        """Buffer event for batch sending"""
        if ts is None:
            ts = datetime.utcnow().isoformat() + "Z"
        
        idempotency_key = self._generate_idempotency_key(
            metric, customer_ref, ts, resource_id
        )
        
        event = UsageEvent(
            tenant_id=self.tenant_id,
            metric=metric,
            customer_ref=customer_ref,
            quantity=quantity,
            resource_id=resource_id,
            ts=ts,
            meta=meta or {},
            idempotency_key=idempotency_key,
            source="sdk",
        )
        
        self.event_buffer.append(event)
        
        # Auto-flush if buffer is full
        if len(self.event_buffer) >= self.batch_size:
            self.flush()
        else:
            # Set timer to flush after 5 seconds
            if self.flush_timer:
                self.flush_timer.cancel()
            self.flush_timer = Timer(5.0, self.flush)
            self.flush_timer.start()
    
    def flush(self) -> Optional[IngestResponse]:
        """Flush buffered events"""
        if self.flush_timer:
            self.flush_timer.cancel()
            self.flush_timer = None
        
        if not self.event_buffer:
            return None
        
        events = self.event_buffer.copy()
        self.event_buffer.clear()
        
        try:
            response = self._make_request(
                method="POST",
                endpoint="/v1/events/ingest",
                data={"events": [e.model_dump(exclude_none=True) for e in events]},
            )
            return IngestResponse(**response)
        except Exception as e:
            # Re-add events to buffer on failure
            self.event_buffer = events + self.event_buffer
            raise
    
    def get_usage(self, customer_ref: str) -> UsageResponse:
        """Get current usage for a customer"""
        response = self._make_request(
            method="GET",
            endpoint="/v1/usage/current",
            params={
                "tenantId": self.tenant_id,
                "customerRef": customer_ref,
            },
        )
        return UsageResponse(**response)
    
    def get_projection(
        self,
        customer_ref: str,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None,
    ) -> ProjectionResponse:
        """Get cost projection for a customer"""
        data = {
            "tenantId": self.tenant_id,
            "customerRef": customer_ref,
        }
        if period_start:
            data["periodStart"] = period_start
        if period_end:
            data["periodEnd"] = period_end
        
        response = self._make_request(
            method="POST",
            endpoint="/v1/usage/projection",
            data=data,
        )
        return ProjectionResponse(**response)
    
    def close(self):
        """Close the client and flush remaining events"""
        self.flush()
        if self.flush_timer:
            self.flush_timer.cancel()
            self.flush_timer = None
        self.session.close()


class AsyncStripemeterClient:
    """Asynchronous Stripemeter client using asyncio"""
    
    def __init__(
        self,
        api_url: str,
        tenant_id: str,
        api_key: Optional[str] = None,
        timeout: int = 10,
        retry_attempts: int = 3,
        batch_size: int = 100,
    ):
        self.api_url = api_url.rstrip("/")
        self.tenant_id = tenant_id
        self.api_key = api_key
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.batch_size = batch_size
        self.event_buffer: List[UsageEvent] = []
        self.flush_task: Optional[asyncio.Task] = None
        
        # Note: In production, you'd use aiohttp instead
        self.sync_client = StripemeterClient(
            api_url=api_url,
            tenant_id=tenant_id,
            api_key=api_key,
            timeout=timeout,
            retry_attempts=retry_attempts,
            batch_size=batch_size,
        )
    
    async def track(self, **kwargs) -> IngestResponse:
        """Track a single usage event asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.sync_client.track, **kwargs)
    
    async def track_batch(self, events: List[Dict[str, Any]]) -> IngestResponse:
        """Track multiple usage events asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.sync_client.track_batch, events)
    
    async def get_usage(self, customer_ref: str) -> UsageResponse:
        """Get current usage for a customer asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.sync_client.get_usage, customer_ref)
    
    async def get_projection(
        self,
        customer_ref: str,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None,
    ) -> ProjectionResponse:
        """Get cost projection for a customer asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.sync_client.get_projection,
            customer_ref,
            period_start,
            period_end,
        )
    
    async def close(self):
        """Close the client"""
        if self.flush_task:
            self.flush_task.cancel()
        self.sync_client.close()
