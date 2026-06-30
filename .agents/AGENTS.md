# 🧠 CoSpace AI Agent Configuration — AGENTS.md

> **Mục đích**: File này là "bộ luật" trung tâm giúp AI Agent duy trì ngữ cảnh nhất quán qua nhiều phiên chat. Mọi AI Agent đọc file này đầu tiên trước khi thao tác trong dự án.

---

## 📌 Dự Án

- **Tên**: CoSpace — Hệ thống Quản lý Co-working Space & Mạng lưới Kết nối Đối tác
- **Stack**: Spring Boot (Java 17) + React/TypeScript + PostgreSQL + Supabase Auth
- **Giai đoạn**: MVP (17+ bảng, 4 roles, 6 sprints)
- **Tiền tệ**: VND
- **Timezone mặc định**: Asia/Ho_Chi_Minh

---

## 📂 Cấu Trúc Dự Án (Project Structure)

```
DA/
├── .agents/                         # AI Agent configuration
│   ├── AGENTS.md                    # ← FILE NÀY (luật chơi trung tâm)
│   └── skills/                      # Plugin skills (Supabase, etc.)
├── docs/                            # 📖 Tài liệu nghiệp vụ & thiết kế
│   ├── SYSTEM_SPEC.md               # Đặc tả hệ thống tổng quát
│   ├── DEVELOPMENT_PLAN.md          # Kế hoạch phát triển 6 sprints
│   ├── Database_dbdiagram_script    # ERD script (dbdiagram.io format)
│   ├── Workflows_va_SQL_Test.md     # Mô tả luồng + SQL test
│   ├── auth_api_documentation.md    # Tài liệu API Auth
│   ├── working_methodology.md       # Phương pháp làm việc nhóm
│   ├── business/                    # 📋 Phân tích nghiệp vụ (BA)
│   │   ├── GOAL_analysis.md         # Phân tích khung GOAL
│   │   ├── use_cases/               # Use Case diagrams & specs
│   │   ├── user_stories/            # User Stories theo epic
│   │   └── glossary.md              # Từ điển thuật ngữ nghiệp vụ
│   ├── architecture/                # 🏗️ Thiết kế kiến trúc
│   │   ├── system_context.md        # C4 Level 1 — System Context
│   │   ├── container_diagram.md     # C4 Level 2 — Container
│   │   ├── component_diagram.md     # C4 Level 3 — Component
│   │   └── decisions/               # ADR — Architecture Decision Records
│   └── api-contracts/               # 📡 API Specs chi tiết (Request/Response)
│       ├── auth.md
│       ├── spaces.md
│       ├── bookings.md
│       └── ...
├── database/                        # 🗄️ Database scripts
│   ├── migration_v1_core_schema.sql # Schema chính
│   ├── test_core_workflows.sql      # SQL test luồng chính
│   ├── seeds/                       # Dữ liệu mẫu
│   └── migrations/                  # Migration files theo version
├── BE/                              # ⚙️ Backend (Spring Boot)
├── FE/                              # 🎨 Frontend (React/TypeScript)
├── report/                          # 📄 Báo cáo đồ án
├── task.md                          # ✅ Task checklist (tracking tiến độ)
└── .gitignore
```

---

## 🎭 Skills / Modes (Kích hoạt bằng từ khóa)

AI Agent tự động chuyển đổi "mode" khi nhận ra từ khóa hoặc ngữ cảnh phù hợp. Người dùng có thể gọi trực tiếp bằng tag `[Mode_Name]`.

### 🟢 [Plan / Khởi động]
> **Trigger**: Bắt đầu task mới, cần clarify yêu cầu, lập kế hoạch
> **Khung tư duy**: GOAL framework + /grill-me interview

**Hành vi:**
- Dùng khung **GOAL** (Goal → Objectives → Actions → Limits) để mổ xẻ yêu cầu
- Đặt câu hỏi phản biện để phát hiện lỗ hổng logic trước khi code
- Tạo `implementation_plan.md` và chờ user approve trước khi thực thi
- Không viết code cho đến khi plan được duyệt

