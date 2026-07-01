# API Contract — Check-in Module

> **Base URL**: `/api/bookings`
> **Auth**: Bearer JWT (Staff, Branch Admin)
> **Content-Type**: `application/json`
> **Tham chiếu**: [UC-CHK-01 → 02](file:///d:/DA/docs/business/use_cases/checkin.md)
> **Ngày**: 2026-06-30

---

## 1. Check-in

### `POST /api/bookings/{id}/checkin`

**Roles**: `staff`, `branch_admin`

**Logic**: 
1. Validate `booking.branch_id == current_user.branch_id`
2. Validate `status == 'confirmed'`
3. Kiểm tra thời gian: `start_at - 30 minutes <= now()`
4. Insert `checkin_logs`
5. Update `bookings.status = 'checked_in'`

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "status": "checked_in",
  "checkin_log": {
    "id": "uuid",
    "checkin_at": "2026-07-01T08:50:00+07:00",
    "staff_name": "Nguyễn Staff A"
  },
  "message": "Check-in thành công."
}
```

**Error Responses**:
- `400 BOOKING_NOT_CONFIRMED`
- `400 TOO_EARLY_TO_CHECKIN`
- `400 ALREADY_CHECKED_IN`
- `403 UNAUTHORIZED_BRANCH`
- `404 BOOKING_NOT_FOUND`

---

## 2. Check-out

### `POST /api/bookings/{id}/checkout`

**Roles**: `staff`, `branch_admin`

**Logic**: 
1. Validate `booking.branch_id == current_user.branch_id`
2. Validate `status == 'checked_in'`
3. Update `checkin_logs.checkout_at = now()` (tìm record checkout_at = null)
4. Nếu hợp đồng dài hạn và chưa tới `end_at`: Giữ nguyên `bookings.status = 'checked_in'`. Ngược lại: Update `bookings.status = 'completed'`.

> **Note**: API list khách đang ở quán (Active in-store) phải filter thêm `EXISTS (SELECT 1 FROM checkin_logs WHERE checkout_at IS NULL)`.

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "status": "completed",
  "checkin_log": {
    "id": "uuid",
    "checkin_at": "2026-07-01T08:50:00+07:00",
    "checkout_at": "2026-07-01T11:05:00+07:00",
    "checkout_staff_name": "Trần Staff B"
  },
  "message": "Check-out thành công."
}
```

**Error Responses**:
- `400 NOT_CHECKED_IN`
- `403 UNAUTHORIZED_BRANCH`

---

## 3. Lịch Sử Check-in Của Một Booking

### `GET /api/bookings/{id}/checkin-logs`

**Roles**: `customer` (của mình), `staff/branch_admin` (chi nhánh), `super_admin`

**Response — 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "checkin_at": "2026-07-01T08:50:00+07:00",
      "checkout_at": "2026-07-01T11:05:00+07:00",
      "staff": {
        "id": "uuid",
        "full_name": "Nguyễn Staff A"
      },
      "checkout_staff": {
        "id": "uuid",
        "full_name": "Trần Staff B"
      }
    }
  ]
}
```
