# API Documentation — Đăng ký & Đăng nhập

**Base URL:** `http://localhost:8080`

---

## 1. API: Đăng ký tài khoản (Cho Customer)

- **Endpoint:** POST `/api/local-auth/register`
- **Description:** Customer tạo tài khoản mới bằng email/password. BE hash password bằng BCrypt, tạo user với role = "customer", trả JWT.
- **Request Body (JSON):**

```json
{
  "email": "nguyen.vana@gmail.com",
  "password": "MyStr0ng!Pass",
  "confirmPassword": "MyStr0ng!Pass",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567"            // (Optional)
}
```

- **Validation:**
  - `email`: bắt buộc, format email hợp lệ, chưa tồn tại trong DB
  - `password`: bắt buộc, tối thiểu 8 ký tự, có chữ hoa + chữ thường + số
  - `confirmPassword`: bắt buộc, phải khớp password
  - `fullName`: bắt buộc, 2–150 ký tự
  - `phone`: optional, format VN `0xxxxxxxxx`

- **Response Body (JSON) — 201 Created:**

```json
{
  "status": "success",
  "message": "Đăng ký thành công.",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "nguyen.vana@gmail.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0901234567",
      "avatarUrl": null,
      "role": "customer",             // Mặc định customer
      "status": "active",
      "branchId": null,
      "branchName": null,
      "createdAt": "2026-05-19T04:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",   // JWT, exp = 1 giờ
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2gg...", // exp = 30 ngày
    "expiresIn": 3600                             // seconds
  }
}
```

- **Error Responses:**

```json
// 409 Conflict — Email đã tồn tại
{
  "error": "conflict",
  "message": "Email này đã được đăng ký."
}

// 400 Bad Request — Validation lỗi
{
  "error": "validation_failed",
  "fields": {
    "password": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
    "confirmPassword": "Mật khẩu xác nhận không khớp"
  }
}
```

- *Note cho FE:* Sau khi nhận response thành công, FE lưu `accessToken` và `refreshToken` vào localStorage. Mọi request sau đó gửi header `Authorization: Bearer <accessToken>`.

---

## 2. API: Đăng nhập (Cho tất cả role)

- **Endpoint:** POST `/api/local-auth/login`
- **Description:** User đăng nhập bằng email/password. BE verify password, kiểm tra tài khoản active, trả JWT kèm thông tin user.
- **Request Body (JSON):**

```json
{
  "email": "nguyen.vana@gmail.com",
  "password": "MyStr0ng!Pass"
}
```

- **Response Body (JSON) — 200 OK:**

```json
{
  "status": "success",
  "message": "Đăng nhập thành công.",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "nguyen.vana@gmail.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0901234567",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "customer",            // "customer" | "staff" | "admin"
      "status": "active",
      "branchId": null,              // null nếu customer/super admin
      "branchName": null             // có giá trị nếu staff hoặc branch admin
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2gg...",
    "expiresIn": 3600
  }
}
```

- **Error Responses:**

```json
// 401 Unauthorized — Sai email hoặc password
{
  "error": "unauthorized",
  "message": "Email hoặc mật khẩu không đúng."
}

// 403 Forbidden — Tài khoản bị khóa
{
  "error": "forbidden",
  "message": "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."
}
```

- *Note cho FE:* FE dùng `user.role` và `user.branchId` để redirect:
  - `role = "customer"` → `/customer/explore`
  - `role = "staff"` → `/staff/dashboard`
  - `role = "admin"` + `branchId = null` → `/admin/dashboard` (Super Admin)
  - `role = "admin"` + `branchId != null` → `/branch-admin/dashboard` (Branch Admin)

---

## 3. API: Đăng nhập bằng Google (Cho Customer)

- **Endpoint:** POST `/api/auth/sync`
- **Description:** Sau khi FE đăng nhập Google qua Supabase SDK và nhận được JWT, FE gọi API này để đồng bộ user vào bảng `users` trong DB. Nếu user chưa tồn tại → tạo mới. Đã tồn tại → cập nhật avatar/name.
- **Request Headers:** `Authorization: Bearer <supabase_jwt>`
- **Request Body:** không cần (BE lấy thông tin từ JWT claims)

- **Response Body (JSON) — 200 OK:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // = jwt.sub
  "email": "nguyen.vana@gmail.com",
  "fullName": "Nguyễn Văn A",                      // từ Google profile
  "phone": null,
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",  // từ Google
  "role": "customer",
  "status": "active",
  "branchId": null,
  "branchName": null,
  "createdAt": "2026-05-19T04:30:00Z",
  "updatedAt": "2026-05-19T04:30:00Z"
}
```

- *Note cho FE:* Flow Google login:
  1. FE gọi `supabase.auth.signInWithOAuth({ provider: 'google' })`
  2. User authorize trên Google → redirect về app
  3. FE gọi `POST /api/auth/sync` với Bearer JWT từ Supabase
  4. FE gọi `GET /api/auth/me` để lấy profile đầy đủ

---

## 4. API: Lấy thông tin user hiện tại (Cho tất cả role)

- **Endpoint:** GET `/api/auth/me`
- **Description:** Lấy profile user đang đăng nhập. FE gọi API này mỗi khi reload trang hoặc sau khi login để lấy thông tin role, branch.
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Request Params:** không có

- **Response Body (JSON) — 200 OK:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "nguyen.vana@gmail.com",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "avatarUrl": "https://example.com/avatar.jpg",
  "role": "customer",
  "status": "active",
  "branchId": null,
  "branchName": null
}
```

- **Error Response:**

```json
// 401 Unauthorized — Token hết hạn hoặc không hợp lệ
{
  "error": "unauthorized",
  "message": "JWT token không hợp lệ hoặc đã hết hạn."
}
```

