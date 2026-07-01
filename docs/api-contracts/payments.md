# API Contract — Payments Module

> **Base URL**: `/api/payments`
> **Auth**: Bearer JWT (trừ Webhook MoMo)
> **Content-Type**: `application/json`
> **Tham chiếu**: [UC-PAY-01 → 03](file:///d:/DA/docs/business/use_cases/payment.md), MoMo Sandbox Code
> **Ngày**: 2026-06-30

---

## 1. Yêu cầu Thanh toán MoMo

### `POST /api/payments/momo/{booking_id}`

**Roles**: `customer` (booking của mình), `staff` (tại quầy)

**Logic**: Gọi sang `MomoService.createPayment` để lấy payUrl.

**Response — 200 OK**:
```json
{
  "booking_id": "uuid",
  "orderId": "uuid_1688118000000",
  "payUrl": "https://test-payment.momo.vn/v2/gateway/api/create",
  "qrCodeUrl": "https://test-payment.momo.vn/.../qr",
  "amount": 120000,
  "message": "Vui lòng thanh toán qua MoMo trong 15 phút"
}
```

**Error Responses**:
- `404 BOOKING_NOT_FOUND`
- `400 BOOKING_EXPIRED` (quá 15p)
- `400 BOOKING_ALREADY_PAID`

---

## 2. IPN Webhook MoMo (Notify URL)

### `POST /api/payments/momo/notify`

**Auth**: Không (Public API, MoMo server gọi)
**Mô tả**: Route này trùng với `/momo/notify` đã làm. Nhưng chuyển sang quy chuẩn `/api/payments/...`

**Request Body (từ MoMo)**:
```json
{
  "partnerCode": "MOMO...",
  "orderId": "uuid_1688118000000",
  "requestId": "...",
  "amount": 120000,
  "orderInfo": "Thanh toán CoSpace...",
  "orderType": "momo_wallet",
  "transId": 234234234,
  "resultCode": 0,
  "message": "Success",
  "payType": "qr",
  "responseTime": 1688118050000,
  "extraData": "",
  "signature": "hmac_sha256_hash..."
}
```

**Logic Xử Lý (Idempotent)**:
1. Xác thực `signature` (MomoService).
2. Tách `booking_id` từ `orderId`.
3. Kiểm tra Idempotency: Khởi tạo DB Transaction, dùng `SELECT ... FOR UPDATE` để lock row payment theo `orderId`. Nếu `status == 'paid'` → Bỏ qua, trả 204.
4. Nếu `resultCode == 0`:
   - `UPDATE payments SET status = 'paid', provider_trans_id = :transId, paid_at = now()`
   - Kiểm tra `bookings.status`:
     + Nếu `pending_payment`: `UPDATE bookings SET status = 'confirmed'` và Insert `notifications` (booking confirmed)
     + Nếu `expired` (khách chuyển tiền muộn sau khi timeout): Giữ nguyên status `expired`, Insert vào `booking_cancellations` với `refund_status = 'pending'` (để nhân viên xử lý hoàn tiền thủ công).
   - Insert `payment_events`

**Response — 204 No Content**: (Quy chuẩn Webhook, không body)

---

## 3. Xác nhận Thu Tiền Mặt (Counter)

### `POST /api/payments/cash/{booking_id}`

**Roles**: `staff`, `branch_admin`

**Request Body**: Rỗng (chỉ gọi POST xác nhận)

**Response — 200 OK**:
```json
{
  "payment_id": "uuid",
  "booking_id": "uuid",
  "method": "cash",
  "amount": 120000,
  "status": "paid",
  "paid_at": "2026-07-01T09:05:00+07:00",
  "staff_name": "Nguyễn Staff A"
}
```

**Error Responses**:
- `403 FORBIDDEN` (Customer gọi API này)
- `403 UNAUTHORIZED_BRANCH` (Staff khác chi nhánh)
- `400 BOOKING_ALREADY_PAID`

---

## 4. Lịch Sử Giao Dịch

### `GET /api/payments`

**Roles**: `customer` (của mình), `staff/branch_admin` (chi nhánh), `super_admin`

**Query**:
- `page`, `size`
- `status`: pending, paid, failed, refunded
- `method`: ewallet, cash
- `booking_id`

**Response — 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "booking": {
        "id": "uuid",
        "code": "BK-12345"
      },
      "provider": "momo",
      "method": "ewallet",
      "type": "payment", 
      "amount": 120000,
      "status": "paid",
      "transaction_id": "234234234",
      "paid_at": "2026-07-01T09:05:00+07:00"
    }
  ],
  "pagination": { ... }
}
```
> Ghi chú: Cột `type` trong DB có thể là ENUM (`payment`, `refund`)
