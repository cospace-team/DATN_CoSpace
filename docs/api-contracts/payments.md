# API Contract — Payments Module

> **Base URL**: `/api/payments`
> **Auth**: Bearer JWT (trừ Webhook MoMo)
> **Content-Type**: `application/json`
> **Ngày**: 2026-08-03 (Refactored)

---

## 1. Create MoMo Payment Request

### `POST /api/payments/momo/create`

**Roles**: `customer`, `staff`

**Header**:
- `Idempotency-Key: <UUID>` (Optional): Prevents creating duplicate payments if the user retries a request.

**Request Body**:
```json
{
  "booking_id": "uuid"
}
```

**Response — 200 OK**:
```json
{
  "paymentId": "uuid",
  "bookingId": "uuid",
  "orderId": "PAY-...",
  "provider": "momo",
  "payUrl": "https://test-payment.momo.vn/...",
  "qrCodeUrl": null,
  "amount": 100000,
  "status": "PENDING",
  "message": "Vui lòng thanh toán qua MoMo trong vòng 15 phút"
}
```

**Error Responses**:
- `404 BOOKING_NOT_FOUND`
- `400 BOOKING_EXPIRED`
- `400 BOOKING_ALREADY_PAID`

---

## 2. Create Cash Payment (At Counter)

### `POST /api/payments/cash/create`

**Roles**: `staff`, `branch_admin`

**Request Body**:
```json
{
  "booking_id": "uuid"
}
```

**Response — 200 OK**:
```json
{
  "paymentId": "uuid",
  "bookingId": "uuid",
  "provider": "cash",
  "method": "cash",
  "amount": 100000,
  "status": "PAID",
  "paidAt": "ISO-8601 string"
}
```

**Error Responses**:
- `403 FORBIDDEN` (Customer cannot call this API)
- `404 BOOKING_NOT_FOUND`
- `400 BOOKING_ALREADY_PAID`

---

## 3. MoMo IPN Webhook (Notify URL)

### `POST /api/payments/momo/notify`

**Auth**: None (Public API, called by MoMo server)

**Request Body (from MoMo)**:
*Standard MoMo IPN payload, including `orderId`, `resultCode`, `transId`, and `signature`.*

**Processing Logic (Idempotent)**:
1.  Verify the `signature` from the payload.
2.  Find the `Payment` record by the `orderId`.
3.  If already `PAID`, ignore and return.
4.  If `resultCode` is `0` (success):
    - Update `Payment` status to `PAID`, save `gatewayTransactionId`.
    - Update the corresponding `Booking` status to `CONFIRMED`.
5.  If `resultCode` is not `0`:
    - Update `Payment` status to `FAILED`.

**Response — 204 No Content**: (Standard for webhooks)

---

## 4. Get Payment History for a Booking

### `GET /api/payments/booking/{bookingId}`

**Roles**: `customer` (own booking), `staff`, `branch_admin`

**Response — 200 OK**:
*Returns a list of `PaymentDto` objects.*
```json
[
    {
        "id": "uuid",
        "bookingId": "uuid",
        "userId": "uuid",
        "provider": "momo",
        "method": "ewallet",
        "orderId": "PAY-...",
        "requestId": "uuid",
        "amount": 100000,
        "status": "PAID",
        "payUrl": "https://test-payment.momo.vn/...",
        "gatewayTransactionId": "123456789",
        "paidAt": "ISO-8601 string",
        "refundedAt": null,
        "createdAt": "ISO-8601 string"
    }
]
```
