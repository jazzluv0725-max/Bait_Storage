from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class BaitBase(BaseModel):
    name: str
    origin: str
    unit_weight: float

class BaitSpecBase(BaseModel):
    bait_id: int
    size_range: str

class WarehouseBase(BaseModel):
    name: str
    category: str

class VesselBase(BaseModel):
    name: str
    fleet_no: Optional[str] = None

class LotBase(BaseModel):
    id: str
    supplier_name: Optional[str] = None
    exporter_info: Optional[str] = None
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    inbound_date: Optional[datetime] = None
    status: str

class InventoryBase(BaseModel):
    lot_id: str
    spec_id: int
    warehouse_id: int
    initial_quantity: int
    kg_per_box: Optional[float] = 10.0
    unit_price_usd: Optional[float] = None
    unit_price_krw: Optional[float] = None

class InventoryUpdate(BaseModel):
    reserved_quantity: int

class InventoryResponse(BaseModel):
    id: int
    lot_id: str
    spec_id: int
    warehouse_id: int
    initial_quantity: int
    current_quantity: int
    reserved_quantity: int
    kg_per_box: float
    unit_price_usd: Optional[float] = None
    unit_price_krw: Optional[float] = None
    
    class Config:
        from_attributes = True

class LotResponse(LotBase):
    class Config:
        from_attributes = True
