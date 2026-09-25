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

## 🏛️ 9. System Polish, Role Unification & Multi-Branch Architecture
- [x] **Chuẩn hóa 4 Vai trò (Role Unification)**:
  - [x] Đồng bộ type `UserRole = 'super_admin' | 'branch_admin' | 'staff' | 'customer'` tại `AuthContext.tsx`, xóa bỏ `normalizeRole()` bóp méo vai trò
  - [x] Chuẩn hóa routing trực diện tại `App.tsx`, `LandingPage.tsx`, `PublicNavbar.tsx`, bỏ logic đoán mò `isBranchAdmin`
  - [x] Chuẩn hóa `UserManagementPage.tsx` modal: dropdown đúng 4 roles, tự động ràng buộc `branch_id` chuẩn theo DB constraint
  - [x] Chuẩn hóa authority Spring Security (`SupabaseJwtAuthenticationConverter`, `SecurityConfig`, `BranchAccessGuard`)
- [x] **Cấu hình Không gian cho Super Admin**:
  - [x] Backend: Cho phép `super_admin` truyền `?branchId=...` vào `BranchAdminSpaceController` để thao tác không gian mọi chi nhánh
  - [x] Frontend: Thêm menu `/admin/workspaces` vào `adminNav` và xây dựng trang cấu hình không gian có Branch Selector
- [x] **Trung Tâm Quản Lý Bảng Giá & Biểu Phí Toàn Diện (Unified Pricing Hub)**:
  - [x] Tab 1: Ma trận giá không gian (Loại không gian × Giờ/Ngày/Tuần/Tháng, cảnh báo thiếu giá, preset 4 mốc)
  - [x] Tab 2: Biểu giá dịch vụ gia tăng (Bật/Tắt trực tiếp, kế thừa vs ghi đè, an toàn snapshot)
  - [x] Tab 3: Biểu phí phạt hủy (5 bậc thời gian logic, % hoàn / % phạt, thứ tự ưu tiên)
- [x] **Sửa Lỗi Logic & Seed Data Chính sách Hủy (Cancellation Policy)**:
  - [x] Sửa `CancellationService.java`: Hỗ trợ `GRACE_HOURS` (tính từ `createdAt`) và `BEFORE_START_DAYS` (tính từ `startAt`)
  - [x] Sắp xếp thứ tự ưu tiên đúng `OrderByPriorityDesc`, phân cấp chi nhánh trước, fallback global
  - [x] Xây dựng bộ seed data 5 bậc thời gian chuẩn (0-2h grace = 100%, >7d = 90%, 3-7d = 70%, 1-3d = 50%, <24h = 0%, Q1 override, policy tạm ngưng)
- [x] **Quản Lý Dịch Vụ Thêm & Dữ Liệu Demo Sống Động (Extra Services)**:
  - [x] Seed data đa dạng: Vừa có BẬT (phục vụ gọi món/đặt chỗ) vừa có TẮT (demo công tắc bật/tắt)
  - [x] Xác thực logic an toàn: `booking_services` snapshot `unit_price` và `subtotal`, đổi giá/sửa tên không ảnh hưởng đơn cũ
  - [x] Chặn xóa cứng khi đã có đơn hàng (`existsByServiceId` + `ON DELETE RESTRICT`), hướng dẫn deactive
- [x] **Đóng Lỗ Hổng & Khả Năng Mở Rộng Sơ Đồ SVG (Workspace Types & Floor Plan)**:
  - [x] Prompt/gợi ý tạo bảng giá ban đầu khi thêm mới Workspace Type (chặn nguy cơ đặt chỗ 0đ)
  - [x] Bổ sung phần tử SVG `phone_booth`, `event_space`, `custom_workspace` vào `ELEMENT_CATALOG` và `LINKABLE_TYPES`
  - [x] Xác nhận an toàn: Khách hàng chỉ có thể đặt các workspace cụ thể đã được gán trên mặt bằng và có giá, không có rủi ro đặt 0đ cho loại mới chưa triển khai

## 🛠️ 10. Operational Bugfixes & Robustness
- [x] **Vấn đề 1: Phân quyền Super Admin Cấu hình Không gian**:
  - [x] BE: Cho phép `super_admin` thao tác trên `floor` mà không bị chặn lệch `branch_id`
  - [x] FE: Truyền `activeBranchId` đủ ở các API update/create trong `BAWorkspacePage.tsx`
  - [x] FE: Reset `selectedFloorId = ''`, `floors = []` ngay khi đổi `selectedBranchId`
- [x] **Vấn đề 2: Chi nhánh Tạm dừng & Lỗi Trùng `floor_no` (Tầng 1)**:
  - [x] BE: Chặn tạo/sửa tầng khi chi nhánh có `status == 'inactive'`
  - [x] BE: Xử lý bắt lỗi trùng tầng thân thiện thay vì văng SQL constraint thô
  - [x] FE: Disable nút Lưu khi đang submit, tính số tầng gợi ý `max(floorNo) + 1`
  - [x] FE: Hiển thị Banner cảnh báo màu vàng khi chi nhánh đang `inactive`
- [x] **Vấn đề 3: Extra Services Fix Switch Bật/Tắt, Avatar/Logo & Phân loại Động**:
  - [x] BE: Thêm `@JsonProperty("isActive")` vào `ExtraServiceEntity.java` để Jackson map chuẩn
  - [x] BE: Mở rộng `service_type` VARCHAR(50), hỗ trợ cả `isActive` và `active` khi update
  - [x] FE: Normalize `isActive: Boolean(s.isActive ?? s.active)` trong `staffApi.ts`
  - [x] FE: Hỗ trợ chọn/nhập phân loại dịch vụ mở rộng linh hoạt kèm fallback icon `✨`
