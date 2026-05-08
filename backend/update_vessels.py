import sqlite3

db_path = r'c:\Procurement_Project\Procurement\Bait_Storage\backend\bait_storage.db'
vessels = [
    '신영 51호', '신영 52호', '신영 55호', '신영 56호', 
    'PLX 501', 'PLX 502', 'PLX 503', 'PLX 504', 'PLX 505', 'PLX 506', 'PLX 701'
]

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

for v in vessels:
    # 중복 체크 후 삽입
    cursor.execute("SELECT id FROM vessels WHERE name = ?", (v,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO vessels (name) VALUES (?)", (v,))
        print(f"Added vessel: {v}")

conn.commit()
conn.close()
print("Vessel list update complete.")
