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

## 🎯 13. Rà soát Edge Case trước Demo
- [x] **Migration V4** (`V4__floor_layout_columns.sql`): bổ sung `floors.layout_json` / `svg_content` mà V1 baseline thiếu — DB mới (máy demo, CI) trước đây lỗi mọi truy vấn tầng. Idempotent, không ảnh hưởng Supabase.
- [x] **Xử lý lỗi API thống nhất**: gộp 2 `@RestControllerAdvice` chồng nhau còn 1 (`GlobalExceptionHandler`). Tham số sai kiểu / thiếu / ngày sai định dạng trả 400 thay vì 500; lỗi 500 không còn lộ tên exception & câu SQL; vi phạm CHECK / NOT NULL trả 400 có thông báo rõ.
- [x] **Trang Khuyến mãi (Super Admin) lỗi 500**: query đếm lượt dùng theo lô thiếu tham số `:promotionId`.
- [x] **Walk-in tại quầy**: đặt chỗ thất bại không còn để lại tài khoản khách rác (chung transaction); khách cũ cùng SĐT + tên dùng lại tài khoản (trừ SĐT mặc định 0900000000 của chế độ khách vãng lai — mỗi khách vẫn có tài khoản riêng, tránh dồn chi tiêu lên hạng thành viên và chạm giới hạn 3 đơn chờ thanh toán); giá hiển thị lấy từ bảng giá thật của chi nhánh (staff bị 403 ở API giá branch-admin → trước đây đoán giá cứng); QR / hóa đơn dùng tổng tiền server tính (có giảm giá hạng thành viên); báo lỗi khi không tạo được giao dịch VietQR.
- [x] **Đặt chỗ**: server từ chối không gian ở trạng thái `maintenance` / `inactive` (trước chỉ FE chặn).
- [x] **Check-in**: báo đúng "đã check-in" thay vì "chưa thanh toán"; chặn check-in gói nhiều ngày đã hết hạn.
- [x] **Validate dữ liệu quản trị**: dịch vụ thêm không nhận giá âm; chính sách hủy kiểm tra loại quy tắc, khoảng min < max, % hoàn 0–100.
- [x] **Checkout**: đếm ngược 15 phút chỉ chạy khi đã tạo đơn giữ chỗ (trước đó để trang mở quá 15 phút là nút "Thanh toán ngay" bị khóa vĩnh viễn).
- [x] **VietQR offline**: nếu không tải được ảnh `img.vietqr.io`, tự sinh mã VietQR chuẩn EMVCo (có CRC) ngay trên trình duyệt.
- [x] **Lịch sử đặt chỗ**: gói nhiều ngày hiện khoảng ngày; ẩn nút "Hủy" khi đơn đã bắt đầu (server không cho hủy online).
- [x] **FE env**: `VITE_SUPABASE_URL` / `VITE_API_BASE_URL` để trống không còn làm trắng trang; `/api/tags` ở Hồ sơ gửi kèm token.
- [x] **Kiểm thử**: 310/310 unit test BE pass; build FE pass; Playwright duyệt 34 trang × 4 vai trò không lỗi console/API; E2E đặt chỗ → VietQR → lịch sử, check-in → dịch vụ → thu tiền → check-out, hủy → hoàn voucher chạy pass trên Postgres 16.

## 🧹 14. Dọn "AI slop" trên giao diện
- [x] **Nội dung bịa / sai sự thật**: bỏ "10,000+ thành viên", "25+ chi nhánh", "24/7", avatar ảnh stock ở trang đăng nhập; bỏ nhãn "Phổ biến" không có số liệu; thay tiện ích tự nghĩ ra ở bảng giá (Smart TV 4K, khóa từ 24/7, địa chỉ ĐKKD…) bằng tính năng hệ thống thật sự có; sửa claim "hoàn tiền tự động, không chờ duyệt" và "sơ đồ realtime" cho đúng nghiệp vụ.
- [x] **Chỉ báo giả**: bỏ badge "Live Database", "Online", "Trực tiếp", chấm "đang hoạt động" trên avatar, mũi tên tăng trưởng không có dữ liệu xu hướng; trạng thái máy chủ chỉ hiện khi mất kết nối.
- [x] **Thẻ KPI**: component `StatCard` dùng chung cho các dashboard (admin, chi nhánh, trực ban, báo cáo) thay cho icon gradient cầu vồng + đốm glow; số doanh thu không còn bị cắt.
- [x] **Trang trí thừa**: bỏ avatar gradient tím–chàm, đốm blur, watermark chữ viền, sọc chéo, nhãn xiên, hiệu ứng nhấc/phóng khi rê chuột, chấm nhấp nháy/nảy không mang thông tin.
- [x] **Chữ & emoji**: tiêu đề tiếng Việt viết sentence case thay vì Title Case, bỏ chữ IN HOA tràn lan ở trang chủ; thay emoji trong nhãn trạng thái/menu bằng chữ hoặc icon `react-icons` (`ServiceIcon`).
- [x] **Sửa kèm**: navbar trang chủ luôn nền đặc (logo/menu trước đây chìm trên hero tối); tab lọc "Khách đến hôm nay" không còn tràn; thanh tiến độ báo cáo theo loại không gian trước đây không hiện màu.

