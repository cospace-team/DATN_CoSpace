# Kế hoạch kiểm tra ứng dụng CoSpace trước khi deploy production

> Phạm vi: `BE/` (Spring Boot 3.1, Java 17, Supabase Postgres), `FE/` (React 18 + Vite + TS), `database/` (migrations, seeds).
> Cách dùng: làm lần lượt từng giai đoạn, tick `[x]` khi xong. **Giai đoạn 1 là bắt buộc trước khi public bất kỳ URL nào.**

---

## Giai đoạn 0 — Các vấn đề đã phát hiện khi khảo sát sơ bộ

Những điểm dưới đây đã được xác nhận trực tiếp trong code, xếp theo mức độ nghiêm trọng.

| # | Mức | Vấn đề | Vị trí |
|---|-----|--------|--------|
| 1 | 🔴 Critical | JWT secret có **giá trị mặc định hardcode**. `app.jwt.secret` không có trong `.env.example` → nếu quên set, production dùng secret công khai trong repo → ai cũng tự ký được token `admin`. | `BE/src/main/java/com/cospace/app/config/SecurityConfig.java:38` |
| 2 | 🔴 Critical | `POST /api/payments/payos/simulate` là `permitAll` → bất kỳ ai không cần đăng nhập cũng xác nhận "đã thanh toán" cho một `orderCode` bất kỳ. | `SecurityConfig.java:128`, `PaymentController.java:160` |
| 3 | 🔴 Critical | MoMo `access-key` / `secret-key` hardcode trong file được commit. | `BE/src/main/resources/application.yml` (khối `momo:`) |
| 4 | 🔴 Critical (cần kiểm) | FE dùng `supabase-js` với anon key → nếu các bảng trong schema `public` **chưa bật RLS**, bất kỳ ai cũng đọc/ghi trực tiếp DB qua REST API của Supabase, bỏ qua toàn bộ phân quyền BE. | Supabase project |
| 5 | 🟠 High | `spring.sql.init.mode: always` + `continue-on-error: true` → mỗi lần khởi động chạy lại `schema.sql`/`data.sql` lên DB production, lỗi bị nuốt im lặng. | `application.yml` |
| 6 | 🟠 High | FE gọi cứng `http://localhost:8080` (8 chỗ) → trang Profile/Networking/Matching hỏng hoàn toàn trên production. | `FE/src/pages/customer/ProfilePage.tsx:298,314,373,447,473,518,595,688` |
| 7 | 🟠 High | Không có test BE nào (thư mục `src/test` rỗng, còn sót package `com/example/momosandbox`). | `BE/src/test` |
| 8 | 🟠 High | Không có rate limit cho `/api/auth/login`, `/api/auth/register`, chatbot (tốn tiền Gemini). | toàn BE |
| 9 | 🟡 Medium | Cấu hình dev để trong config chung: `show-sql: true`, `format_sql`, log `DEBUG`, devtools restart/livereload. | `application.yml`, `pom.xml` |
| 10 | 🟡 Medium | `/h2-console/**` vẫn `permitAll` (không dùng H2); `/momo/**`, `/payos/**`, `/api/payments/payos/status/**` public — cần rà lại. | `SecurityConfig.java:119-134` |
| 11 | 🟡 Medium | Hai exception handler song song (`ApiExceptionHandler`, `GlobalExceptionHandler`), có `ex.printStackTrace()`. | `controller/ApiExceptionHandler.java:65`, `exception/GlobalExceptionHandler.java` |
| 12 | 🟡 Medium | Spring Boot 3.1.x đã hết hỗ trợ OSS; `spring-boot-maven-plugin` dùng `3.1.6` lệch với parent `3.1.12`. | `BE/pom.xml` |
| 13 | 🟡 Medium | `BookingExpiryScheduler` (60s) + cache Caffeine in-memory → sai lệch nếu chạy >1 instance. | `service/BookingExpiryScheduler.java` |
| 14 | 🟡 Medium | Bundle FE lớn: `index` 505 KB, `OperationsDashboardPage` 381 KB, `CheckInPage` 370 KB. | `FE/dist/assets` |
| 15 | 🟢 Low | `API_BASE_URL` khai báo lặp ở ~10 file thay vì dùng chung `FE/src/config/api.ts`. | FE |
| 16 | 🟢 Low | Chưa có Dockerfile, CI, hay cấu hình host (SPA rewrite). | root |
| 17 | ✅ Đã sửa | MoMo IPN/return bỏ qua chữ ký sai nếu request gửi `partnerCode=MOMO`. Nay luôn từ chối chữ ký sai. | `PaymentService.handleMomoCallback` |
| 18 | ✅ Đã sửa | `GET /api/payments/payos/return` đánh dấu PAID chỉ dựa vào query `status=PAID`. Nay bỏ qua query, chỉ xác nhận khi PayOS API (`GET /v2/payment-requests/{orderCode}`) trả `PAID` và đủ tiền; tạo link lỗi không còn trả URL "PAID" giả. | `PaymentService.handlePayosReturn`, `PayosService` |
| 19 | ✅ Đã sửa | PayOS demo mode chấp nhận mọi chữ ký webhook. Nay demo mode từ chối mọi webhook. | `PayosService.verifyWebhookSignature` |
| 20 | ✅ Đã sửa | User chưa có trong DB được cấp quyền theo `user_metadata.role` (người dùng tự sửa được). Nay chỉ tin DB hoặc `app_metadata`. | `SupabaseJwtAuthenticationConverter` |

