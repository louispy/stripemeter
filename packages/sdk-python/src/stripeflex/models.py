"""
Stripemeter data models
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class UsageEvent(BaseModel):
    """Usage event model"""
    tenant_id: str = Field(..., alias="tenantId")
    metric: str
    customer_ref: str = Field(..., alias="customerRef")
    quantity: float
    resource_id: Optional[str] = Field(None, alias="resourceId")
    ts: str
    meta: Dict[str, Any] = Field(default_factory=dict)
    idempotency_key: Optional[str] = Field(None, alias="idempotencyKey")
    source: str = "sdk"
    
    class Config:
        populate_by_name = True


class IngestResponse(BaseModel):
    """Response from event ingestion"""
    accepted: int
    duplicates: int
    errors: Optional[List[Dict[str, Any]]] = None


class MetricUsage(BaseModel):
    """Individual metric usage"""
    name: str
    current: float
    limit: Optional[float] = None
    unit: str


class Alert(BaseModel):
    """Usage alert"""
    type: str
    message: str
    severity: str


class UsageResponse(BaseModel):
    """Current usage response"""
    customer_ref: str = Field(..., alias="customerRef")
    period: Dict[str, str]
    metrics: List[MetricUsage]
    alerts: List[Alert]
    
    class Config:
        populate_by_name = True


class LineItem(BaseModel):
    """Invoice line item"""
    metric: str
    quantity: float
    unit_price: float = Field(..., alias="unitPrice")
    total: float
    
    class Config:
        populate_by_name = True


class Freshness(BaseModel):
    """Data freshness information"""
    last_update: str = Field(..., alias="lastUpdate")
    staleness: int
    
    class Config:
        populate_by_name = True


class ProjectionResponse(BaseModel):
    """Cost projection response"""
    customer_ref: str = Field(..., alias="customerRef")
    period_start: str = Field(..., alias="periodStart")
    period_end: str = Field(..., alias="periodEnd")
    line_items: List[LineItem] = Field(..., alias="lineItems")
    subtotal: float
    credits: float
    total: float
    currency: str
    freshness: Freshness
    
    class Config:
        populate_by_name = True
