import sqlite3
import os

db_path = 'bait_storage.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE lot_id = 'ARM0421601A'")
    cursor.execute("DELETE FROM lots WHERE id = 'ARM0421601A'")
    conn.commit()
    print(f"Deleted rows: {cursor.rowcount}")
    conn.close()
else:
    print("DB not found")
