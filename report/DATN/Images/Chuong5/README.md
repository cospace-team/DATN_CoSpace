# Sơ đồ use-case hệ thống CoSpace

- `cospace-usecase.drawio` — file gốc gồm 5 trang, mở bằng draw.io Desktop hoặc app.diagrams.net để chỉnh sửa.
  1. Tổng quát  2. Phân hệ khách hàng  3. Phân hệ nhân viên  4. Phân hệ quản lý chi nhánh  5. Phân hệ quản trị hệ thống
- Các file `.png` được xuất ở độ phân giải 2x và **nhúng sẵn XML của sơ đồ**: mở trực tiếp file PNG bằng draw.io vẫn chỉnh sửa được.

Lệnh xuất lại ảnh sau khi sửa sơ đồ (thay `<i>` bằng số trang 1..5):

    "C:/Users/<user>/AppData/Local/Programs/draw.io/draw.io.exe" -x -f png -e -b 12 -s 2 -p <i> -o "uc-tongquat.png" "cospace-usecase.drawio"

## Sơ đồ hoạt động và sơ đồ trạng thái

Nguồn: `cospace-activity.drawio` (5 trang), `cospace-state.drawio` (2 trang). PNG nhúng sẵn XML nên mở bằng draw.io vẫn sửa được.
Các sơ đồ bám đúng luồng xử lý trong mã Backend; cách sinh lại xem `../../tools/uml/README.md`.

| PNG | Nhãn LaTeX | Nội dung |
|---|---|---|
| `act-1-datcho-online` | `fig:act_booking` | Đặt chỗ và thanh toán trực tuyến (khách hàng, hệ thống, cổng thanh toán) |
| `act-2-datcho-quay` | `fig:act_counter` | Đặt chỗ tại quầy và thanh toán tiền mặt |
| `act-3-checkin` | `fig:act_checkin` | Check-in và check-out, kể cả nợ dịch vụ gọi thêm và gói nhiều ngày |
| `act-4-huy-hoantien` | `fig:act_cancel` | Hủy đặt chỗ, tính hoàn tiền và duyệt hoàn tiền |
| `act-5-baotri` | `fig:act_maintenance` | Bảo trì không gian và xử lý các đơn bị ảnh hưởng |
| `st-1-dondatcho` | `fig:state_booking` | Trạng thái đơn đặt chỗ, khớp `BookingStateMachine` |
| `st-2-thanhtoan` | `fig:state_payment` | Trạng thái giao dịch thanh toán, lấy từ các chỗ gán `PaymentStatus` |
