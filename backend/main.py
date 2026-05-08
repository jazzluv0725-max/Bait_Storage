from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import models, database, schemas

app = FastAPI(title="Bait Storage Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Bait Storage API is running"}

@app.get("/master/baits")
def get_baits(db: Session = Depends(get_db)):
    return db.query(models.Bait).all()

@app.get("/master/bait_specs")
def get_all_specs(db: Session = Depends(get_db)):
    return db.query(models.BaitSpec).all()

@app.get("/master/specs/{bait_id}")
def get_specs(bait_id: int, db: Session = Depends(get_db)):
    return db.query(models.BaitSpec).filter(models.BaitSpec.bait_id == bait_id).all()

@app.get("/master/warehouses")
def get_warehouses(db: Session = Depends(get_db)):
    return db.query(models.Warehouse).all()

@app.get("/master/vessels")
def get_vessels(db: Session = Depends(get_db)):
    return db.query(models.Vessel).all()

# Lot & Inventory Management
@app.post("/lots", response_model=schemas.LotResponse)
def create_lot(lot: schemas.LotBase, db: Session = Depends(get_db)):
    db_lot = models.Lot(**lot.model_dump())
    db.add(db_lot)
    try:
        db.commit()
        db.refresh(db_lot)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_lot

@app.post("/inbound/integrated")
def create_integrated_inbound(data: dict, db: Session = Depends(get_db)):
    try:
        # 1. Parse and Validate Lot
        lot_data = data.get("lot")
        # Sanitize dates
        for key in ["etd", "eta", "inbound_date"]:
            if lot_data.get(key) == "":
                lot_data[key] = None
                
        lot_in = schemas.LotBase(**lot_data)
        db_lot = models.Lot(**lot_in.model_dump())
        db.add(db_lot)
        
        # 2. Parse and create multiple items
        items_raw = data.get("items", [])
        for item_raw in items_raw:
            bait_id = item_raw.get("bait_id")
            if not bait_id:
                continue
                
            spec_val = item_raw.get("spec_id")
            # If spec_val is string (new size range), resolve or create it
            if isinstance(spec_val, str) and not spec_val.isdigit():
                db_spec = db.query(models.BaitSpec).filter(
                    models.BaitSpec.bait_id == bait_id,
                    models.BaitSpec.size_range == spec_val
                ).first()
                if not db_spec:
                    db_spec = models.BaitSpec(bait_id=bait_id, size_range=spec_val)
                    db.add(db_spec)
                    db.flush() # Get the new ID
                spec_id = db_spec.id
            else:
                spec_id = int(spec_val)
                
            # Create inventory item
            db_item = models.Inventory(
                lot_id=lot_in.id,
                spec_id=spec_id,
                warehouse_id=int(item_raw.get("warehouse_id")),
                initial_quantity=int(item_raw.get("initial_quantity")),
                current_quantity=int(item_raw.get("initial_quantity")),
                kg_per_box=float(item_raw.get("kg_per_box", 10.0)),
                unit_price_usd=float(item_raw.get("unit_price_usd")) if item_raw.get("unit_price_usd") else None,
                unit_price_krw=int(item_raw.get("unit_price_krw")) if item_raw.get("unit_price_krw") else None,
                warehouse_mgmt_no=item_raw.get("warehouse_mgmt_no")
            )
            db.add(db_item)
            
        db.commit()
        return {"message": f"Integrated inbound created with {len(items_raw)} items"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Data error: {str(e)}")

@app.get("/lots", response_model=List[schemas.LotResponse])
def get_lots(db: Session = Depends(get_db)):
    return db.query(models.Lot).all()

@app.post("/inventory")
def add_inventory(item_raw: dict, db: Session = Depends(get_db)):
    try:
        bait_id = int(item_raw.get("bait_id"))
        spec_val = item_raw.get("spec_id")
        
        # Resolve spec
        if isinstance(spec_val, str) and not spec_val.isdigit():
            db_spec = db.query(models.BaitSpec).filter(
                models.BaitSpec.bait_id == bait_id,
                models.BaitSpec.size_range == spec_val
            ).first()
            if not db_spec:
                db_spec = models.BaitSpec(bait_id=bait_id, size_range=spec_val)
                db.add(db_spec)
                db.flush()
            spec_id = db_spec.id
        else:
            spec_id = int(spec_val)
            
        db_item = models.Inventory(
            lot_id=item_raw.get("lot_id"),
            spec_id=spec_id,
            warehouse_id=int(item_raw.get("warehouse_id")),
            initial_quantity=int(item_raw.get("initial_quantity")),
            current_quantity=int(item_raw.get("initial_quantity")),
            kg_per_box=float(item_raw.get("kg_per_box", 10.0)),
            unit_price_usd=float(item_raw.get("unit_price_usd")) if item_raw.get("unit_price_usd") else None,
            unit_price_krw=int(item_raw.get("unit_price_krw")) if item_raw.get("unit_price_krw") else None,
            warehouse_mgmt_no=item_raw.get("warehouse_mgmt_no")
        )
        db.add(db_item)
        db.commit()
        return {"message": "Inventory added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/inventory", response_model=List[schemas.InventoryResponse])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()

@app.delete("/lots/{lot_id}")
def delete_lot(lot_id: str, db: Session = Depends(get_db)):
    db_lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not db_lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    db.delete(db_lot)
    db.commit()
    return {"message": "Lot and associated inventory deleted"}

@app.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Inventory).filter(models.Inventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted"}

# Outbound Endpoints
@app.get("/inventory/available", response_model=List[schemas.InventoryResponse])
def get_available_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).filter(models.Inventory.current_quantity > 0).all()