> Mục 2 và 10 còn test tái hiện đang `@Disabled` trong `SecurityConfigRouteAuthorizationTest$KnownIssues`. Sau khi sửa, xoá `@Disabled` để test chặn lỗi quay lại. Chạy riêng các test bị tắt: `mvn test -Djunit.jupiter.conditions.deactivate=org.junit.*DisabledCondition`.

---

## Giai đoạn 1 — Sửa lỗi bảo mật chặn deploy (P0)

- [ ] **JWT secret**: bỏ giá trị mặc định ở `@Value("${app.jwt.secret:...}")`; fail-fast khi thiếu hoặc < 64 byte (HS384). Thêm `APP_JWT_SECRET` vào `.env.example`. Sinh secret mới bằng `openssl rand -base64 64`.
- [ ] **Endpoint simulate**: xoá `/api/payments/payos/simulate`, hoặc chỉ bật với `@Profile("dev")` và bỏ khỏi danh sách `permitAll`.
- [ ] **Secrets trong `application.yml`**: chuyển toàn bộ khối `momo:` sang biến môi trường; bỏ các default kiểu `demo-api-key` cho `payos:` (thiếu thì fail-fast trong profile prod).
- [ ] **Quét secrets toàn repo và lịch sử git**: `gitleaks detect --source . --log-opts="--all"`. Key nào đã từng lộ thì **rotate** (Supabase DB password, JWT secret, Gemini, PayOS).
- [ ] **Supabase RLS**: vào Dashboard → Advisors (Security) hoặc chạy
      `select tablename, rowsecurity from pg_tables where schemaname='public';`
      Bảng nào `rowsecurity = false` thì bật RLS. Nếu FE chỉ dùng Supabase cho Auth, không cho `anon` truy cập bảng nào cả.
