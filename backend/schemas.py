from pydantic import BaseModel
from typing import List, Optional
import datetime

# Master Data Schemas
class BaitBase(BaseModel):
    name: str
    origin: str
    unit_weight: float

class Bait(BaitBase):
    id: int
    class Config:
        from_attributes = True

class BaitSpecBase(BaseModel):
    bait_id: int
    size_range: str

class BaitSpec(BaitSpecBase):
    id: int
    bait: Optional[Bait] = None
    class Config:
        from_attributes = True

class WarehouseBase(BaseModel):
    name: str
    category: str

class Warehouse(WarehouseBase):
    id: int
    class Config:
        from_attributes = True

class VesselBase(BaseModel):
    name: str
    fleet_no: Optional[str] = None

class Vessel(VesselBase):
    id: int
    class Config:
        from_attributes = True

# Inventory Schemas
class LotBase(BaseModel):
    id: str
    supplier_name: Optional[str] = None
    exporter_info: Optional[str] = None
    etd: Optional[datetime.datetime] = None
    eta: Optional[datetime.datetime] = None
    inbound_date: Optional[datetime.datetime] = None
    status: str

class LotResponse(LotBase):
    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    lot_id: str
    spec_id: int
    warehouse_id: int
    initial_quantity: int
    current_quantity: int
    reserved_quantity: int
    kg_per_box: float = 10.0
    unit_price_usd: Optional[float] = None
    unit_price_krw: Optional[int] = None
    warehouse_mgmt_no: Optional[str] = None

class Inventory(InventoryBase):
    id: int
    spec: Optional[BaitSpec] = None
    warehouse: Optional[Warehouse] = None
    lot: Optional[LotResponse] = None

    class Config:
        from_attributes = True

class InventoryResponse(Inventory):
    pass

# Outbound Schemas
class OutboundOrderItemBase(BaseModel):
    inventory_id: int
    release_quantity: int

class OutboundOrderItemCreate(OutboundOrderItemBase):
    pass

class OutboundOrderItem(OutboundOrderItemBase):
    id: int
    inventory: Optional[Inventory] = None
    
    class Config:
        from_attributes = True

class OutboundOrderBase(BaseModel):
    vessel_id: Optional[int] = None
    carrier_name: Optional[str] = None
    sub_vessel_id: Optional[int] = None
    delivery_type: str # Direct, Carrier
    schedule_date: datetime.datetime
    departure_point: Optional[str] = None
    arrival_time: Optional[str] = None
    remarks: Optional[str] = None
    status: str = "pending"
    actual_date: Optional[datetime.datetime] = None

class OutboundOrderCreate(OutboundOrderBase):
    items: List[OutboundOrderItemCreate]

class OutboundOrder(OutboundOrderBase):
    id: int
    vessel: Optional[Vessel] = None
    sub_vessel: Optional[Vessel] = None
    items: List[OutboundOrderItem] = []

    class Config:
        from_attributes = True

# Requisition & Allocation Schemas
class RequisitionItem(BaseModel):
    bait_id: int
    spec_id: int
    requested_qty: int

class RequisitionRequest(BaseModel):
    vessel_id: Optional[int] = None
    items: List[RequisitionItem]

class AllocationResult(BaseModel):
    inventory_id: int
    qty: int
    inventory: Optional[Inventory] = None # For frontend display

class ShortageResult(BaseModel):
    bait_id: int
    spec_id: int
    bait_name: str
    size_range: str
    short_qty: int

class AllocationResponse(BaseModel):
    allocations: List[AllocationResult]
    shortages: List[ShortageResult]
