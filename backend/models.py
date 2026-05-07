from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class OrderStatus(enum.Enum):
    PENDING = "pending"
    RESERVED = "reserved"
    DISPATCHED = "dispatched"
    CANCELLED = "cancelled"

class Bait(Base):
    __tablename__ = "baits"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    origin = Column(String)
    unit_weight = Column(Float)  # 10kg, 15kg 등

class BaitSpec(Base):
    __tablename__ = "bait_specs"
    id = Column(Integer, primary_key=True, index=True)
    bait_id = Column(Integer, ForeignKey("baits.id"))
    size_range = Column(String)  # 51-60, 110-130 등
    
    bait = relationship("Bait")

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)  # 'Imported' (수입품), 'Cleared' (통관제품)

class Vessel(Base):
    __tablename__ = "vessels"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    fleet_no = Column(String)

class Lot(Base):
    __tablename__ = "lots"
    id = Column(String, primary_key=True)  # BL Number
    supplier_name = Column(String)
    exporter_info = Column(String)
    etd = Column(DateTime)
    eta = Column(DateTime)
    inbound_date = Column(DateTime) # 실제 입고일 추가
    status = Column(String)  # In-transit, Arrived, Cleared
    
    inventory_items = relationship("Inventory", back_populates="lot", cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(String, ForeignKey("lots.id"))
    spec_id = Column(Integer, ForeignKey("bait_specs.id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    initial_quantity = Column(Integer)  # Box 단위
    current_quantity = Column(Integer)
    reserved_quantity = Column(Integer, default=0)
    kg_per_box = Column(Float, default=10.0) # 박스당 중량 (10, 15, 20kg 등)
    unit_price_usd = Column(Float, nullable=True) # 단가 (USD)
    unit_price_krw = Column(Integer, nullable=True) # 단가 (KRW)
    
    lot = relationship("Lot", back_populates="inventory_items")
    spec = relationship("BaitSpec")
    warehouse = relationship("Warehouse")

class OutboundOrder(Base):
    __tablename__ = "outbound_orders"
    id = Column(Integer, primary_key=True, index=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id"), nullable=True)
    carrier_name = Column(String, nullable=True)  # 운반선명
    sub_vessel_id = Column(Integer, ForeignKey("vessels.id"), nullable=True) # 운반선 하위 수령 선박
    delivery_type = Column(String)  # 'Direct' (본선입항), 'Carrier' (운반선탁송)
    schedule_date = Column(DateTime)
    status = Column(String, default="pending") # pending, reserved, dispatched
    
    vessel = relationship("Vessel", foreign_keys=[vessel_id])
    sub_vessel = relationship("Vessel", foreign_keys=[sub_vessel_id])