### 🔴 [Brainstorm nghiệp vụ]
> **Trigger**: Thảo luận tính năng mới, review nghiệp vụ, tìm lỗ hổng
> **Khung tư duy**: Critique (Devil's Advocate) + Rubber Ducking

**Hành vi:**
- **Critique mode**: Nhặt sạn NẶNG TAY — chỉ trích mọi giả định, tìm edge case, phát hiện inconsistency
- **Rubber Ducking**: Khi user mô tả vấn đề mơ hồ, hỏi ngược liên tục để user tự phát hiện vấn đề
- Luôn đối chiếu với `SYSTEM_SPEC.md` và `DEVELOPMENT_PLAN.md` để tìm mâu thuẫn
- Output: Danh sách vấn đề + đề xuất giải pháp, format bảng rõ ràng

### 🔵 [Thiết kế & Giải pháp]
> **Trigger**: Thiết kế database, kiến trúc, API contract, chọn pattern
> **Khung tư duy**: PREP (Point → Reason → Example → Point) + SWOT

**Hành vi:**
- Mỗi quyết định thiết kế phải theo khung **PREP**: Nêu quan điểm → Giải thích lý do → Ví dụ cụ thể → Kết luận
- Khi có nhiều phương án, dùng **SWOT** (Strengths/Weaknesses/Opportunities/Threats) để so sánh
- Tạo ADR (Architecture Decision Record) cho quyết định quan trọng
- Đảm bảo mọi thay đổi database đều có migration script
- Luôn kiểm tra backward compatibility

### 🟡 [Nghiên cứu công nghệ]
> **Trigger**: Giải thích concept, so sánh công nghệ, onboard kiến thức mới
> **Khung tư duy**: Feynman Technique (giải thích bình dân học vụ)

**Hành vi:**
- Giải thích như đang dạy cho sinh viên năm nhất: **không jargon**, dùng ví dụ đời thường
- Nếu cần so sánh, dùng bảng đối chiếu với ✅/❌
- Cung cấp code snippet minh họa ngắn gọn
- Kết thúc bằng "Tóm lại 1 câu: ..." để chốt ý

---

## 📏 Quy Tắc Ứng Xử (Rules)

### Nguyên tắc chung (Karpathy's Guidelines)
1. **Think Before Coding**: Không giả định. Không giấu sự nhầm lẫn/chưa rõ. Nếu có nhiều cách hiểu, hãy trình bày rõ các lựa chọn. Nếu thấy có hướng giải quyết đơn giản hơn, hãy đề xuất.
2. **Simplicity First (Tinh gọn)**: Chỉ viết lượng code TỐI THIỂU để giải quyết bài toán. Không thêm feature/abstraction thừa, không code phòng hờ (speculative), không bắt lỗi những kịch bản không thể xảy ra. Hãy tự hỏi: "Senior Engineer có nói đoạn code này đang làm phức tạp hóa vấn đề không?"
3. **Surgical Changes (Sửa đổi cục bộ)**: Chỉ chạm vào những file thật sự cần. Không tự ý refactor những thứ không hỏng. Sửa code xong phải dọn dẹp các biến/import thừa do BẠN tạo ra, nhưng giữ nguyên dead code cũ (trừ khi được yêu cầu).
4. **Goal-Driven Execution**: Mọi task phải quy về kết quả có thể test/verify được. Loop (lặp) liên tục để verify sau mỗi bước thay đổi nhỏ. 
5. **Đọc trước, code sau**: Luôn đọc `SYSTEM_SPEC.md`, `DEVELOPMENT_PLAN.md`, và schema DB.
6. **Document-first**: Cập nhật tài liệu TRƯỚC KHI code, đặc biệt với database changes.

### Database conventions
- **ID**: UUID everywhere (gen_random_uuid())
- **Timestamp**: Luôn dùng `timestamptz`, default `now()`
- **Soft delete**: Không dùng ở MVP (V2+)
- **Email**: Dùng `citext` extension
- **Money**: `numeric(12,2)`, currency = VND
- **Enum**: Tạo PostgreSQL ENUM types, không dùng varchar
- **Naming**: snake_case cho bảng và cột
- **Constraint pattern**: `check_<table>_<rule>` hoặc `fk_<table>_<ref>`
- **Index naming**: `idx_<table>_<columns>`

### API conventions
- RESTful, JSON body
- Auth: Supabase JWT → BE verify → tìm user trong bảng `users`
- Error format: `{ "error": "<code>", "message": "<detail>" }`
- Pagination: `?page=1&size=20`

### Git conventions
- Branch: `feature/<module>-<description>`, `fix/<issue>`, `docs/<topic>`
- Commit: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- PR: Tag người kia review trước khi merge vào `main`

---

## 🔗 Tài Liệu Tham Chiếu Nhanh (Quick Reference)

| Cần gì? | Xem file nào? |
|---------|--------------|
| Nghiệp vụ tổng quát | `docs/SYSTEM_SPEC.md` |
| Kế hoạch sprint | `docs/DEVELOPMENT_PLAN.md` |
| Database schema | `database/migration_v1_core_schema.sql` |
| ERD diagram | `docs/Database_dbdiagram_script` |
| SQL test | `database/test_core_workflows.sql` + `docs/Workflows_va_SQL_Test.md` |
| Auth API | `docs/auth_api_documentation.md` |
| Tiến độ hiện tại | `task.md` |
| Cách làm việc nhóm | `docs/working_methodology.md` |
| Phân tích GOAL | `docs/business/GOAL_analysis.md` |
| Quyết định nghiệp vụ | `docs/business/GOAL_decisions.md` |
| Từ điển thuật ngữ | `docs/business/glossary.md` |
| Use Cases | `docs/business/use_cases/` |
| API Contract: Booking | `docs/api-contracts/bookings.md` |
| Notifications migration | `database/migrations/migration_v2_notifications.sql` |

---

## ⚠️ Gotchas & Cảnh Báo

1. **`password_hash` trong bảng `users` KHÔNG DÙNG ở MVP** — Supabase Auth tự quản lý password
2. **`auth_accounts.user_id` KHÔNG UNIQUE** — 1 user có thể link nhiều OAuth provider
3. **Customer KHÔNG ĐƯỢC chọn thanh toán tiền mặt** — Chỉ Staff/Admin mới tạo đơn cash
4. **Booking overlap check ở APP LAYER** — Dùng `SELECT FOR UPDATE` + INDEX, không dùng DB EXCLUDE constraint
5. **Refund chỉ ghi nhận nội bộ ở MVP** — Không payout thực tế ra MoMo
6. **`is_contract` tự động set** — Khi `duration_unit` = week/month → `is_contract = true`
7. **Role mapping BE → FE**: DB có 4 roles, FE nhận 3 roles (admin, staff, customer). Phân biệt super_admin vs branch_admin bằng `branchId`
8. **1 booking = 1 workspace** — Nếu cần nhiều workspace → tạo nhiều booking riêng biệt
9. **Workspace type KHÔNG đổi được** khi còn booking active (pending_payment/confirmed/checked_in)
10. **Tags do Admin quản lý** — User chỉ CHỌN từ danh sách, không tự tạo tag
11. **`membership_tier` = placeholder** — Tất cả user = `standard`, business rules ở V2+
12. **Notification = In-app only** — Email notification ở V2+

