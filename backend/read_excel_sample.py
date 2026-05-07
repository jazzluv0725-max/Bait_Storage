import pandas as pd
import sys

file_path = r"c:\Procurement_Project\Procurement\Bait_Storage\samples\08. BAIT 재고량 및 탁송계획 2026.04.27 무로아지 1cont 구입 후.xlsx"

try:
    # Read all sheets
    xls = pd.ExcelFile(file_path)
    print(f"Sheets: {xls.sheet_names}")
    
    for sheet_name in xls.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        df = pd.read_excel(xls, sheet_name=sheet_name)
        print(df.head(20).to_string())
except Exception as e:
    print(f"Error: {e}")
