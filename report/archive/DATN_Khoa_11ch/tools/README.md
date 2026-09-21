# Công cụ hỗ trợ báo cáo

Các công cụ này sinh những phần của báo cáo trực tiếp từ mã nguồn, để số liệu và sơ đồ không lệch khỏi hệ thống.

| Công cụ | Kết quả | Cách chạy |
|---|---|---|
| `uml/` | Sơ đồ lớp, tuần tự, hoạt động, trạng thái, kiến trúc và ERD trong `Images/` | Xem `uml/README.md` |
| `gen_api_appendix.py` | `Outro/BangAPI.tex`, bảng danh mục điểm cuối API của Phụ lục B (đọc các lớp controller) | `python tools/gen_api_appendix.py` trong thư mục `report/DATN` |

Chạy lại `gen_api_appendix.py` sau khi thêm, xóa hoặc đổi đường dẫn của điểm cuối; tệp sinh ra được `\input` trong `Outro/PhuLuc.tex`.

## Biên dịch báo cáo

```bash
cd report/DATN
pdflatex main
pdflatex main
pdflatex main
```

Chạy ba lần để mục lục, danh sách hình và tham chiếu chéo được cập nhật. Khi nộp bản chính thức, mở `preamble.tex` và đổi `\hienghichutrue` thành `\hienghichufalse` để ẩn toàn bộ khung hướng dẫn màu xám.
