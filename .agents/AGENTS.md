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

### 💬 Phong cách giao tiếp (Scannable & No-Fluff — *từ Caveman & I Have ADHD*)
- **TL;DR First**: Luôn đưa tóm tắt ngắn gọn/kết luận chính lên đầu phản hồi.
- **Scannable Layout**: Trình bày bằng bullet points, **in đậm** từ khóa và thuật ngữ quan trọng. Tránh viết đoạn văn xuôi dài gây mỏi mắt.
- **No-Fluff**: Bỏ qua các câu chào hỏi, xã giao rườm rà. Đi thẳng vào giải pháp kỹ thuật, code diff và câu hỏi trọng tâm.

### ⚙️ Kỷ luật kỹ thuật (Engineering Discipline)
1. **Think Before Coding**: Không giả định hay đoán mò. Làm rõ yêu cầu và cân nhắc phương án trước khi code.
2. **Simplicity First**: Viết lượng code tối thiểu để giải quyết bài toán. Tránh over-engineering.
3. **Surgical Changes**: Chỉ sửa đổi những file thực sự liên quan. Tự dọn dẹp các biến và import thừa sau khi hoàn tất.
4. **Context First**: Luôn đọc kỹ tài liệu đặc tả (specs) và Database Schema trước khi code.
5. **Document First**: Cập nhật tài liệu specs/API trước khi code, đặc biệt là các thay đổi liên quan đến DB.
6. **Verification Gate**: Bắt buộc phải kiểm thử/xác thực (chạy test, gọi API hoặc test kịch bản) trước khi bàn giao. Không bao giờ coi task hoàn tất nếu chưa được verify.
7. **Type Safety**: Tuyệt đối không dùng `any`. Luôn định nghĩa rõ kiểu dữ liệu cho Props, State và API DTO.
8. **Web Performance**: Hạn chế re-render thừa, kiểm soát kích thước bundle, áp dụng phân trang/virtualization cho danh sách dữ liệu lớn.

### Quy ước Database
- **ID**: Luôn dùng UUID (`gen_random_uuid()`).
- **Timestamp**: Luôn dùng `timestamptz`, mặc định `now()`.
- **Tiền tệ**: `numeric(12,2)` đại diện cho VND, ánh xạ `BigDecimal` trong backend Java.
- **Enum / Status**: Các trường mới ưu tiên dùng VARCHAR(20..32) kết hợp Java Enum (@Enumerated(EnumType.STRING)). Các trường cũ giữ nguyên theo schema hiện có.
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
| Nghiệp vụ & Core Rules chính | [docs/SYSTEM_SPEC.md](docs/SYSTEM_SPEC.md) |
| Đặc tả Core Rules & Gotchas | [docs/SYSTEM_SPEC.md §7](docs/SYSTEM_SPEC.md#L521) |
| Kế hoạch sprint & test checklist | [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) |
| Database schema | [database/migrations/20240101000000_core_schema.sql](database/migrations/20240101000000_core_schema.sql) |
| Tập lệnh SQL Tests | [database/tests/test_full_workflows.sql](database/tests/test_full_workflows.sql) |
| Bảng thuật ngữ | [docs/glossary.md](docs/glossary.md) |
| Đặc tả Use Cases | [docs/use_cases/](docs/use_cases) |
| API Contracts | [docs/api-contracts/](docs/api-contracts) |
| Tiến độ Sprint hiện tại | [task.md](task.md) |
