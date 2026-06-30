# Architecture Decisions — CoSpace

> Thư mục này chứa Architecture Decision Records (ADR) cho các quyết định thiết kế quan trọng.

## ADR Format

```markdown
# ADR-XXX: [Tiêu đề]

**Ngày**: YYYY-MM-DD
**Trạng thái**: Proposed | Accepted | Deprecated | Superseded

## Context
Bối cảnh và vấn đề cần giải quyết.

## Decision
Quyết định đã chọn.

## Consequences
Hệ quả tích cực và tiêu cực.
```

## Danh sách ADR

| # | Tiêu đề | Trạng thái |
|---|---------|-----------|
| 001 | UUID làm Primary Key toàn bộ | Accepted |
| 002 | App-layer overlap check thay vì DB EXCLUDE | Accepted |
| 003 | Supabase Auth thay vì self-hosted JWT | Accepted |
| 004 | Cùng bảng bookings cho cả đặt chỗ & hợp đồng | Accepted |
| 005 | Tự động hủy không cần admin duyệt | Accepted |

> Chi tiết xem `docs/SYSTEM_SPEC.md` mục 8 — Quyết Định Thiết Kế.
