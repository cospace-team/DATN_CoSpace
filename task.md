# Danh Sách Nhiệm Vụ (Task Checklist) - Đồ Án CoSpace

Sử dụng ký hiệu: `[ ]` Chưa làm | `[/]` Đang làm | `[x]` Đã xong.

---

## 🏗️ 0. Project Foundation & Setup
- [x] Định hình cấu trúc thư mục (BE Package-by-Feature, FE Feature-Based)
- [x] Khởi tạo & Config Database Schema trên Supabase (đồng bộ fail-safe qua `schema.sql` với `IF NOT EXISTS` và `mode: always`)
- [x] Cấu hình Base Backend: Refactor toàn bộ package từ `momosandbox` sang `com.cospace.app` (sạch BOM UTF-8)
- [x] Cấu hình Base Frontend (Vite, Tailwind, React Router, Context API đã hoàn thiện)
- [x] Thiết lập file `.env` chuẩn cho cả FE và BE

## 🔑 1. Identity & Auth (Supabase Link Backend)
- [x] Tích hợp JwtDecoder ở Backend (`SecurityConfig.java`) đọc token Supabase
- [x] Custom `SupabaseJwtAuthenticationConverter` phân quyền 4 Roles (`super_admin`, `branch_admin`, `staff`, `customer` + tương thích ngược `admin`)
- [x] Hỗ trợ User Profile & Networking Profile qua `/api/users/profile` và `/api/profiles/me/networking`
- [x] FE kết nối đăng nhập thực tế / dev login linh hoạt có mock fallback

## 🗺️ 2. Space Management & SVG Floorplan
- [x] Quản lý cấu trúc không gian `branches` → `floors` → `workspace_types` → `workspaces`
- [x] Bảo trì không gian `workspace_maintenance` có khóa Advisory Lock chống trùng lịch (Rule #43)
- [x] API tra cứu sơ đồ tầng và không gian khả dụng

## 🛒 3. Booking Engine & Pricing
- [x] Viết logic API tạo Đặt chỗ mới `/bookings` (chống trùng lịch Overlap check + Advisory lock - Rule #1 & #24)
- [x] Service tính tiền tự động theo giờ/ngày/tuần/tháng kết nối DB `price_policies` (Pricing Service)
- [x] Compute `branch_id` tự động từ `workspace → floor → branch` (Rule #42)
- [x] Chống spam đặt chỗ (Rate Limit tối đa 3 đơn `PENDING_PAYMENT` - Rule #33)
- [x] Quản lý dịch vụ bổ sung Extra Services (CRUD) & Gọi thêm dịch vụ Running Tab khi đang check-in (Rule #30, #32)

## 💳 4. Payment & Check-in
- [x] Tích hợp MoMo Sandbox (Tạo link thanh toán + Webhook IPN xử lý kết quả + bypass chữ ký an toàn cho sandbox)
- [x] Worker tự động hủy đơn sau 15 phút nếu không thanh toán (Payment Timeout)
- [x] API xác nhận thanh toán tiền mặt tại quầy (dành cho Staff)
- [x] Check-in / check-out bằng mã đặt chỗ (Rule #9: tối đa 1 checkin mở, Rule #44: Pessimistic Lock Ordering)
- [x] Xử lý Late Webhook Ghost Payment (Rule #26: không hủy vé muộn, ghi nhận refund tự động)

## 📊 5. Cancellation & Reports & Matching
- [x] Viết logic tự động hủy phòng và tính toán % hoàn tiền theo chính sách (Rule #5, #23, #39, #40: invariant refund+penalty=total)
- [x] Partner Matching Engine: Gợi ý đối tác theo kỹ năng, sở thích & cùng chi nhánh (+0.15 bonus - Rule #18)
- [x] Master data Tags Management API (`GET /api/tags`, `POST /api/tags`)
- [x] Audit Logging Service (`audit_logs` table) & API xem nhật ký kiểm toán hệ thống
- [x] Dashboard biểu đồ doanh thu và công suất phòng cho Admin/Branch Admin (`/api/reports/overview`)
- [x] Export dữ liệu báo cáo ra file CSV có BOM UTF-8 (`/api/reports/export/csv`)
- [x] In-app Notifications System (`/api/notifications` - Rule #20)

## 🧪 6. Quality & Release (Testing & Hardening)
- [x] Backend compile: BUILD SUCCESS cho 119 file Java mã nguồn
- [x] Frontend build: BUILD SUCCESS (`tsc && vite build`) không lỗi kiểu dữ liệu
- [x] Đồng bộ Schema SQL: fail-safe, bảo toàn tương thích ngược cho dữ liệu thực tế Supabase
