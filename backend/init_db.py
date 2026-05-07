from database import engine, Base, SessionLocal
from models import Bait, BaitSpec, Warehouse, Vessel
import datetime

def init():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. 미끼 품목 등록
    baits_data = [
        {"name": "인니산 무로아지", "origin": "Indonesia", "unit_weight": 10.0},
        {"name": "인니산 밀크피쉬", "origin": "Indonesia", "unit_weight": 10.0},
        {"name": "멕시코산 정어리", "origin": "Mexico", "unit_weight": 15.0},
        {"name": "중국산 정어리", "origin": "China", "unit_weight": 10.0},
        {"name": "포크산 오징어", "origin": "Falkland", "unit_weight": 20.0},
    ]
    
    baits = {}
    for b_data in baits_data:
        b = Bait(**b_data)
        db.add(b)
        db.flush()
        baits[b.name] = b.id
        
    # 2. 규격 등록
    specs_data = [
        # 무로아지 & 밀크피쉬 규격
        {"bait_id": baits["인니산 무로아지"], "size_range": "51-60"},
        {"bait_id": baits["인니산 무로아지"], "size_range": "61-70"},
        {"bait_id": baits["인니산 무로아지"], "size_range": "71-80"},
        {"bait_id": baits["인니산 무로아지"], "size_range": "81-90"},
        {"bait_id": baits["인니산 무로아지"], "size_range": "91-100"},
        {"bait_id": baits["인니산 밀크피쉬"], "size_range": "51-60"},
        {"bait_id": baits["인니산 밀크피쉬"], "size_range": "61-70"},
        {"bait_id": baits["인니산 밀크피쉬"], "size_range": "71-80"},
        {"bait_id": baits["인니산 밀크피쉬"], "size_range": "81-90"},
        {"bait_id": baits["인니산 밀크피쉬"], "size_range": "91-100"},
        # 정어리 규격
        {"bait_id": baits["멕시코산 정어리"], "size_range": "110-130"},
        {"bait_id": baits["중국산 정어리"], "size_range": "110-130"},
    ]
    
    for s_data in specs_data:
        db.add(BaitSpec(**s_data))
        
    # 3. 창고 등록
    warehouses_data = [
        {"name": "삼성냉장", "category": "Imported"},
        {"name": "동영콜드", "category": "Imported"},
        {"name": "동원냉장", "category": "Imported"},
        {"name": "보성냉장", "category": "Cleared"},
        {"name": "한일냉장2공장", "category": "Cleared"},
    ]
    
    for w_data in warehouses_data:
        db.add(Warehouse(**w_data))
        
    # 4. 선박 등록
    vessels_data = [
        "신영 51호", "신영 52호", "신영 55호", "신영 56호",
        "PLX 501", "PLX 502", "PLX 503", "PLX 504", "PLX 506", "PLX 701"
    ]
    
    for v_name in vessels_data:
        db.add(Vessel(name=v_name))
        
    db.commit()
    db.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init()
