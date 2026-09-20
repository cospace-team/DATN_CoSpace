# 🏢 CoSpace - Co-working Management System

**CoSpace** là hệ thống quản lý toàn diện dành cho không gian làm việc chung (Co-working space), cung cấp giải pháp đặt chỗ, quản lý thanh toán, và kết nối đối tác. Dự án này được thiết kế theo kiến trúc hiện đại, hỗ trợ nhiều vai trò (Customer, Staff, Branch Admin, Super Admin) và sẵn sàng mở rộng.

---

## 🧭 Dành cho AI Agents & LLMs
> **QUAN TRỌNG:** Nếu bạn là một AI Agent (như Gemini, GitHub Copilot, Cursor...), vui lòng **BẮT BUỘC ĐỌC** file [`.agents/AGENTS.md`](./.agents/AGENTS.md) trước khi thực hiện bất kỳ thay đổi nào trong repository này. File này chứa toàn bộ Context, Rules, và Coding Conventions cốt lõi của dự án.

---

## 📚 Tài Liệu Dự Án (Documentation)
Toàn bộ tài liệu nghiệp vụ, đặc tả hệ thống và thiết kế kỹ thuật được lưu trong thư mục `docs/`. Để nắm bắt nhanh dự án, hãy đọc theo thứ tự sau:

1. **[Đặc tả hệ thống (SYSTEM_SPEC)](./docs/SYSTEM_SPEC.md)**: Tổng quan nghiệp vụ, chức năng, quy trình.
2. **[Kế hoạch phát triển (DEVELOPMENT_PLAN)](./docs/DEVELOPMENT_PLAN.md)**: Lộ trình các Sprint.
3. **[Database ERD (DBML)](./docs/Database_dbdiagram_script.dbml)**: Sơ đồ thiết kế cơ sở dữ liệu.
4. **[Phương pháp làm việc (Methodology)](./docs/working_methodology.md)**: Cách thức team vận hành.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Backend (`/BE`)
- **Framework**: Spring Boot 3 (Java 17)
- **Kiến trúc**: Package-by-Feature (Domain-Driven)
- **Security**: Spring Security + OAuth2 Resource Server (xử lý JWT từ Supabase)
- **Cơ sở dữ liệu**: PostgreSQL

### Frontend (`/FE`)
- **Core**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Shadcn UI (mô phỏng)
- **State/Routing**: Context API, React Router DOM
- **Authentication**: `@supabase/supabase-js`

### Hạ Tầng & Dịch Vụ
- **Auth & Database Hosting**: Supabase
- **Payment Gateway**: MoMo Sandbox (Dự kiến)

---

## 📁 Cấu Trúc Repository

```text
DA/
├── .agents/       # Cấu hình và chỉ thị dành riêng cho AI Agent
├── BE/            # Source code Spring Boot (Backend)
├── FE/            # Source code React/Vite (Frontend)
├── database/      # SQL Scripts (Migrations, Seeds, Test workflows)
├── docs/          # Tài liệu BA/SA (GOAL, Use cases, API contracts, ADRs)
├── report/        # Nơi chứa tài liệu báo cáo Đồ Án (LaTeX/Word)
└── task.md        # Master Roadmap - Theo dõi tiến độ toàn dự án
```

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Setup)

### 1. Database
- Dự án sử dụng Supabase (PostgreSQL). **Không cần chạy script tay**: khi khởi động, backend dùng Flyway để áp dụng các migration trong `BE/src/main/resources/db/migration/`.
  - Database trống (máy mới, CI): Flyway chạy `V1__baseline.sql` để tạo toàn bộ schema, rồi tới các file `V2`, `V3`...
  - Database đã có dữ liệu: Flyway đánh dấu `V1` là đã áp dụng (`baseline-on-migrate`) và chỉ chạy các migration mới hơn.
- Mọi thay đổi schema về sau: thêm file `V<n>__<mô tả>.sql` mới, không sửa file đã có.
- Các script cũ trong `database/archive/migrations-legacy/` chỉ còn giá trị tham khảo — xem README trong thư mục đó.

### 2. Frontend
```bash
cd FE
npm install
# Tạo file .env dựa trên .env.example (Cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY)
npm run dev
```
Truy cập tại: `http://localhost:5173`

### 3. Backend
```bash
cd BE
# Tạo file .env dựa trên .env.example
./mvnw spring-boot:run
```
Truy cập tại: `http://localhost:8080`
