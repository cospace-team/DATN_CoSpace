# Deploy CoSpace — checklist

> Backend: Spring Boot trên **Render** (Docker, `BE/Dockerfile`). Frontend: Vite SPA trên **Vercel** (`FE/vercel.json`). Database: **Supabase** Postgres.
> Chi tiết lý do của từng mục bảo mật: xem [PRODUCTION_READINESS_PLAN.md](PRODUCTION_READINESS_PLAN.md).

## 1. Backend (Render → Environment)

**Bắt buộc** — thiếu thì app không khởi động (cố ý, để không chạy với giá trị mặc định công khai):

| Biến | Ghi chú |
|---|---|
| `SPRING_PROFILES_ACTIVE=prod` | Không có biến này, app chạy profile dev: nạp `data.sql` vào DB thật mỗi lần khởi động, log mọi câu SQL, và PayOS có thể rơi vào chế độ demo (khách tự xác nhận "đã thanh toán"). |
| `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD` | Dùng transaction pooler (cổng 6543). |
| `APP_JWT_SECRET` | ≥ 48 byte: `openssl rand -base64 48`. |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Giá trị thật từ my.payos.vn; profile prod từ chối giá trị `demo-*`. |
| `PAYOS_RETURN_URL` | `https://datn-cospace.onrender.com/api/payments/payos/return` |
| `PAYOS_CANCEL_URL` | `https://<domain-vercel>/customer/checkout` |
| `APP_CORS_ALLOWED_ORIGINS` | Domain Vercel, ví dụ `https://datn-co-space.vercel.app,https://cospace-*-kiokamas-projects.vercel.app`. Không dùng `https://*.vercel.app`. |
| `APP_FRONTEND_BASE_URL` | Domain Vercel chính — trang thanh toán trả khách về đây. |

**Nên đặt:** `SUPABASE_JWT_ISSUER`, `GEMINI_API_KEY` (chatbot), `SUPABASE_SERVICE_ROLE_KEY` (upload ảnh không gian), `APP_BACKEND_BASE_URL` (mặc định ở profile prod: `https://datn-cospace.onrender.com` — dùng cho URL callback của MoMo), `MOMO_*` nếu dùng tài khoản MoMo thật.

Ngoài Render:
- **PayOS dashboard → Webhook URL:** `https://datn-cospace.onrender.com/api/payments/payos/webhook`.
- **Supabase → Advisors (Security):** bật RLS cho mọi bảng `public` (FE chỉ dùng Supabase cho đăng nhập Google).

## 2. Frontend (Vercel → Environment Variables, môi trường Production)

| Biến | Ghi chú |
|---|---|
| `VITE_API_BASE_URL` | `https://datn-cospace.onrender.com`. Nếu backend đổi địa chỉ, sửa cả `connect-src` trong `FE/vercel.json`, nếu không trình duyệt chặn mọi request. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Thiếu thì riêng đăng nhập Google không hoạt động. |
| `VITE_SITE_URL` | Tuỳ chọn; trống thì dùng domain production của Vercel cho ảnh link-preview. |

Biến `VITE_*` được nhúng lúc build: đổi giá trị thì phải **Redeploy**.

## 3. Sau khi deploy

1. `https://datn-cospace.onrender.com/api/health` → `"status":"UP","database":"UP"`.
2. Log Render có `PayOS production credentials verified` và `Successfully applied … migrations` (hoặc `Schema "public" is up to date`).
3. Trang chủ hiện danh sách chi nhánh; DevTools không có lỗi `Refused to connect` (CSP) hay CORS.
4. Đăng nhập email → Khám phá → chọn chỗ → Checkout hiện giá và đồng hồ giữ chỗ.
5. Một giao dịch thử PayOS/MoMo quay về `/customer/history` với trạng thái đã thanh toán.

## 4. Kiểm tra lại trên máy (không cần Render)

Chạy đúng jar production với Postgres tạm để chắc migration và cấu hình `prod` khởi động được:

```bash
cd BE && mvn -B -DskipTests package
SPRING_PROFILES_ACTIVE=prod PORT=18080 \
SUPABASE_DB_URL=jdbc:postgresql://localhost:5432/cospace SUPABASE_DB_USERNAME=postgres SUPABASE_DB_PASSWORD=postgres SUPABASE_DB_SSL_MODE=disable \
APP_JWT_SECRET=$(openssl rand -base64 48) \
PAYOS_CLIENT_ID=x PAYOS_API_KEY=x PAYOS_CHECKSUM_KEY=x PAYOS_RETURN_URL=http://localhost:18080/api/payments/payos/return PAYOS_CANCEL_URL=http://localhost:5173/customer/checkout \
java -jar target/cospace-api-1.0.0.jar
curl localhost:18080/api/health
```