- [ ] **Rà `permitAll`**: bỏ `/h2-console/**`; xác nhận `/momo/**`, `/payos/**` có thật sự cần không; `payos/status/{orderCode}` nên yêu cầu đăng nhập và kiểm tra quyền sở hữu booking.
- [ ] **Webhook thanh toán**: xác nhận `handlePayosWebhook` / `handleMomoCallback` **từ chối** request có checksum/signature sai (viết test gửi chữ ký giả phải bị reject). Xác nhận `/payos/return` không tự đánh dấu PAID chỉ dựa trên query param.
- [ ] **Phân quyền theo đối tượng (IDOR)**: với mỗi endpoint nhận `id` (booking, payment, user, branch, notification…), kiểm tra customer A không đọc/sửa được dữ liệu của B, branch admin chi nhánh X không thao tác được chi nhánh Y (`BranchAccessGuard`).
- [ ] **Đăng ký**: xác nhận không thể truyền `role` qua body của `/api/auth/register` (hiện service gán `customer` — giữ nguyên, thêm test).
- [ ] **Rate limiting**: thêm Bucket4j hoặc filter đơn giản cho login/register/refresh/chatbot; hoặc cấu hình ở reverse proxy.

## Giai đoạn 2 — Tách cấu hình theo môi trường

- [ ] Tạo `application-prod.yml` (kích hoạt bằng `SPRING_PROFILES_ACTIVE=prod`):
  - `spring.jpa.show-sql: false`, bỏ `format_sql`
  - `spring.sql.init.mode: never`
  - `spring.devtools.*` tắt; `logging.level.com.cospace.app: INFO`
  - `server.error.include-stacktrace: never`, `include-message: never`
  - `server.forward-headers-strategy: framework` (khi đứng sau proxy/HTTPS)
  - `spring.datasource.hikari.maximum-pool-size` phù hợp giới hạn Supabase pooler (vd. 5–10)
- [ ] Bỏ `spring.config.import` đọc file `.env` ở profile prod — production đọc env từ nền tảng host.
- [ ] Viết bảng **danh sách biến môi trường bắt buộc** (BE + FE) vào README, khớp với `.env.example`:
  BE: `SPRING_PROFILES_ACTIVE`, `SUPABASE_DB_URL/USERNAME/PASSWORD`, `SUPABASE_JWT_ISSUER`, `APP_JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_BASE_URL`, `PAYOS_*`, `MOMO_*`, `GEMINI_API_KEY`.
  FE: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] CORS: `APP_CORS_ALLOWED_ORIGINS` chỉ chứa domain FE thật (https), không có localhost.
- [ ] Đổi `return-url`, `notify-url`, `cancel-url` của MoMo/PayOS sang domain production (HTTPS public).

## Giai đoạn 3 — Database

