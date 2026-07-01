# 🧠 CoSpace AI Agent Configuration — AGENTS.md

> **Mục đích**: File này định hình các quy tắc ứng xử, quy ước viết code và cách tổ chức hệ thống của AI Agent trong dự án. Mọi Agent phải đọc file này đầu tiên trước khi làm việc.

---

## 📌 Dự Án

- **Tên**: CoSpace — Hệ thống Quản lý Co-working Space & Mạng lưới Kết nối Đối tác
- **Stack**: Spring Boot (Java 17) + React/TypeScript + PostgreSQL + Supabase Auth
- **Giai đoạn**: MVP (17+ bảng, 4 roles, 6 sprints)
- **Tiền tệ**: VND
- **Timezone mặc định**: Asia/Ho_Chi_Minh

---

## 📂 Cấu Trúc Dự Án Tối Giản

```
DA/
├── .agents/                         # AI Agent configuration & skills
├── docs/                            # 📖 Tài liệu nghiệp vụ & thiết kế hoạt động
│   ├── SYSTEM_SPEC.md               # Đặc tả hệ thống tổng quát & 44+ Core Rules (§7)
│   ├── DEVELOPMENT_PLAN.md          # Kế hoạch phát triển 6 sprints
│   ├── Database_dbdiagram_script.dbml
│   ├── glossary.md                  # Từ điển thuật ngữ nghiệp vụ
│   ├── api-contracts/               # 📡 API Specs chi tiết (Request/Response JSON)
│   ├── use_cases/                   # Đặc tả Use Cases chi tiết
│   └── archive/                     # Lưu trữ tài liệu lịch sử (GOAL analysis, etc.)
├── database/                        # 🗄️ Database scripts
│   ├── migrations/                  # Schema migrations
│   └── tests/                       # SQL test workflows chạy trực tiếp
├── BE/                              # ⚙️ Backend (Spring Boot)
├── FE/                              # 🎨 Frontend (React/TypeScript)
├── task.md                          # ✅ Task checklist (tracking tiến độ dự án)
└── .gitignore
```

---

## 🎭 Skills / Modes

Agent tự động chuyển đổi hành vi dựa trên ngữ cảnh hoặc khi người dùng gọi trực tiếp bằng các tag `[Mode_Name]`:
- **🟢 [Plan / Khởi động]**: Áp dụng khung tư duy **GOAL** để làm rõ yêu cầu, đặt câu hỏi phản biện, và lập `implementation_plan.md` trước khi code.
- **🔴 [Brainstorm nghiệp vụ]**: Critique nặng tay các giả định, tìm edge cases, và so sánh đối chiếu với các tài liệu sống.
- **🔵 [Thiết kế & Giải pháp]**: Sử dụng khung **PREP** + **SWOT** để thiết kế cấu trúc/kiến trúc, tạo ADR khi cần.
- **🟡 [Nghiên cứu công nghệ]**: Sử dụng kỹ thuật Feynman để giải thích bình dân học vụ, không dùng jargon.

---

## 📏 Quy Tắc Ứng Xử (Rules)

### Nguyên tắc chung (Karpathy's Guidelines)
1. **Think Before Coding**: Không giả định hay giấu sự mơ hồ. Trình bày rõ các phương án lựa chọn.
2. **Simplicity First (Tinh gọn)**: Chỉ viết lượng code TỐI THIỂU để giải quyết bài toán. Tránh speculate features.
3. **Surgical Changes**: Chỉ sửa đổi những file thực sự cần. Tự dọn dẹp các biến/import thừa sau khi hoàn tất.
4. **Đọc trước, code sau**: Luôn tham chiếu [SYSTEM_SPEC.md](file:///d:/DA/docs/SYSTEM_SPEC.md) và Database Schema trước khi code.
5. **Document-first**: Cập nhật tài liệu specs/API trước khi code, đặc biệt là các thay đổi liên quan đến DB.

### Quy ước Database
- **ID**: Luôn dùng UUID (`gen_random_uuid()`).
- **Timestamp**: Luôn dùng `timestamptz`, mặc định `now()`.
- **Tiền tệ**: `numeric(12,2)` đại diện cho VND.
- **Enum**: Sử dụng PostgreSQL custom ENUM types, không dùng varchar thông thường.
- **Naming**: snake_case cho table và column.
- **Patterns**: Constraint đặt tên dạng `check_<table>_<rule>` hoặc `fk_<table>_<ref>`.

### Quy ước API
- Thiết kế RESTful, JSON body.
- Auth: Supabase JWT -> Backend verify -> Tìm user tương ứng trong bảng `users`.
- Định dạng lỗi: `{ "error": "<code>", "message": "<detail>" }`.

---

## 🔗 Tài Liệu Tham Chiếu Nhanh

| Mục đích | Tài liệu |
|---|---|
| Nghiệp vụ & Core Rules chính | [SYSTEM_SPEC.md](file:///d:/DA/docs/SYSTEM_SPEC.md) |
| Đặc tả Core Rules & Gotchas | **[SYSTEM_SPEC.md §7 (Quy Tắc & Ràng Buộc)](file:///d:/DA/docs/SYSTEM_SPEC.md#L521)** |
| Kế hoạch sprint & test checklist | [DEVELOPMENT_PLAN.md](file:///d:/DA/docs/DEVELOPMENT_PLAN.md) |
| Database schema | [20240101000000_core_schema.sql](file:///d:/DA/database/migrations/20240101000000_core_schema.sql) |
| Tập lệnh SQL Tests | [test_full_workflows.sql](file:///d:/DA/database/tests/test_full_workflows.sql) |
| Bảng thuật ngữ | [glossary.md](file:///d:/DA/docs/glossary.md) |
| Đặc tả Use Cases | [docs/use_cases/](file:///d:/DA/docs/use_cases) |
| API Contracts | [docs/api-contracts/](file:///d:/DA/docs/api-contracts) |
| Tiến độ Sprint hiện tại | [task.md](file:///d:/DA/task.md) |
