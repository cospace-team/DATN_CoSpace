# Danh Sách Nhiệm Vụ (Task Checklist) - Đồ Án CoSpace

Sử dụng ký hiệu: `[ ]` Chưa làm | `[/]` Đang làm | `[x]` Đã xong.

---

## 🏗️ 0. Project Foundation & Setup
- [x] Định hình cấu trúc thư mục (BE Package-by-Feature, FE Feature-Based)
- [ ] Khởi tạo & Config Database Schema trên Supabase (chạy migration V1)
- [x] Cấu hình Base Backend (Spring Boot: Security, CORS đã thiết lập) -> *Cần chuyển code từ `momosandbox` sang `com.cospace`*
- [x] Cấu hình Base Frontend (Vite, Tailwind, React Router, Context API đã hoàn thiện)
- [x] Thiết lập file `.env` chuẩn cho cả FE và BE

## 🔑 1. Identity & Auth (Supabase Link Backend)
- [x] Tích hợp JwtDecoder ở Backend (`SecurityConfig.java`) để đọc token Supabase
- [ ] [/] Tích hợp Custom JwtAuthenticationConverter để phân quyền Role (nếu chưa có)
- [ ] Cập nhật API `/api/auth/me` để trả về thông tin user chi tiết
- [ ] FE kết nối API login/register thực tế từ Supabase (hiện đang dùng MockData)

## 🗺️ 2. Space Management & SVG Floorplan
- [ ] Sửa đổi nghiệp vụ và Database cho thực thể Workspace (thêm `capacity`, `status`, `description`...)
- [ ] Viết API lấy thông tin tầng, workspace trống/bận theo giờ `/workspaces/available`
- [ ] FE kết nối API và tô màu tương tác bản đồ SVG (`SVGFloorPlanEditor.tsx`)
- [ ] Viết API và giao diện quản lý lịch bảo trì phòng (Maintenance)

## 🛒 3. Booking Engine & Pricing
- [x] Viết logic API tạo Đặt chỗ mới `/bookings` (chống trùng lịch Overlap check)
- [x] Hoàn thiện Service tính tiền tự động theo giờ/ngày/tuần/tháng (Pricing Service)
- [ ] Làm API và Giao diện quản lý dịch vụ bổ sung (Add-on extra services)
- [ ] Giao diện lịch sử đặt chỗ & hợp đồng cho Khách hàng + Quản trị viên

## 💳 4. Payment & Check-in
- [x] Tích hợp MoMo Sandbox (Tạo link thanh toán + Webhook IPN xử lý kết quả)
- [x] Viết Worker tự động hủy đơn sau 15 phút nếu không thanh toán (Payment Timeout)
- [x] API xác nhận thanh toán tiền mặt tại quầy (dành cho Staff)
- [ ] API và Giao diện check-in/check-out bằng mã QR / Booking Code

## 📊 5. Cancellation & Reports & Matching
- [ ] Viết logic tự động hủy phòng và tính toán % hoàn tiền theo chính sách
- [ ] Làm API gợi ý đối tác theo kỹ năng (Matching Engine)
- [ ] Dashboard biểu đồ doanh thu và công suất phòng cho Admin/Branch Admin (Recharts/Chart.js)
- [ ] Export dữ liệu báo cáo ra file CSV

## 🧪 6. Quality & Release (Testing & Hardening)
- [ ] Viết script SQL test tự động chạy thử toàn bộ luồng nghiệp vụ
- [ ] Fix bug, tối ưu giao diện Responsive, chuẩn bị demo bảo vệ
