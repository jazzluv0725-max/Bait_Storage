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
                unit_price_krw=int(item_raw.get("unit_price_krw")) if item_raw.get("unit_price_krw") else None
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
            unit_price_krw=int(item_raw.get("unit_price_krw")) if item_raw.get("unit_price_krw") else None
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
