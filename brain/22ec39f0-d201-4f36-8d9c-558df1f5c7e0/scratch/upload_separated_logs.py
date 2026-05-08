import sys
import os

sys.path.append(r'c:\Procurement_Project\Procurement\spec_finder')
from notion_logger import post_to_notion

# 1. 구현 계획서 업로드
plan_title = "[계획서] 미끼 재고 관리 시스템 용어 변경 및 UI 개선"
plan_tags = ["Bait_Storage", "Plan", "UI/UX"]
plan_summary = (
    "미끼 재고 관리 시스템의 실무 최적화를 위한 구현 계획\n"
    "- BOX -> C/S 단위 일괄 변경\n"
    "- 불필요한 MT(톤수) 정보 제거\n"
    "- InboundPage 글래스모피즘 UI 적용\n"
    "- InventoryPage 매트릭스 뷰 가독성 개선 계획"
)
post_to_notion(plan_title, plan_tags, plan_summary)

# 2. 완료 보고서 업로드
walk_title = "[완료보고서] 미끼 재고 관리 시스템 용어 변경 및 UI 개선"
walk_tags = ["Bait_Storage", "Walkthrough", "UI/UX"]
walk_summary = (
    "계획된 모든 작업을 성공적으로 완료함\n"
    "1. 전사적 용어 통일: App.jsx, InboundPage.jsx, InventoryPage.jsx 내 'BOX' 단위를 'C/S'로 변경 완료.\n"
    "2. UI 고도화: InboundPage에 애니메이션 및 글래스모피즘 스타일 적용.\n"
    "3. 매트릭스 뷰 개선: 규격 및 합계 열 고정(Sticky) 기능 최적화 완료.\n"
    "4. 정보 다이어트: MT 표시를 제거하고 수량(C/S) 중심의 대시보드 구축 완료.\n"
    "5. KI 설정 완료: 모든 문서의 한국어 작성 및 자동 업로드 규칙 정립."
)
post_to_notion(walk_title, walk_tags, walk_summary)

print("계획서와 완료 보고서를 각각 별도 페이지로 업로드 완료했습니다.")