- *Note cho FE:* API này đã tồn tại trong `AuthController.java`. Hiện chỉ đọc từ JWT claims, cần nâng cấp để query thêm từ bảng `users` (lấy phone, status).

---

## 5. API: Refresh Token (Cho tất cả role)

- **Endpoint:** POST `/api/local-auth/refresh`
- **Description:** Khi accessToken hết hạn (exp = 1 giờ), FE gọi API này để lấy cặp token mới mà không cần đăng nhập lại. Refresh token cũ bị vô hiệu hóa sau khi dùng (rotation).
- **Request Body (JSON):**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2gg..."
}
```

- **Response Body (JSON) — 200 OK:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...(mới)...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9r...(mới, rotated)...",
  "expiresIn": 3600
}
```

- **Error Response:**

```json
// 401 Unauthorized
{
  "error": "unauthorized",
  "message": "Refresh token không hợp lệ hoặc đã hết hạn."
}
```

- *Note cho FE:* FE nên dùng axios interceptor: khi nhận 401 → tự động gọi refresh → retry request ban đầu. Nếu refresh cũng 401 → redirect về trang login.

---

## 6. API: Quên mật khẩu (Cho tất cả role)

- **Endpoint:** POST `/api/local-auth/forgot-password`
- **Description:** User nhập email → BE gửi link reset password qua email. API luôn trả 200 dù email có tồn tại hay không (tránh leak thông tin).
- **Request Body (JSON):**

```json
{
  "email": "nguyen.vana@gmail.com"
}
```

- **Response Body (JSON) — 200 OK (luôn luôn):**

```json
{
  "status": "success",
  "message": "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu."
}
```

- *Note cho FE:* Link trong email có dạng: `http://localhost:5173/reset-password?token={uuid}`. Token có hiệu lực 30 phút.

---

## 7. API: Đặt lại mật khẩu (Cho tất cả role)

- **Endpoint:** POST `/api/local-auth/reset-password`
- **Description:** User click link từ email, nhập mật khẩu mới. BE verify token, hash password mới, cập nhật DB.
- **Request Body (JSON):**

```json
{
  "token": "f47ac10b-58cc-4372-a567-0e02b2c3d479",  // từ URL param
  "newPassword": "NewStr0ng!Pass",
  "confirmPassword": "NewStr0ng!Pass"
}
```

- **Response Body (JSON) — 200 OK:**

```json
{
  "status": "success",
  "message": "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại."
}
```

- **Error Response:**

```json
// 400 Bad Request — Token hết hạn hoặc đã dùng
{
  "error": "bad_request",
  "message": "Token không hợp lệ hoặc đã hết hạn."
}
```

---

## 8. API: Đăng xuất (Cho tất cả role)

- **Endpoint:** POST `/api/auth/logout`
- **Description:** FE gọi để thông báo BE xóa session/cache phía server. Logout chính xử lý bởi Supabase client hoặc xóa localStorage token.
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body:** không cần

- **Response Body (JSON) — 200 OK:**

```json
{
  "status": "ok",
  "message": "Đăng xuất thành công."
}
```

- *Note cho FE:* Sau khi gọi API này, FE cần:
  1. Xóa `accessToken` và `refreshToken` khỏi localStorage
  2. Gọi `supabase.auth.signOut()` (nếu dùng Supabase)
  3. Redirect về trang login

---

## 9. API: Cập nhật thông tin cá nhân (Cho tất cả role)

- **Endpoint:** PUT `/api/auth/update-profile`
- **Description:** User cập nhật họ tên, SĐT, avatar. Không cho phép đổi email hoặc role qua API này.
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body (JSON):**

```json
{
  "fullName": "Nguyễn Văn B",        // bắt buộc, 2–150 ký tự
  "phone": "0987654321",              // optional, format VN
  "avatarUrl": "https://example.com/avatar.jpg"  // optional, URL hợp lệ
}
```

- **Response Body (JSON) — 200 OK:**

```json
{
  "id": "a1b2c3d4-...",
  "email": "nguyen.vana@gmail.com",   // không đổi
  "fullName": "Nguyễn Văn B",        // đã cập nhật
  "phone": "0987654321",
  "avatarUrl": "https://example.com/avatar.jpg",
  "role": "customer",                // không đổi
  "status": "active",
  "branchId": null,
  "branchName": null,
  "updatedAt": "2026-05-19T05:00:00Z"
}
```

- **Error Response:**

```json
// 400 Bad Request
{
  "error": "validation_failed",
  "fields": {
    "fullName": "Họ tên không được để trống",
    "phone": "Số điện thoại không hợp lệ"
  }
}
```

---

## Tổng hợp Endpoints

| # | Method | Endpoint | Auth | Mô tả |
|---|--------|----------|------|--------|
| 1 | POST | `/api/local-auth/register` | 🔓 Public | Đăng ký |
| 2 | POST | `/api/local-auth/login` | 🔓 Public | Đăng nhập |
| 3 | POST | `/api/auth/sync` | 🔒 JWT | Đồng bộ user Google |
| 4 | GET | `/api/auth/me` | 🔒 JWT | Lấy profile |
| 5 | POST | `/api/local-auth/refresh` | 🔓 Public | Refresh token |
| 6 | POST | `/api/local-auth/forgot-password` | 🔓 Public | Quên mật khẩu |
| 7 | POST | `/api/local-auth/reset-password` | 🔓 Public | Đặt lại mật khẩu |
| 8 | POST | `/api/auth/logout` | 🔒 JWT | Đăng xuất |
| 9 | PUT | `/api/auth/update-profile` | 🔒 JWT | Cập nhật profile |