- [x] **Vấn đề 4: Lỗi `validation_failed` Sơ đồ SVG & Empty State Tầng**:
  - [x] FE: Bỏ qua element kiến trúc, đảm bảo `capacity >= 1` và mã code không rỗng khi auto-create
  - [x] FE: Thiết kế Empty State đẹp mắt kèm nút CTA thiết kế khi tầng chưa có SVG
  - [x] FE: Khách hàng xem Explore không bị vỡ giao diện nếu tầng chưa có SVG

## 🚀 11. Production Hardening, Architecture Layering & Performance Optimization
- [x] **Đồng bộ mã nguồn Tổ chức (Org Sync)**: Pull `main` từ `cospace-team/DATN_CoSpace`, resolve xung đột `BookingExpiryScheduler.java` kết hợp an toàn 30s scheduler và error handling độc lập từng booking.
- [x] **Chuẩn hóa URL Cấu hình (Single Source of Truth)**: Gom toàn bộ URL phân tán về `FE/src/config/api.ts` kết nối biến môi trường `VITE_API_BASE_URL`.
- [x] **Tối ưu hóa hiệu năng Frontend (Bundle Chunking)**: Phân rã vendor chunks (`react`, `react-icons`, `framer-motion`, `supabase`) trong `vite.config.ts`, cắt giảm 76.4% dung lượng file js ban đầu (từ 495 kB xuống 116 kB), kích hoạt tối đa HTTP caching của Vercel.
- [x] **Chuẩn hóa Kiến trúc Phân tầng (Layered Architecture - Level C)**: Thiết lập central barrel export tại `FE/src/api/index.ts`, thống nhất tầng truy cập dữ liệu cho toàn bộ ứng dụng.
- [x] **Bảo đảm chất lượng Backend (100% Test Pass)**: Khắc phục mock policy priority DESC trong `CancellationServiceTest.java`, chạy pass toàn bộ 250/250 bài test nghiệp vụ Backend (`BUILD SUCCESS`).

## ✨ 12. Dịch vụ, Thanh toán tab, Gia hạn, Voucher, Không gian & Kết nối
- [x] **Số lượng dịch vụ**: Chọn số lượng từng dịch vụ ở panel đặt chỗ và sửa tiếp ở trang thanh toán (server báo giá lại); sửa số lượng dòng chưa thanh toán trên running tab (`PATCH /api/bookings/{id}/addons/{itemId}`) — khách chỉ sửa/hủy dịch vụ mình gọi, staff sửa được mọi dòng.
- [x] **Thanh toán dịch vụ gọi thêm (QR + tiền mặt)**: Khách tự gọi dịch vụ từ "Lịch sử đặt chỗ", trả bằng VietQR (`POST /api/bookings/{id}/addons/pay/payos`) hoặc chọn trả tiền mặt tại quầy; staff hiện mã QR cho khách quét (tự dò trạng thái) hoặc thu tiền mặt. QR chỉ phủ đúng các dòng lúc tạo; sửa/thu/hủy dòng thì QR cũ bị hủy, tiền dư về sau được đưa vào hàng đợi hoàn tiền.
- [x] **Gia hạn giờ & phí check-out muộn**: Gia hạn trước giờ kết thúc (`/api/bookings/{id}/extension`, tối đa 8h, không vượt đơn kế tiếp / bảo trì / giờ đóng cửa, tính theo giá giờ). Trả chỗ muộn quá 15 phút: phụ phí = số giờ trễ (làm tròn lên) × giá giờ × 1,5 (`/api/bookings/{id}/late-fee`), phải tính (hoặc tính rồi hủy để miễn) và thu trước khi check-out. Tự check-out khách quên trả chỗ dời sang 120 phút sau giờ kết thúc.
- [x] **Hoàn tiền bằng voucher**: Admin chọn hình thức hoàn (chuyển khoản / tiền mặt / voucher). Voucher = mã `HTxxxxxxxx` cố định giá trị, dùng 1 lần, chỉ chủ sở hữu dùng được (`promotions.owner_user_id`), hạn mặc định 90 ngày; khách xem ở Lịch sử đặt chỗ và được gợi ý khi thanh toán (`GET /api/promotions/my-vouchers`).
- [x] **Số chỗ & nhận diện trên sơ đồ**: Mỗi không gian trên sơ đồ có thẻ biểu tượng loại + số chỗ và chấm trạng thái; tooltip hiện loại & số chỗ.
- [x] **Hình ảnh không gian**: Branch admin tải tối đa 10 ảnh/không gian (JPG/PNG/WebP/GIF ≤ 5MB, kiểm tra theo chữ ký tệp) lên Supabase Storage qua backend (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); khách xem gallery khi chọn chỗ.
- [x] **Kết nối đối tác thật**: Gửi lời mời (kèm lời nhắn) → chấp nhận / từ chối / thu hồi / hủy kết nối (`/api/connections`), thông báo in-app; xem hồ sơ thành viên (`GET /api/profiles/{userId}`) — thông tin liên hệ riêng tư chỉ hiện khi đã kết nối.
- [x] **Migration V3** (`V3__tab_charges_vouchers_images_connections.sql`) + kiểm thử: unit test backend pass toàn bộ; kịch bản E2E (đặt chỗ → dịch vụ → QR → gia hạn → phí trễ → voucher → kết nối) chạy pass trên Postgres 16 thật.
