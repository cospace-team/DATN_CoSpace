# Sơ đồ use-case hệ thống CoSpace

- `cospace-usecase.drawio` — file gốc gồm 5 trang, mở bằng draw.io Desktop hoặc app.diagrams.net để chỉnh sửa.
  1. Tổng quát  2. Phân hệ khách hàng  3. Phân hệ nhân viên  4. Phân hệ quản lý chi nhánh  5. Phân hệ quản trị hệ thống
- Các file `.png` được xuất ở độ phân giải 2x và **nhúng sẵn XML của sơ đồ**: mở trực tiếp file PNG bằng draw.io vẫn chỉnh sửa được.

Lệnh xuất lại ảnh sau khi sửa sơ đồ (thay `<i>` bằng số trang 1..5):

    "C:/Users/<user>/AppData/Local/Programs/draw.io/draw.io.exe" -x -f png -e -b 12 -s 2 -p <i> -o "uc-tongquat.png" "cospace-usecase.drawio"
