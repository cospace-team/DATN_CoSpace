# API Contract — Cancellation Module

> **Base URL**: `/api/cancellations` (cho Config) và `/api/bookings/{id}/cancel` (cho Action)
> **Auth**: Bearer JWT
> **Tham chiếu**: [UC-CAN-01 → 02](file:///d:/DA/docs/business/use_cases/cancellation.md)
> **Ngày**: 2026-06-30

---

## 1. Cấu hình Policy (Admin)

### `POST /api/cancellations/policies`
**Roles**: `super_admin`, `branch_admin`

**Request**:
```json
{
  "name": "Hủy trong vòng 24h",
  "branch_id": null, 
  "workspace_type_id": "uuid",
  "rule_type": "BEFORE_START_HOURS",
  "min_value": 0,
  "max_value": 24,
  "refund_percent": 0,
  "priority": 1,
  "effective_from": "2026-01-01T00:00:00Z"
}
```

**Response — 201 Created**:
```json
{
  "id": "uuid",
  "name": "Hủy trong vòng 24h",
  "status": "active",
  ... (các field khác)
}
```

---

## 2. API Hủy Đặt Chỗ (Customer)

> Chú ý: Endpoint này đã được cover trong [api-contracts/bookings.md](file:///d:/DA/docs/api-contracts/bookings.md). Phần này chỉ làm rõ Payload trả về liên quan đến Cancel.

### `POST /api/bookings/{id}/cancel`
**Roles**: `customer` (chỉ booking của mình)

**Logic (Tinh gọn)**:
- Không lưu foreign key cứng `policy_id` vào booking, mà lưu JSON snapshot `applied_rule_json`. Nếu admin xoá policy cũ, lịch sử hủy không bị hỏng (Goal-Driven & Surgical Changes).

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "status": "canceled",
  "cancellation": {
    "refund_percent": 80,
    "refund_amount": 96000,
    "penalty_amount": 24000,
    "refund_status": "confirmed",
    "applied_rule": {
      "policy_name": "Hủy trước 24h",
      "rule_type": "BEFORE_START_DAYS",
      "min_value": 1,
      "max_value": null,
      "refund_percent": 80
    }
  }
}
```

**Error Responses**:
- `400 BOOKING_NOT_CANCELLABLE` (Booking đã qua giờ, đang check-in, hoặc đã complete)
