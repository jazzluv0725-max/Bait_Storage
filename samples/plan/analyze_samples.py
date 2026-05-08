import pandas as pd
import json

excel_path = r"c:\Procurement_Project\Procurement\Bait_Storage\samples\plan\3. 신영 51호 본선 BAIT 선적계획 (2026.05.13).xls"
try:
    df = pd.read_excel(excel_path)
    
    analysis = {
        "columns": df.columns.tolist(),
        "sample_rows": df.iloc[4:20].fillna("").to_dict(orient="records")
    }
    
    with open("excel_analysis.json", "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    print("Excel analysis saved to excel_analysis.json")
except Exception as e:
    print(f"Error: {e}")
