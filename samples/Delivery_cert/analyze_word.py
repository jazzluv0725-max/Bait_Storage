import win32com.client
import os

word_path = r"c:\Procurement_Project\Procurement\Bait_Storage\samples\Delivery_cert\3. 출고증 (신영 51호 출어용), 2026.03.00. - NO.16~18.doc"
output_path = "word_analysis.txt"

try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(word_path)
    content = doc.Content.Text
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    doc.Close()
    word.Quit()
    print(f"Word content saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