## 5. Quy trình CI/CD (GitHub Actions)

Dự án thiết lập 2 luồng tự động hóa chuyên biệt tại `.github/workflows/`:

### A. Continuous Integration (`ci.yml`)
- **Trigger**: Mọi `pull_request` và `push` vào nhánh `main`, `develop`.
- **Backend CI (`backend-ci`)**:
  - Chạy trên `ubuntu-latest` với JDK 17 (Eclipse Temurin) + cache Maven.
  - Chạy toàn bộ 427+ bộ kiểm thử đơn vị & kiểm tra bảo mật (`./mvnw clean test`).
  - Kiểm tra tính toàn vẹn của container đóng gói bằng Docker Buildx (`BE/Dockerfile`).
- **Frontend CI (`frontend-ci`)**:
  - Chạy trên Node.js 20.x + cache npm (`FE/package-lock.json`).
  - Cài đặt sạch (`npm ci`) và kiểm tra nghiêm ngặt kiểu dữ liệu TypeScript kết hợp build gói tĩnh Vite (`tsc && vite build`).
- **CI Status Gate (`ci-status`)**:
  - Tổng hợp trạng thái của 2 job; đóng vai trò là Required Status Check bắt buộc pass trước khi merge PR.

### B. Continuous Deployment (`cd.yml`)
- **Trigger**: Tự động kích hoạt khi workflow `CI - Test & Build` hoàn thành thành công trên nhánh `main`, hoặc chạy thủ công bằng `workflow_dispatch`.
- **Triển khai Backend (Render)**: Gửi request POST kích hoạt Deploy Hook URL của Render Web Service (Zero-downtime Rolling Update).
- **Triển khai Frontend (Vercel)**: Kích hoạt Deploy Hook URL của Vercel (hoặc tự động thông qua GitHub Vercel App).
- **Health Check & Verification**: Thăm dò tự động endpoint `/api/health` sau khi deploy (tối đa 10 lần với chu kỳ 15s) và xuất báo cáo trạng thái vào `GitHub Step Summary`.

### C. Cấu hình GitHub Secrets (Khoá triển khai)
Vào **GitHub Repository → Settings → Secrets and variables → Actions** và thêm các biến:

| Secret Name | Bắt buộc | Mô tả & Cách lấy |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Khuyên dùng cho CD | Render Dashboard → Chọn Web Service `cospace-api` → **Settings** → **Deploy Hook** → Sao chép URL (`https://api.render.com/deploy/srv-xxx?key=yyy`). |
| `VERCEL_DEPLOY_HOOK_URL` | Tuỳ chọn | Vercel Dashboard → Chọn Project → **Settings** → **Git** → **Deploy Hooks** → Tạo hook cho nhánh `main`. *(Bỏ qua nếu đã liên kết GitHub App trực tiếp)*. |
| `APP_BACKEND_URL` | Tuỳ chọn | Mặc định: `https://datn-cospace.onrender.com` dùng để thăm dò Health Check. |

### D. Kiểm thử tải & Giả lập người dùng đồng thời (Concurrency Testing)

Hệ thống cung cấp 2 giải pháp giả lập người dùng đồng thời:

1. **Trên GitHub Actions (`.github/workflows/concurrency-test.yml`)**:
   - Dùng **Grafana k6** để tạo sóng tải (Ramp-up → Peak → Ramp-down) với 10 đến 100 người dùng ảo đồng thời (VUs).
   - Kích hoạt chủ động qua **Actions → Concurrency & Load Testing (k6) → Run workflow**:
     - `target_url`: Mặc định `https://datn-cospace.onrender.com`.
     - `concurrency_vus`: Chọn `10`, `25`, `50`, hoặc `100` VUs.
     - `duration`: `30s`, `1m`, `2m`, hoặc `3m`.
     - `test_mode`: `read-heavy` (duyệt chi nhánh, bảng giá, sức khỏe) hoặc `full-journey` (kèm đăng nhập xác thực).
   - Tự động xuất biểu đồ và bảng phân phối độ trễ (Avg, P50, P90, P95, P99, Max, Throughput req/s, Error rate) vào **GitHub Step Summary**.

2. **Chạy cục bộ / CLI (Zero-dependency Python Runner)**:
   ```bash
   # Chạy test tải 30 người dùng đồng thời, 100 requests tới Render:
   npm run test:load

   # Hoặc gọi trực tiếp Python:
   python tests/load/concurrent_simulation.py --url https://datn-cospace.onrender.com --users 50 --requests 200

   # Kiểm thử API cục bộ (Localhost:8080):
   python tests/load/concurrent_simulation.py --url http://localhost:8080 --users 30 --requests 100
   ```


