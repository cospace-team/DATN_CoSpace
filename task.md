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
- [x] Backend compile: BUILD SUCCESS cho 138 file Java mã nguồn
- [x] Frontend build: BUILD SUCCESS (`tsc && vite build`) không lỗi kiểu dữ liệu
- [x] Đồng bộ Schema SQL: fail-safe, bảo toàn tương thích ngược cho dữ liệu thực tế Supabase

## 👤 7. Customer Module Refinement & Verification
- [x] **Lịch sử đặt chỗ (`BookingHistoryPage.tsx`)**: Bỏ nút "Đặt lại chỗ này"; Thiết kế lại chi tiết tab "Đã hủy" hiển thị minh bạch (% hoàn tiền, số tiền hoàn, phí phạt hủy, chính sách hủy áp dụng, lý do hủy).
- [x] **Cộng đồng (`CommunityPage.tsx`)**: Seed dữ liệu thực vào PostgreSQL Supabase (4 authors, 8 bài viết cộng đồng đa dạng thể loại, 20 tags liên kết); Không dùng mock giả lập.
- [x] **Hồ sơ & Kết nối (`ProfilePage.tsx`)**: Sửa lỗi lệch họ tên và layout rời rạc; Thay thế stats mock bằng `realStats` tính toán từ lịch sử đặt chỗ thực; Hỗ trợ lưu và hiển thị liên kết mạng xã hội (LinkedIn, GitHub, Website/Portfolio) có empty state trực quan.
- [x] **Kỹ năng & Chuyên môn (Tags & Skills)**: Đồng bộ triệt để 3 lớp Database (`tags`, `profile_skills`), Backend (`PartnerMatchingService.updateNetworkingProfile`) và Frontend (`ProfilePage.tsx`); Auto-save ngầm mượt mà; Tự động kích hoạt lại thuật toán đối sánh Jaccard ngay khi có thay đổi; Lấy danh mục tag thực tế từ DB; Thiết kế giao diện chuyên nghiệp, loại bỏ nhãn kỹ thuật thô kệch.
- [x] **Liên kết mạng xã hội**: Chỉnh sửa & lưu độc lập trực tiếp tại Bento Card 4 mà không cần cuộn lên; Lưu trữ JSON chuẩn trong `profiles.contact_link`.
- [x] **Mạng lưới đối tác (Networking Suggestions)**: Bộ lọc phân loại `⭐ Phù hợp nhất` (Match Score ≥ 50%) và `🌐 Tất cả thành viên`; Phân trang hiển thị mở rộng với nút xem thêm; Sắp xếp theo mức độ phù hợp giảm dần.
- [x] **Theme & Huy hiệu Member**: Tối ưu độ tương phản WCAG AAA cho Bronze Member trên Light theme (không còn bị chìm/mờ) và dịu mắt trên Dark theme; Bỏ huy hiệu "Đã xác thực" thừa thãi.
- [x] **Đồng bộ Tài liệu (Docs)**: Cập nhật `docs/api-contracts/matching.md` và `docs/SYSTEM_SPEC.md` phản ánh đúng 100% các endpoints và schema DTO thực tế.
- [x] **Hệ thống thông báo (`NotificationBell.tsx`)**: Sửa class CSS `shadow-2xs`, tối ưu responsive layout cho mobile, phân loại icon/màu sắc đẹp mắt theo 7 loại sự kiện (Đặt chỗ, Nhắc nhở trước 1h, Hoàn tiền hủy đơn, Gợi ý đối tác, Bài viết cộng đồng, Hủy đơn, Giao dịch).
## 👑 8. Admin Console APIs, In-Memory Caching & Polish
- [x] **Quản trị toàn hệ thống (`AdminController.java`)**: CRUD chi nhánh (`/api/admin/branches`), loại chỗ ngồi (`/api/admin/workspace-types`), bảng giá toàn hệ thống (`/api/admin/price-policies`).
- [x] **Đấu nối dữ liệu thật cho FE Admin**: Thay thế hoàn toàn mock state tại `BranchManagementPage.tsx`, `PricingPage.tsx`, `ExtraServicesPage.tsx`, `CancellationPoliciesPage.tsx`.
- [x] **Phân trang người dùng**: Hỗ trợ phân trang Server-side `GET /api/users?page=&size=` và tích hợp UI pagination controls tại `UserManagementPage.tsx`.
- [x] **In-Memory Caching (Caffeine)**: Tích hợp Spring Cache với Caffeine cho các dữ liệu cấu hình tĩnh và báo cáo (`branches`, `workspace_types`, `price_policies`, `reports_overview`, `extra_services`, `cancellation_policies`), tự động `@CacheEvict` khi mutate.
- [x] **Khắc phục lỗi pgjdbc Parameter Type**: Bổ sung `preferQueryMode: simple` vào cấu hình datasource HikariCP trong `application.yml`.
