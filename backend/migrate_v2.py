import sqlite3
import os

db_path = r'c:\Procurement_Project\Procurement\Bait_Storage\backend\bait_storage.db'

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Migrating database...")
    
    # 1. Inventory 테이블 컬럼 추가
    try:
        cursor.execute("ALTER TABLE inventory ADD COLUMN warehouse_mgmt_no TEXT")
        print("Added warehouse_mgmt_no to inventory table.")
    except sqlite3.OperationalError:
        print("warehouse_mgmt_no already exists in inventory.")
        
    # 2. OutboundOrder 테이블 컬럼 추가
    for col in [("departure_point", "TEXT"), ("arrival_time", "TEXT"), ("remarks", "TEXT")]:
        try:
            cursor.execute(f"ALTER TABLE outbound_orders ADD COLUMN {col[0]} {col[1]}")
            print(f"Added {col[0]} to outbound_orders table.")
        except sqlite3.OperationalError:
            print(f"{col[0]} already exists in outbound_orders.")
            
    # 3. 신규 테이블 생성 (OutboundOrderItem)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS outbound_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outbound_id INTEGER,
        inventory_id INTEGER,
        release_quantity INTEGER,
        FOREIGN KEY (outbound_id) REFERENCES outbound_orders (id),
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
    """)
    print("Ensured outbound_order_items table exists.")
    
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("DB file not found. Running init_db.py instead...")
    # DB가 없으면 그냥 init_db 실행
    os.system(r'c:\Procurement_Project\Procurement\Bait_Storage\backend\init_db.py')