@app.get("/outbound", response_model=List[schemas.OutboundOrder])
def list_outbound_orders(db: Session = Depends(get_db)):
    return db.query(models.OutboundOrder).all()

@app.post("/outbound", response_model=schemas.OutboundOrder)
def create_outbound_order(order_in: schemas.OutboundOrderCreate, db: Session = Depends(get_db)):
    try:
        db_order = models.OutboundOrder(
            vessel_id=order_in.vessel_id,
            carrier_name=order_in.carrier_name,
            sub_vessel_id=order_in.sub_vessel_id,
            delivery_type=order_in.delivery_type,
            schedule_date=order_in.schedule_date,
            departure_point=order_in.departure_point,
            arrival_time=order_in.arrival_time,
            remarks=order_in.remarks,
            status=order_in.status
        )
        db.add(db_order)
        db.flush()
        
        for item in order_in.items:
            db_item = models.OutboundOrderItem(
                outbound_id=db_order.id,
                inventory_id=item.inventory_id,
                release_quantity=item.release_quantity
            )
            db.add(db_item)
            
            # If initially reserved, update reserved_quantity
            if order_in.status == "reserved":
                inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
                if inv:
                    available = inv.current_quantity - inv.reserved_quantity
                    if available < item.release_quantity:
                        raise Exception(f"Insufficient available stock for {inv.warehouse_mgmt_no or inv.lot_id}")
                    inv.reserved_quantity += item.release_quantity
        
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/outbound/{order_id}/status")
def update_outbound_status(order_id: int, status_update: dict, db: Session = Depends(get_db)):
    new_status = status_update.get("status")
    actual_date_str = status_update.get("actual_date")
    departure_point = status_update.get("departure_point")
    
    db_order = db.query(models.OutboundOrder).filter(models.OutboundOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_status = db_order.status
    if old_status == new_status and not actual_date_str and not departure_point:
        return db_order

    try:
        # Update arrival location if provided
        if departure_point is not None:
            db_order.departure_point = departure_point

        # If actual_date is provided, parse and save it
        if actual_date_str:
            from datetime import datetime
            db_order.actual_date = datetime.fromisoformat(actual_date_str.replace('Z', '+00:00'))

        # Business Logic for status transition
        if new_status == "dispatched":
            # If date not provided during dispatch, use current time
            if not db_order.actual_date:
                from datetime import datetime
                db_order.actual_date = datetime.now()
            
            for item in db_order.items:
                inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
                if inv:
                    if inv.current_quantity < item.release_quantity:
                        raise Exception(f"Insufficient stock for {inv.warehouse_mgmt_no}")
                    inv.current_quantity -= item.release_quantity
                    if old_status == "reserved":
                        inv.reserved_quantity -= item.release_quantity
        
        elif old_status == "dispatched" and new_status != "dispatched":
            # ROLLBACK from dispatched - clear actual_date
            db_order.actual_date = None
            for item in db_order.items:
                inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
                if inv:
                    inv.current_quantity += item.release_quantity
                    if new_status == "reserved":
                        inv.reserved_quantity += item.release_quantity

        elif new_status == "reserved" and old_status == "pending":
            for item in db_order.items:
                inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
                if inv:
                    available = inv.current_quantity - inv.reserved_quantity
                    if available < item.release_quantity:
                        raise Exception(f"Insufficient available stock for {inv.warehouse_mgmt_no or inv.lot_id}")
                    inv.reserved_quantity += item.release_quantity
                    
        elif new_status == "cancelled" and old_status == "reserved":
            for item in db_order.items:
                inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
                if inv:
                    inv.reserved_quantity -= item.release_quantity

        db_order.status = new_status
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/outbound/{order_id}")
def delete_outbound_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.OutboundOrder).filter(models.OutboundOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # If deleting a reserved/dispatched order, what should happen? 
    # For now, if reserved, we should release the reservation
    if db_order.status == "reserved":
        for item in db_order.items:
            inv = db.query(models.Inventory).filter(models.Inventory.id == item.inventory_id).first()
            if inv:
                inv.reserved_quantity -= item.release_quantity
                
    db.delete(db_order)
    db.commit()
    return {"message": "Outbound order deleted"}

@app.post("/outbound/allocate", response_model=schemas.AllocationResponse)
def allocate_inventory(req: schemas.RequisitionRequest, db: Session = Depends(get_db)):
    allocations = []
    shortages = []
    
    for req_item in req.items:
        remaining_qty = req_item.requested_qty
        
        # 1. Get available inventory for this bait & spec, ordered by inbound_date (FIFO)
        # We join with BaitSpec to ensure bait_id matches and Lot to get inbound_date
        items = db.query(models.Inventory).join(models.BaitSpec).join(models.Lot).filter(
            models.BaitSpec.bait_id == req_item.bait_id,
            models.Inventory.spec_id == req_item.spec_id,
            (models.Inventory.current_quantity - models.Inventory.reserved_quantity) > 0
        ).order_by(models.Lot.inbound_date.asc()).all()
        
        for inv in items:
            if remaining_qty <= 0:
                break
                
            available = inv.current_quantity - inv.reserved_quantity
            take = min(available, remaining_qty)
            
            allocations.append(schemas.AllocationResult(
                inventory_id=inv.id,
                qty=take,
                inventory=inv # Pydantic will convert this
            ))
            remaining_qty -= take
            
        # 2. If still has remaining_qty, it's a shortage
        if remaining_qty > 0:
            spec = db.query(models.BaitSpec).filter(models.BaitSpec.id == req_item.spec_id).first()
            bait_name = spec.bait.name if spec and spec.bait else "Unknown"
            size_range = spec.size_range if spec else "Unknown"
            
            shortages.append(schemas.ShortageResult(
                bait_id=req_item.bait_id,
                spec_id=req_item.spec_id,
                bait_name=bait_name,
                size_range=size_range,
                short_qty=remaining_qty
            ))
            
    return schemas.AllocationResponse(allocations=allocations, shortages=shortages)
