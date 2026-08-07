# API Contract — Bookings Module

> **Base URL**: `/api/bookings`
> **Auth**: Bearer JWT (Supabase)
> **Content-Type**: `application/json`
> **Ngày**: 2026-08-03 (Refactored)

---

## 1. Create Booking

### `POST /api/bookings`

**Roles**: `customer`, `staff`, `branch_admin`

**Request Body**:
```json
{
  "workspace_id": "UUID",
  "workspace_type_id": "string",
  "branch_id": "UUID",
  "start_at": "ISO-8601 string",
  "end_at": "ISO-8601 string",
  "unit": "hour | day | week | month",
  "unit_count": "integer"
}
```

| Field | Type | Required |
|---|---|---|
| `workspace_id` | UUID | ✅ |
| `workspace_type_id` | String | ✅ |
| `branch_id` | UUID | ✅ |
| `start_at` | ISO-8601 | ✅ |
| `end_at` | ISO-8601 | ✅ |
| `unit` | Enum | ✅ |
| `unit_count` | int | ✅ |

**Response — 201 Created**:
*Returns the new `BookingDto` object.*
```json
{
    "id": "uuid",
    "bookingCode": "string",
    "userId": "uuid",
    "workspaceId": "uuid",
    "workspaceTypeId": "string",
    "branchId": "uuid",
    "status": "PENDING_PAYMENT",
    "startAt": "ISO-8601 string",
    "endAt": "ISO-8601 string",
    "unit": "hour",
    "unitCount": 2,
    "pricePerUnit": 50000,
    "subtotalAmount": 100000,
    "discountAmount": 0,
    "addonAmount": 0,
    "taxAmount": 0,
    "serviceFeeAmount": 0,
    "totalAmount": 100000,
    "paymentDeadlineAt": "ISO-8601 string",
    "paymentStatus": null,
    "latestPaymentId": null,
    "createdAt": "ISO-8601 string"
}
```

**Error Responses**:
- `400 BAD_REQUEST` if validation fails.
- `409 CONFLICT` if the workspace is not available (due to DB constraint).

---

## 2. Get My Bookings

### `GET /api/bookings/my`

**Roles**: `customer`, `staff`, `branch_admin`

**Response — 200 OK**:
*Returns a list of `BookingDto` objects for the authenticated user.*

---

## 3. Get Booking by ID

### `GET /api/bookings/{id}`

**Roles**: `customer` (own booking), `staff`, `branch_admin`

**Response — 200 OK**:
*Returns the `BookingDto` object for the specified ID.*
*The response body is the same as in the `POST /api/bookings` response, but may have updated `status`, `paymentStatus`, and `latestPaymentId` fields.*
