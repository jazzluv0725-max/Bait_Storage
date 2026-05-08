import sys
import os

# notion_logger.py가 있는 경로를 path에 추가
sys.path.append(r'c:\Procurement_Project\Procurement\spec_finder')

from notion_logger import post_to_notion

title = "미끼 재고 관리 시스템 용어 변경 및 UI/UX 개선"
tags = ["Bait_Storage", "UI/UX", "개선", "한국어준수"]
summary = (
    "1. 전사적 용어 통일: 모든 'BOX' 단위를 실무 용어인 'C/S (Case)'로 변경 완료.\n"
    "2. 불필요 정보 제거: InventoryPage에서 MT(톤수) 계산 및 표시를 삭제하여 수량 중심 UI로 개편.\n"
    "3. 프리미엄 UI 구현: InboundPage에 글래스모피즘 디자인과 애니메이션을 적용하여 시각적 완성도 향상.\n"
    "4. 매트릭스 뷰 가독성 개선: 규격 및 합계 열 고정(Sticky) 기능을 강화하여 대규모 데이터 관리 편의성 증대.\n"
    "5. 사용자 선호도(KI) 준수 강화: 모든 아티팩트의 한글화 및 작업 완료 후 노션 업로드 프로세스 정립."
)

if post_to_notion(title, tags, summary):
    print("성공적으로 노션에 개발일지를 업로드했습니다.")
else:
    print("노션 업로드에 실패했습니다.")