## 🎨 15. Thiết kế lại trình chỉnh sửa sơ đồ tầng
- [x] **Một thanh công cụ duy nhất** (thay hai header chồng nhau): tên tầng + trạng thái lưu bên trái; chọn/di chuyển, hoàn tác, thu phóng, lưới ở giữa; "Xem trước" và "Lưu sơ đồ" bên phải. Nút lưu bị khóa khi chưa có thay đổi.
- [x] **Thư viện phần tử dạng danh sách** với icon nét mảnh tô theo màu phần tử, ô tìm kiếm, nhóm thu gọn được; bấm vào phần tử để thêm vào giữa khung nhìn (ngoài kéo-thả như trước).
- [x] **Bảng thuộc tính chia mục**: "Chỗ đặt" lên đầu (cho biết đã gán, mồ côi, hay sẽ tự tạo khi lưu), rồi Thông tin, Vị trí & kích thước, Màu sắc. Khi chưa chọn gì thì hiện tóm tắt sơ đồ (số chỗ chưa gán) và danh sách phím tắt thu gọn.
- [x] **Ẩn/hiện hai bảng bên** để khung vẽ chiếm toàn bộ chiều ngang; thanh trạng thái mỏng ở đáy (số phần tử, đã gán, kích thước khung, lưới).
- [x] **Đóng có xác nhận** khi còn thay đổi chưa lưu; trình chỉnh sửa mở toàn màn hình qua portal (trước đây lệch 24px do kế thừa `space-y-6`).
- [x] Nhãn mặc định trong danh mục chuyển sang tiếng Việt đầy đủ: "Văn phòng riêng", "Cabin cách âm", "Không gian khác".
- [x] **Sơ đồ demo cho cả 9 tầng / 3 chi nhánh**: mặt bằng kiểu bản vẽ kiến trúc — mặt kính, vách ngăn, cửa, hành lang, lõi thang (cầu thang bộ + 2 thang máy + WC) cùng vị trí ở mọi tầng của một tòa (Nguyễn Huệ phía Đông, Nam Kỳ Khởi Nghĩa phía Tây, Cầu Giấy giữa phía Bắc), sảnh lễ tân, pantry, lounge, sân thượng penthouse. 29/29 chỗ đặt đều nằm trên sơ đồ; các phần tử khác là kết cấu/tiện ích nên lưu trong trình chỉnh sửa không tự tạo chỗ thừa. Sinh bằng `database/tools/floor_layouts.py` → `database/seed_floor_layouts_json.sql` (có sẵn câu kiểm tra ở cuối). Bàn nhiều chỗ (cụm bàn, dãy bàn) giờ vẽ đủ số ghế và chỉnh được "Số ghế" trong trình chỉnh sửa; biểu tượng khóa chỉ hiện trong trình chỉnh sửa.

## 🛡️ 16. Điểm uy tín & nhắc lịch check-in
- [x] **Trừ điểm khi không check-in**: mỗi khách bắt đầu 100 điểm; đơn đã xác nhận quá 30 phút sau giờ bắt đầu chưa check-in bị trừ 10 điểm (mỗi đơn một lần), gói nhiều ngày chỉ bị trừ khi hết hạn mà chưa dùng lần nào (Migration V5: `users.reputation_score`, `reputation_events`).
- [x] **Hồi điểm**: check-in đúng hạn được cộng 2 điểm (tối đa 100).
- [x] **Hệ quả**: dưới 50 điểm chỉ được giữ 1 đơn chưa sử dụng khi đặt online; dưới 30 điểm không đặt online được (quầy vẫn đặt hộ).
- [x] **Gỡ phạt sai**: nhân viên/admin hoàn điểm phạt kèm lý do (`POST /api/staff/reputation/bookings/{id}/revert`), mỗi đơn một lần, ghi audit log và báo khách.
- [x] **Nhắc lịch**: thông báo trước giờ bắt đầu 60 phút và lúc bắt đầu (còn bao nhiêu phút để check-in), mỗi đơn mỗi loại một lần.
- [x] **Giao diện**: quy tắc check-in và cảnh báo hạn chế ở bước thanh toán; đếm ngược check-in trong Lịch sử đặt chỗ; huy hiệu điểm uy tín + lịch sử + nút hoàn điểm ở màn Check-in và Quản lý người dùng; ô điểm uy tín ở Hồ sơ.
- [x] **Kiểm thử**: 334/334 unit test BE pass; chạy thật trên Postgres 16 (migration V5, job nhắc lịch, job trừ điểm, cộng điểm, hoàn điểm, chặn đặt online, phân quyền 403); build FE pass, chụp màn hình 4 vai trò.
