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
