import sys
import os
from pathlib import Path
import pypdf

# Configure UTF-8 output for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# Directory containing reference reports
BASE_DIR = Path(r"d:\DA\refer report&slide\report")

PDF_TARGETS = [
    {
        "id": 1,
        "name": "HK252-DATN-300_QuanLyDaoTao_CoChiPhanBien.pdf",
        "title": "Phát triển hệ thống Quản lý đào tạo trường Đại học (Phản biện: TS. Đinh Thị Bích Chi)",
        "priority": True,
        "pages_to_extract": list(range(1, 16)), # Pages 1-15 as requested
        "extra_chapter1_pages": list(range(21, 28)), # Chapter 1 (Tổng quan) is on pages 21-27
        "sections": {
            "cam_doan": [3],
            "cam_on": [4],
            "tom_tat": [5],
            "chuong_1": list(range(21, 28))
        }
    },
    {
        "id": 2,
        "name": "HK252-DATN-TraCuuVanBanPhapLuat.pdf",
        "title": "Hệ thống Tra cứu và Tư vấn Văn bản Pháp luật",
        "priority": False,
        "pages_to_extract": list(range(1, 16)),
        "extra_chapter1_pages": [],
        "sections": {
            "cam_doan": [2],
            "cam_on": [3],
            "tom_tat": [4],
            "chuong_1": list(range(12, 16)) # Chapter 1 starts at page 12
        }
    },
    {
        "id": 3,
        "name": "HK252-DATN-AgriLink_TrongCayTuXa.pdf",
        "title": "Ứng dụng AgriLink: Trồng cây từ xa nâng cao trải nghiệm khách hàng",
        "priority": False,
        "pages_to_extract": list(range(1, 16)),
        "extra_chapter1_pages": list(range(16, 25)), # Chapter 1 continues to page 24
        "sections": {
            "cam_doan": [2],
            "cam_on": [3],
            "tom_tat": [4],
            "chuong_1": list(range(13, 25)) # Chapter 1 is pages 13-24
        }
    }
]

def extract_pdf_pages(file_path, page_numbers):
    reader = pypdf.PdfReader(file_path)
    total_pages = len(reader.pages)
    extracted = {}
    for p in page_numbers:
        if 1 <= p <= total_pages:
            extracted[p] = reader.pages[p - 1].extract_text() or ""
        else:
            extracted[p] = f"[Page {p} out of range (Total: {total_pages})]"
    return extracted

def main():
    print("=" * 90)
    print("DATN REFERENCE REPORTS - STYLE EXTRACTION TOOL")
    print("=" * 90)
    
    for item in PDF_TARGETS:
        file_path = BASE_DIR / item["name"]
        print("\n" + "#" * 90)
        print(f"[{item['id']}] {item['name']}")
        print(f"Title: {item['title']}")
        if item.get("priority"):
            print(">>> PRIORITY REPORT (Same Advisor: Co Chi) <<<")
        print("#" * 90)
        
        if not file_path.exists():
            print(f"File not found: {file_path}")
            continue
            
        print(f"\n--- EXTRACTING PAGES 1-15 FOR: {item['name']} ---")
        p1_15_text = extract_pdf_pages(file_path, item["pages_to_extract"])
        for p, text in p1_15_text.items():
            print(f"\n{'='*30} [PAGE {p}] {'='*30}")
            print(text.strip())
            
        if item["extra_chapter1_pages"]:
            print(f"\n{'#'*30} [NOTE: CHƯƠNG 1 (TỔNG QUAN / GIỚI THIỆU) NẰM Ở TRANG {item['extra_chapter1_pages'][0]}-{item['extra_chapter1_pages'][-1]}] {'#'*30}")
            extra_text = extract_pdf_pages(file_path, item["extra_chapter1_pages"])
            for p, text in extra_text.items():
                print(f"\n{'='*30} [PAGE {p} - CHƯƠNG 1] {'='*30}")
                print(text.strip())

if __name__ == "__main__":
    main()
