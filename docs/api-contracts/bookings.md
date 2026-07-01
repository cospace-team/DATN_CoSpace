# API Contract — Bookings Module

> **Base URL**: `/api/bookings`
> **Auth**: Bearer JWT (Supabase)
> **Content-Type**: `application/json`
> **Tham chiếu**: [UC-BOOK-01 → 04](file:///d:/DA/docs/business/use_cases/booking.md), [SYSTEM_SPEC.md §3.3](file:///d:/DA/docs/SYSTEM_SPEC.md)
> **Ngày**: 2026-06-30

---

## 1. Tạo Booking

### `POST /api/bookings`

**Roles**: `customer`, `staff`, `branch_admin`

**Request Body**:
```json
{
  "workspace_id": "uuid",
  "start_at": "2026-07-01T09:00:00+07:00",
  "duration_unit": "hour",
  "unit_count": 2,
  "source": "web",
  "addon_services": [
    {
      "extra_service_id": "uuid",
      "quantity": 2
    }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `workspace_id` | UUID | ✅ | Phải tồn tại, status = active |
| `start_at` | ISO 8601 timestamptz | ✅ | ≥ now() |
| `duration_unit` | enum | ✅ | hour \| day \| week \| month |
| `unit_count` | int | ✅ | ≥ 1 |
| `source` | enum | ❌ | web (default) \| mobile \| counter \| admin |
| `addon_services` | array | ❌ | Danh sách dịch vụ bổ sung |

> **Lưu ý**: `end_at` tự tính bởi server. `branch_id` tự lấy từ workspace → floor → branch. `is_contract` tự set khi unit ∈ {week, month}.

**Response — 201 Created**:
```json
{
  "id": "uuid",
  "booking_code": "BK-20260701-A3K9X",
  "workspace": {
    "id": "uuid",
    "name": "Desk A-01",
    "type": "desk",
    "floor_name": "Tầng 1"
  },
  "branch": {
    "id": "uuid",
    "name": "CoSpace Quận 1"
  },
  "start_at": "2026-07-01T09:00:00+07:00",
  "end_at": "2026-07-01T11:00:00+07:00",
  "duration_unit": "hour",
  "unit_count": 2,
  "is_contract": false,
  "status": "pending_payment",
  "subtotal_amount": 100000,
  "discount_amount": 0,
  "addon_amount": 20000,
  "total_amount": 120000,
  "currency": "VND",
  "payment_deadline_at": "2026-07-01T09:15:00+07:00",
  "source": "web",
  "addon_services": [
    {
      "extra_service_id": "uuid",
      "name": "Cà phê",
      "quantity": 2,
      "unit_price": 10000,
      "line_total": 20000
    }
  ],
  "created_at": "2026-07-01T08:45:00+07:00"
}
```

**Error Responses**:

| HTTP | Error Code | Khi nào |
|------|-----------|--------|
| 400 | `INVALID_TIME_RANGE` | start_at < now() hoặc unit_count ≤ 0 |
| 400 | `INVALID_DURATION_UNIT` | duration_unit không hợp lệ |
| 404 | `WORKSPACE_NOT_FOUND` | workspace_id không tồn tại |
| 409 | `WORKSPACE_NOT_AVAILABLE` | Đã có booking overlap |
| 409 | `WORKSPACE_UNDER_MAINTENANCE` | Workspace đang bảo trì |
| 500 | `PRICE_NOT_CONFIGURED` | Chưa cấu hình giá |

---

## 2. Chi Tiết Booking

### `GET /api/bookings/{id}`

**Roles**: `customer` (chỉ booking của mình), `staff` (cùng branch), `branch_admin` (cùng branch), `super_admin` (tất cả)

**Response — 200 OK**:
```json
{
  "id": "uuid",
  "booking_code": "BK-20260701-A3K9X",
  "user": {
    "id": "uuid",
    "full_name": "Nguyễn Văn A",
    "email": "a@example.com"
  },
  "workspace": {
    "id": "uuid",
    "name": "Desk A-01",
    "type": "desk",
    "floor_name": "Tầng 1",
    "svg_element_id": "desk-a01"
  },
  "branch": {
    "id": "uuid",
    "name": "CoSpace Quận 1",
    "timezone": "Asia/Ho_Chi_Minh"
  },
  "start_at": "2026-07-01T09:00:00+07:00",
  "end_at": "2026-07-01T11:00:00+07:00",
  "duration_unit": "hour",
  "unit_count": 2,
  "is_contract": false,
  "status": "confirmed",
  "subtotal_amount": 100000,
  "discount_amount": 0,
  "addon_amount": 20000,
  "total_amount": 120000,
  "currency": "VND",
  "payment_deadline_at": "2026-07-01T09:15:00+07:00",
  "source": "web",
  "addon_services": [
    {
      "id": "uuid",
      "extra_service_id": "uuid",
      "name": "Cà phê",
      "quantity": 2,
      "unit_price": 10000,
      "line_total": 20000
    }
  ],
  "payment": {
    "id": "uuid",
    "provider": "momo",
    "method": "ewallet",
    "status": "paid",
    "amount": 120000,
    "paid_at": "2026-07-01T09:02:00+07:00"
  },
  "checkin": {
    "checkin_at": "2026-07-01T09:05:00+07:00",
    "checkout_at": null,
    "staff_name": "Trần Thị B"
  },
  "cancellation": null,
  "created_at": "2026-07-01T08:45:00+07:00",
  "updated_at": "2026-07-01T09:05:00+07:00"
}
```

**Error Responses**:

| HTTP | Error Code | Khi nào |
|------|-----------|--------|
| 404 | `BOOKING_NOT_FOUND` | Booking không tồn tại |
| 403 | `UNAUTHORIZED_BRANCH` | Staff/Branch Admin không cùng branch |
| 403 | `FORBIDDEN` | Customer xem booking người khác |

---

## 3. Lịch Sử Đặt Chỗ

### `GET /api/bookings/history`

**Roles**: `customer`, `staff`, `branch_admin`, `super_admin`

**Query Parameters**:

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | int | 1 | Trang hiện tại |
| `size` | int | 20 | Số items/trang (max 100) |
| `status` | enum | all | Filter theo booking status |
| `is_contract` | boolean | all | Filter đặt chỗ vs hợp đồng |
| `from` | ISO date | - | Filter start_at ≥ from |
| `to` | ISO date | - | Filter start_at ≤ to |
| `branch_id` | UUID | - | Filter theo chi nhánh (Admin only) |
| `workspace_type` | string | - | Filter theo workspace type code |
| `sort` | string | created_at,desc | Sorting |

**Phạm vi dữ liệu tự động**:
- `customer` → chỉ bookings có `user_id = currentUser.id`
- `staff` → bookings có `branch_id = currentUser.branch_id`
- `branch_admin` → bookings có `branch_id = currentUser.branch_id`
- `super_admin` → tất cả bookings

**Response — 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "booking_code": "BK-20260701-A3K9X",
      "workspace_name": "Desk A-01",
      "workspace_type": "desk",
      "branch_name": "CoSpace Quận 1",
      "start_at": "2026-07-01T09:00:00+07:00",
      "end_at": "2026-07-01T11:00:00+07:00",
      "duration_unit": "hour",
      "unit_count": 2,
      "is_contract": false,
      "status": "confirmed",
      "total_amount": 120000,
      "payment_status": "paid",
      "created_at": "2026-07-01T08:45:00+07:00"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

---

## 4. Hủy Booking

### `POST /api/bookings/{id}/cancel`

**Roles**: `customer` (chỉ booking của mình)

**Request Body**:
```json
{
  "reason": "Thay đổi kế hoạch"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `reason` | string | ❌ | max 255 chars |

**Logic xử lý**:
Vui lòng tham khảo chi tiết flow hủy và tính toán refund tại [Use Case: Cancellation (UC-CAN-02)](file:///d:/DA/docs/business/use_cases/cancellation.md). API này chỉ nhận request, validate status, áp dụng Policy và trả về kết quả.

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "status": "canceled",
  "cancellation": {
    "policy_name": "Hủy trước 24h",
    "rule_type": "BEFORE_START_DAYS",
    "refund_percent": 80,
    "refund_amount": 96000,
    "penalty_amount": 24000,
    "refund_status": "confirmed",
    "applied_rule": {
      "rule_type": "BEFORE_START_DAYS",
      "min_value": 1,
      "max_value": null,
      "refund_percent": 80,
      "policy_name": "Hủy trước 24h"
    }
  },
  "message": "Đã hủy đặt chỗ. Hoàn tiền 96,000 VND (80%) theo chính sách 'Hủy trước 24h'."
}
```

**Error Responses**:

| HTTP | Error Code | Khi nào |
|------|-----------|--------|
| 400 | `BOOKING_NOT_CANCELLABLE` | Status không phải pending_payment hoặc confirmed |
| 400 | `NO_CANCELLATION_POLICY` | Không tìm thấy chính sách hủy phù hợp |
| 403 | `FORBIDDEN` | Customer hủy booking người khác |
| 404 | `BOOKING_NOT_FOUND` | Booking không tồn tại |

---

## 5. Thêm Dịch Vụ Bổ Sung

### `POST /api/bookings/{id}/services`

**Roles**: `customer` (chỉ booking của mình)

**Request Body**:
```json
{
  "services": [
    {
      "extra_service_id": "uuid",
      "quantity": 2
    },
    {
      "extra_service_id": "uuid",
      "quantity": 10
    }
  ]
}
```

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "addon_services": [
    {
      "extra_service_id": "uuid",
      "name": "Cà phê",
      "quantity": 2,
      "unit_price": 10000,
      "line_total": 20000
    },
    {
      "extra_service_id": "uuid",
      "name": "In ấn",
      "quantity": 10,
      "unit_price": 2000,
      "line_total": 20000
    }
  ],
  "addon_amount": 40000,
  "total_amount": 140000
}
```

**Error Responses**:

| HTTP | Error Code | Khi nào |
|------|-----------|--------|
| 400 | `BOOKING_NOT_MODIFIABLE` | Status đã completed/canceled/expired |
| 400 | `INVALID_QUANTITY` | quantity ≤ 0 |
| 404 | `SERVICE_NOT_FOUND` | extra_service_id không tồn tại hoặc không active |

---

## 6. Kiểm Tra Workspace Khả Dụng

### `GET /api/workspaces/available`

**Roles**: `customer`, `staff`, `branch_admin`, `super_admin`

> **Lưu ý**: Endpoint này nằm ở Space module nhưng liên quan chặt với Booking nên document ở đây.

**Query Parameters**:

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `branch_id` | UUID | ✅ | Chi nhánh cần tìm |
| `start_at` | ISO 8601 | ✅ | Thời gian bắt đầu |
| `duration_unit` | enum | ✅ | hour \| day \| week \| month |
| `unit_count` | int | ✅ | Số đơn vị |
| `workspace_type` | string | ❌ | Filter theo loại (desk/meeting_room/private_office) |
| `capacity_min` | int | ❌ | Sức chứa tối thiểu |
| `floor_id` | UUID | ❌ | Filter theo tầng |

**Logic xử lý**:
Vui lòng tham khảo SQL query và quy tắc kiểm tra tại [Workflows & SQL Test](file:///d:/DA/docs/Workflows_va_SQL_Test.md) và [Use Case: Booking](file:///d:/DA/docs/business/use_cases/booking.md). Nguyên tắc cơ bản: Lọc ra các workspace thuộc chi nhánh, thỏa mãn tiêu chí loại/sức chứa, và KHÔNG bị overlap bởi các Booking đang active hoặc Lịch bảo trì (Maintenance).

**Response — 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "DESK-A01",
      "name": "Desk A-01",
      "type": { "code": "desk", "name": "Desk" },
      "capacity": 1,
      "floor": { "id": "uuid", "name": "Tầng 1", "floor_no": 1 },
      "svg_element_id": "desk-a01",
      "status": "active",
      "price": {
        "amount": 50000,
        "unit": "hour",
        "currency": "VND",
        "scope": "branch"
      }
    }
  ],
  "total": 15
}
```

---

## Pagination Format (Chung)

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

## Error Format (Chung)

```json
{
  "error": "WORKSPACE_NOT_AVAILABLE",
  "message": "Workspace 'Desk A-01' đã có đặt chỗ trong khoảng thời gian này.",
  "details": {
    "conflicting_booking": {
      "start_at": "2026-07-01T08:00:00+07:00",
      "end_at": "2026-07-01T10:00:00+07:00"
    }
  }
}
```

---
