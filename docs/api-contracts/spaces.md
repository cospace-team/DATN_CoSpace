# API Contract — Space Management Module

> **Base URL**: `/api/spaces` (Bao gồm Floors và Workspaces)
> **Auth**: Bearer JWT (Staff, Branch Admin, Super Admin)
> **Content-Type**: `application/json`
> **Tham chiếu**: [UC-SPC-01 → 02](file:///d:/DA/docs/business/use_cases/space.md)
> **Ngày**: 2026-06-30

---

## 1. Floors

### `POST /api/spaces/floors`
**Roles**: `branch_admin`, `super_admin`

**Request**:
```json
{
  "branch_id": "uuid",
  "name": "Tầng 1",
  "floor_no": 1,
  "svg_url": "https://supabase.../storage/v1/object/public/floorplans/tang1.svg"
}
```

**Response — 201 Created**:
```json
{
  "id": "uuid",
  "branch_id": "uuid",
  "name": "Tầng 1",
  "floor_no": 1,
  "svg_url": "https://supabase.../storage/v1/object/public/floorplans/tang1.svg"
}
```

---

## 2. Workspaces

### `POST /api/spaces/workspaces`
**Roles**: `branch_admin`, `super_admin`

**Request**:
```json
{
  "floor_id": "uuid",
  "type_id": "uuid",
  "code": "A01",
  "name": "Desk A01",
  "capacity": 1,
  "svg_element_id": "rect_desk_a01"
}
```

### `PUT /api/spaces/workspaces/{id}`
**Roles**: `branch_admin`, `super_admin`

**Logic chốt (Karpathy's Surgical Changes)**:
Chỉ kiểm tra `type_id` đổi hay không. Nếu `type_id` bị thay đổi, phải check xem có booking active nào không.

**SQL Guard**:
```sql
-- Nếu payload.type_id khác workspace.type_id hiện tại:
SELECT COUNT(*) FROM bookings 
WHERE workspace_id = :id AND status IN ('pending_payment', 'confirmed', 'checked_in');
-- Nếu > 0 => throw WORKSPACE_TYPE_LOCKED
```

**Response — 200 OK**:
```json
{
  "id": "uuid",
  "floor_id": "uuid",
  "type": { "id": "uuid", "code": "desk" },
  "code": "A01",
  "name": "Desk A01 Updated",
  "capacity": 1,
  "svg_element_id": "rect_desk_a01",
  "status": "active"
}
```

**Error Responses**:
- `409 WORKSPACE_TYPE_LOCKED`

---

## 3. Maintenance

### `POST /api/spaces/workspaces/{id}/maintenance`
**Roles**: `staff`, `branch_admin`

**Request**:
```json
{
  "start_at": "2026-07-02T08:00:00+07:00",
  "end_at": "2026-07-05T18:00:00+07:00",
  "reason": "Sửa máy lạnh"
}
```

**Response — 201 Created**:
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "start_at": "2026-07-02T08:00:00+07:00",
  "end_at": "2026-07-05T18:00:00+07:00",
  "status": "scheduled",
  "reason": "Sửa máy lạnh",
  "impacted_bookings_count": 2 
}
```
*(Lưu ý: API tự động đếm số lượng bookings bị ảnh hưởng trả về để cảnh báo FE)*
