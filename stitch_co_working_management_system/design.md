---
name: CoSpace Management System
colors:
  primary: "#4F46E5"
  primary-hover: "#4338CA"
  secondary: "#64748B"
  surface: "#FFFFFF"
  surface-variant: "#F8FAFC"
  on-surface: "#0F172A"
  on-surface-muted: "#475569"
  status-success: "#10B981"
  status-success-bg: "#D1FAE5"
  status-warning: "#F59E0B"
  status-warning-bg: "#FEF3C7"
  status-error: "#EF4444"
  status-error-bg: "#FEE2E2"
  status-info: "#3B82F6"
  status-info-bg: "#DBEAFE"
typography:
  font-family: "Inter, system-ui, sans-serif"
  h1:
    fontSize: "24px"
    fontWeight: "600"
  h2:
    fontSize: "20px"
    fontWeight: "600"
  body-default:
    fontSize: "14px"
    fontWeight: "400"
  label:
    fontSize: "12px"
    fontWeight: "500"
    textTransform: "uppercase"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
---
# Design System: CoSpace Management
## Overview
Giao diện được thiết kế cho hệ thống quản lý và vận hành không gian làm việc chung (Co-working space). Ngôn ngữ thiết kế hướng tới sự chuyên nghiệp, đáng tin cậy, tối ưu hóa cho các thao tác nghiệp vụ phức tạp (dashboard, quản lý sơ đồ tầng, xử lý thanh toán) và hiển thị thông tin rõ ràng cho cả 4 vai trò: System Admin, Branch Admin, Staff, và Customer.
## Colors & Status Mapping
Hệ thống màu sắc được thiết kế đặc biệt để phản ánh rõ ràng các trạng thái booking và vận hành:
- **Primary (#4F46E5)**: Màu chủ đạo cho các hành động chính (Tạo booking, Thanh toán, Nút Call-to-action).
- **Secondary (#64748B)**: Dùng cho các thành phần UI phụ trợ, icon, và text mô tả.
- **Surface (#FFFFFF & #F8FAFC)**: Màu nền cho các thẻ (cards), bảng (tables), tạo độ tương phản cao với chữ.
- **Trạng thái Thành công (Success)**: Dùng cho trạng thái `confirmed`, `checked_in`, `completed`, `paid`.
- **Trạng thái Cảnh báo (Warning)**: Dùng cho trạng thái `pending_payment`, `maintenance` (bảo trì).
- **Trạng thái Lỗi (Error)**: Dùng cho trạng thái `canceled`, `expired`, `failed`.
- **Trạng thái Thông tin (Info)**: Dùng cho thẻ highlight, tag kỹ năng trong tính năng Matching Partner.
## Typography
Sử dụng font **Inter** để tối ưu hóa khả năng đọc dữ liệu số (giá tiền, mã booking) và hiển thị tốt trên cả nền tảng web lẫn thiết bị di động.
- Mật độ thông tin: Giữ font size tiêu chuẩn ở mức 14px để hiển thị được nhiều cột trong các bảng dữ liệu (Booking history, Audit logs).
- Nhấn mạnh: Sử dụng font-weight 600 cho tên khách hàng, mã booking và tổng tiền để dễ quét mắt (scannability).
## Components
### 1. Interactive Floorplan (Sơ đồ mặt bằng SVG)
- **Available (Trống)**: Yếu tố SVG có viền màu `primary` nhạt, nền trong suốt, hover fill màu `#EEF2FF`.
- **Booked/Active (Đã đặt)**: Yếu tố SVG fill màu `surface-variant`, viền xám, cursor `not-allowed`.
- **Maintenance (Bảo trì)**: Yếu tố SVG fill sọc chéo hoặc nền `status-warning-bg`, viền `status-warning`.
- Các SVG element phải có transition mượt mà khi hover và click để chọn ghế/phòng.
### 2. Data Tables & Lists
- Sử dụng viền 1px màu xám nhạt (`#E2E8F0`) để phân tách các hàng.
- Hover state trên mỗi hàng bảng (bg: `surface-variant`) để người dùng dễ theo dõi khi đọc bảng báo cáo doanh thu dài.
- Tích hợp bộ lọc (filter) ngay phía trên bảng.
### 3. Badges (Thẻ trạng thái)
- Trạng thái booking và payment luôn được bọc trong badge có nền nhạt và chữ đậm.
- Ví dụ: Trạng thái `checked_in` dùng chữ `status-success` trên nền `status-success-bg`, bo góc `rounded-full`.
### 4. Forms & Inputs
- Text input, Select, và Date picker có viền 1px, bo góc 8px.
- Trạng thái focus: Viền đổi sang màu `primary` và có ring mờ.
- Validation: Khi lỗi, viền chuyển màu `status-error` và có text thông báo nhỏ (12px) ngay bên dưới.
## Do's and Don'ts
- **Do**: Sử dụng thống nhất màu trạng thái (Success, Warning, Error) giữa các phân hệ (Booking, Payment, Maintenance) để người dùng hình thành thói quen thị giác.
- **Do**: Đảm bảo các tooltip giải thích rõ các ký hiệu trên sơ đồ mặt bằng SVG.
- **Do**: Sử dụng màu sắc trung tính (on-surface-muted) cho các thông tin phụ như thời gian tạo, role của user trong Audit Log để không làm rối mắt.
- **Don't**: Không sử dụng màu Primary cho các nút hủy (Cancel) hoặc xóa. Luôn dùng text link hoặc nút viền đỏ cho các hành động phá hủy (destructive actions).
- **Don't**: Không ẩn các nút chức năng cốt lõi (như Check-in/Check-out của Staff) trong các menu dropdown quá sâu. Phải đặt các nút này ở vị trí ưu tiên trên giao diện quản lý.