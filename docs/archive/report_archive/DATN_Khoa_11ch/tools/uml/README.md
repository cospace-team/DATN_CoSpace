# Công cụ sinh sơ đồ cho báo cáo

Các script này sinh toàn bộ sơ đồ trong `report/DATN/Images/` từ mã nguồn của dự án, nên khi mã hoặc lược đồ CSDL đổi thì chạy lại
để sơ đồ theo kịp. Mỗi file PNG nhúng sẵn XML của sơ đồ, nên vẫn có thể mở bằng draw.io để chỉnh tay.

**Yêu cầu:** Python 3.10 trở lên và draw.io Desktop. Nếu draw.io không nằm ở vị trí mặc định, đặt biến môi trường `DRAWIO_EXE`
trỏ tới file thực thi của nó. Chạy các lệnh dưới đây trong thư mục này.

| Lệnh | Kết quả |
|---|---|
| `python build_class.py [cd03 ...]` | 11 sơ đồ lớp: `Images/Chuong6/cd-*.png` và `cospace-class.drawio` |
| `python build_sequence.py [tiền tố]` | 14 sơ đồ tuần tự: `Images/Chuong6/sd-*.png` và `cospace-sequence.drawio` |
| `python build_sequence.py race` | Hình tương tranh của Chương 3: `Images/Chuong3/race-condition.png` |
| `python build_erd.py [erd04]` | 7 trang ERD: `Images/Chuong6/erd-*.png` và `cospace-erd.drawio` |
| `python build_grid.py [activity, state, arch, hoặc tiền tố]` | Sơ đồ hoạt động và trạng thái (`Chuong5`), kiến trúc (`Chuong6`, riêng `arch-phantang` ở `Chuong3`) |

## Nội dung nằm ở đâu

| Loại sơ đồ | Sửa ở đâu |
|---|---|
| Sơ đồ tuần tự | `sd/*.mmd` (tập con của Mermaid `sequenceDiagram`: `participant`, `actor`, `->>`, `-->>`, `Note`, `alt/else/opt/loop`) |
| Sơ đồ lớp | `make_class.py` (thuộc tính, phương thức và quan hệ của từng lớp, lấy từ entity và service) |
| ERD | Không cần sửa tay: `make_erd.py` đọc `BE/src/main/resources/db/migration/V1__baseline.sql`. Chỉ khi thêm bảng mới thì thêm vào `MODULE_OF` |
| Sơ đồ hoạt động, trạng thái, kiến trúc | `make_activity.py`, `make_state.py`, `make_arch.py` (mỗi nút đặt theo cột và hàng trên lưới) |

## Vì sao làm như vậy

- **Sơ đồ tuần tự** dùng bộ vẽ riêng (`uml_seq.py`) đọc file `.mmd`, vì draw.io bỏ qua cấu hình `init` của Mermaid nên không thu hẹp
  được bề ngang; nhãn tự xuống dòng và khung `alt/opt/loop` chỉ bao các lifeline liên quan để đọc được trên khổ A4.
- **Sơ đồ lớp và ERD** dùng bước dàn trang ELK của draw.io. Draw.io đo kích thước ô theo độ dài chuỗi nhãn HTML nên ELK làm phình ô;
  vì vậy script dàn trang trên bản chỉ có tên, rồi gắn lại nhãn đầy đủ (`uml_class.py`, hàm `finalize`).
- **Sơ đồ hoạt động, trạng thái, kiến trúc** dùng bộ dựng lưới `uml_grid.py`: mỗi nút một ô lưới, cạnh vuông góc do draw.io tự đi.
  Khi thiết kế cần chừa các hàng và cột mà cạnh đi qua để không cắt xuyên các ô khác.
- Bước định tuyến `--layout libavoid` của draw.io không chạy được trên bản Desktop hiện tại (treo ngay cả với sơ đồ 3 hộp), nên không dùng.

## Sơ đồ chỉ vẽ những gì đã kiểm chứng trong mã

Ví dụ: giao diện chỉ dùng Supabase cho xác thực (không Storage, không WebSocket), sơ đồ mặt bằng SVG lưu trong PostgreSQL, và
trợ lý ảo trả kết quả qua luồng SSE. Khi mã đổi, cần đối chiếu lại các sơ đồ tay (hoạt động, trạng thái, kiến trúc, lớp, tuần tự);
riêng ERD tự cập nhật theo SQL.