- [ ] Chốt **một nguồn sự thật** cho schema: `database/migrations/*` (theo thứ tự timestamp). Đối chiếu với `BE/src/main/resources/schema.sql` và `database/full_schema_complete.sql`, xoá/đánh dấu file trùng. Cân nhắc dùng Flyway.
- [ ] Dựng một DB trống (Supabase branch hoặc Postgres local), chạy toàn bộ migrations từ đầu → không lỗi.
- [ ] Chạy `database/tests/test_full_workflows.sql` và `test_core_workflows.sql` trên DB đó.
- [ ] Tách seed: chỉ giữ dữ liệu master (workspace types, policy mặc định); **không** chạy `seed_demo_data.sql` trên production (hoặc chạy có chủ đích nếu là môi trường demo bảo vệ đồ án).
- [ ] Kiểm tra index cho các truy vấn nặng (booking theo branch/ngày, audit log, báo cáo): `EXPLAIN ANALYZE` các query trong `ReportController`, `AuditLogRepository`, `UserRepository.filterUsers`.
- [ ] Kiểm tra exclusion constraint chống đặt trùng chỗ hoạt động (thử 2 booking chồng giờ đồng thời).
- [ ] Bật backup/PITR của Supabase; ghi lại cách restore.
- [ ] Đánh giá `preferQueryMode: simple`: test truy vấn có ký tự đặc biệt (`'`, `\`, unicode tiếng Việt) để chắc chắn không lỗi/injection; theo dõi hiệu năng.

## Giai đoạn 4 — Backend: chất lượng & độ ổn định

- [ ] Build sạch: `cd BE && mvn clean verify` (không warning nghiêm trọng).
- [ ] Gộp còn một `@RestControllerAdvice`; bỏ `printStackTrace`, log bằng SLF4J; response lỗi không lộ stack trace/SQL.
- [ ] Rà `@Valid` trên mọi `@RequestBody`; giới hạn kích thước request/upload (`spring.servlet.multipart.max-file-size`).
- [ ] Rà log: không log token, password, PII, payload webhook đầy đủ (`PaymentController` đang log `body` và `allParams`).
- [ ] Scheduler: đảm bảo `BookingExpiryScheduler` idempotent; nếu scale >1 instance thì dùng ShedLock hoặc chỉ chạy 1 instance.
- [ ] Cache Caffeine: xác nhận có evict khi admin sửa branch/workspace type/price policy; ghi chú giới hạn khi nhiều instance.
- [ ] Gemini: timeout, retry có giới hạn, xử lý khi thiếu key (chatbot tắt êm, không crash).
- [ ] Health check: `/api/health` kiểm tra được kết nối DB (hoặc thêm `spring-boot-starter-actuator`, chỉ expose `health`).
- [ ] Nâng Spring Boot lên bản còn hỗ trợ (3.4/3.5) + đồng bộ version plugin; chạy lại toàn bộ test sau khi nâng.
- [ ] Quét dependency: `mvn org.owasp:dependency-check-maven:check`.
- [ ] Xoá code rác: package `com/example/momosandbox`, các thư mục `modules/*` chỉ có `.gitkeep`, `data.sql` nếu đã chuyển sang migration.

### Test tối thiểu cần viết (BE)
- [ ] Unit test: tính giá booking + price policy, chính sách huỷ/hoàn tiền, verify chữ ký PayOS/MoMo, JwtUtil (refresh token không dùng làm access token).
- [ ] Integration test (`@SpringBootTest` + Testcontainers Postgres): luồng đặt chỗ → thanh toán webhook → check-in; phân quyền 401/403 cho từng nhóm route `/api/admin`, `/api/branch-admin`, `/api/staff`.

## Giai đoạn 5 — Frontend

- [ ] Thay 8 URL cứng trong `ProfilePage.tsx` bằng `API_BASE_URL`; gom mọi file về import từ `FE/src/config/api.ts`.
- [ ] Kiểm tra lại: `rg "localhost" FE/src` chỉ còn fallback trong `config/api.ts` (hoặc bỏ luôn fallback, fail khi thiếu env ở build prod).
- [ ] Build sạch: `cd FE && npm ci && npm run build` (tsc không lỗi).
- [ ] `npm audit --omit=dev`, xử lý lỗ hổng high/critical.
- [ ] Xoá `console.log` debug (đặc biệt `AuthContext.tsx`, `ProfilePage.tsx`); không log token/user.
- [ ] Xử lý 401 toàn cục: token hết hạn → refresh hoặc về trang login, không treo UI.
- [ ] Có ErrorBoundary và trang 404 cho route không tồn tại.
- [ ] Tối ưu bundle: lazy-load `html5-qrcode` (CheckInPage), `recharts` (dashboard/report), tách `manualChunks` cho vendor; mục tiêu chunk khởi đầu < 250 KB gzip.
- [ ] Kiểm tra responsive (mobile ~400px) cho luồng customer: tìm chỗ, đặt, thanh toán, lịch sử.
- [ ] Kiểm tra trình duyệt: Chrome, Edge, Safari/iOS (camera quét QR cần HTTPS).
- [ ] Lighthouse cho Landing page: Performance/Accessibility/SEO; thêm `<title>`, meta description, favicon.

## Giai đoạn 6 — Kiểm thử chức năng end-to-end (theo vai trò)

Chạy trên môi trường **staging** giống production (build prod, HTTPS, DB riêng).

**Khách (chưa đăng nhập)**
- [ ] Landing, xem danh sách chi nhánh; truy cập trang cần đăng nhập → bị chuyển về login.

**Customer**
- [ ] Đăng ký, đăng nhập, refresh token, đăng xuất.
- [ ] Tìm workspace theo chi nhánh/tầng/sơ đồ, xem giá theo price policy.
- [ ] Đặt chỗ → thanh toán PayOS (VietQR) và MoMo → webhook cập nhật PAID → nhận thông báo.
- [ ] Booking hết hạn thanh toán bị scheduler huỷ; huỷ booking theo cancellation policy.
- [ ] Đặt trùng giờ cùng chỗ bị chặn (thử 2 tab đồng thời).
- [ ] Profile, networking, matching, community post, chatbot.

**Staff**
- [ ] Dashboard hôm nay, check-in bằng QR/mã booking, bảo trì chỗ ngồi.
- [ ] Không truy cập được route branch-admin/admin (UI và API trả 403).

**Branch admin**
- [ ] Quản lý không gian, sơ đồ tầng, dịch vụ thêm của **chi nhánh mình**; thử gọi API chi nhánh khác → 403.

**Super admin**
- [ ] Quản lý user (phân trang, lọc), branch, workspace type, price policy, audit log, báo cáo nhiều năm.
- [ ] Mọi thao tác quản trị ghi audit log.

## Giai đoạn 7 — Hạ tầng deploy

- [ ] **BE**: viết `BE/Dockerfile` multi-stage (Maven build → `eclipse-temurin:17-jre`), chạy user non-root, `-XX:MaxRAMPercentage=75`. Host gợi ý: Render / Railway / Fly.io / VPS.
- [ ] **FE**: deploy static (Vercel / Netlify / Cloudflare Pages) với **SPA rewrite** mọi route về `index.html`; set `VITE_*` lúc build.
- [ ] Domain + HTTPS cho cả FE và BE; cập nhật CORS, redirect URL thanh toán, Site URL / Redirect URLs trong Supabase Auth.
- [ ] Đăng ký webhook URL production với PayOS/MoMo; đổi từ sandbox sang credential thật (nếu thanh toán thật).
- [ ] CI (GitHub Actions): `mvn verify` + `npm ci && npm run build` trên mỗi PR vào `main`.
- [ ] Giám sát: log tập trung của nền tảng host, uptime check `/api/health` (UptimeRobot), cảnh báo lỗi 5xx.
- [ ] Load test nhẹ (k6): 50–100 user đồng thời trên API tìm chỗ + tạo booking; theo dõi pool kết nối Supabase.

## Giai đoạn 8 — Go-live & rollback

- [ ] Checklist cuối: toàn bộ Giai đoạn 1 đã xong, secrets đã rotate, `SPRING_PROFILES_ACTIVE=prod`, migrations đã chạy, backup đã bật.
- [ ] Smoke test sau deploy (≤ 15 phút): login mỗi vai trò, tạo 1 booking, thanh toán 1 giao dịch, check-in, xem báo cáo.
- [ ] Rollback: giữ image/bản build trước; migration phải có script đảo ngược hoặc tương thích ngược; ghi rõ các bước.
- [ ] Tag release trên git (`v1.0.0`) và ghi CHANGELOG.

---

## Thứ tự và ước lượng

| Giai đoạn | Ưu tiên | Ước lượng |
|-----------|---------|-----------|
| 1. Bảo mật P0 | Bắt buộc | 1–2 ngày |
| 2. Cấu hình môi trường | Bắt buộc | 0,5 ngày |
| 3. Database | Bắt buộc | 1 ngày |
| 5. Frontend (URL cứng, build) | Bắt buộc | 0,5–1 ngày |
| 7. Hạ tầng deploy (staging) | Bắt buộc | 1 ngày |
| 6. E2E theo vai trò | Bắt buộc | 1–2 ngày |
| 4. BE test, nâng version, tối ưu | Nên làm | 2–3 ngày |
| 8. Go-live | Bắt buộc | 0,5 ngày |
