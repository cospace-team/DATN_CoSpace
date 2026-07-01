# Use Case Specifications — Space Management Module

> **Module**: Space Management (Sprint 2 & 5)
> **Tham chiếu**: [SYSTEM_SPEC.md §3.2](file:///d:/DA/docs/SYSTEM_SPEC.md)
> **Ngày**: 2026-06-30

---

## UC-SPC-01: Quản Lý Cấu Trúc Không Gian (Floors & Workspaces)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Branch Admin |
| **Trigger** | Admin thiết lập sơ đồ mặt bằng (floor plan) mới hoặc chỉnh sửa cấu trúc hiện tại |
| **Precondition** | Branch đã được tạo bởi Super Admin |
| **Postcondition** | Records trong bảng `floors` và `workspaces` được cập nhật, sơ đồ SVG hiển thị đúng trên FE |

### Luồng Chính (Tạo Tầng & Không Gian)
```
1. Branch Admin vào trang quản lý mặt bằng, chọn "Thêm Tầng (Floor)"
2. Admin nhập thông tin:
   - Tên tầng (vd: "Tầng 1")
   - Số tầng (floor_no: 1)
   - Upload file SVG sơ đồ mặt bằng (Upload lên Supabase Storage)
3. Hệ thống tạo record trong bảng `floors`, lưu url của SVG.
4. Admin mở sơ đồ SVG vừa tải lên, click chọn "Thêm Workspace"
5. Admin khai báo:
   - Tên (vd: "Desk A01")
   - Mã (vd: "A01")
   - Loại (workspace_type_id: desk / meeting_room / private_office)
   - Sức chứa (capacity)
   - `svg_element_id` (Map với ID element trong file SVG để highlight)
6. Hệ thống tạo record trong bảng `workspaces` với `status = active`.
```

### Quy Tắc Nghiệp Vụ (Simplicity First)
- **SVG Mapping**: Không dùng thư viện phức tạp bóc tách SVG ở BE. BE chỉ lưu trữ `svg_url` và field `svg_element_id`. Việc render SVG và highlight dựa trên `svg_element_id` hoàn toàn do Frontend (React) đảm nhiệm.
- **Rule Workspace Type**: (Quyết định L2) **Không cho phép** cập nhật `workspace_type_id` nếu workspace đang có booking ở trạng thái `pending_payment`, `confirmed`, hoặc `checked_in`.

---

## UC-SPC-02: Quản Lý Bảo Trì Không Gian (Maintenance)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Branch Admin, Staff |
| **Trigger** | Một khu vực bị hỏng (ví dụ: máy lạnh hư, bàn hỏng) cần ngưng phục vụ |
| **Postcondition** | Record `workspace_maintenance` tạo ra, chặn khách hàng đặt chỗ |

### Luồng Chính
```
1. Staff báo cáo hỏng hóc hoặc Admin chủ động thiết lập bảo trì.
2. Admin chọn Workspace bị lỗi.
3. Nhập thời gian bắt đầu (`start_at`) và thời gian dự kiến xong (`end_at`).
4. Hệ thống kiểm tra: 
   - Có booking nào trong khoảng thời gian này không?
   - Nếu có, cảnh báo Admin: "Có 2 booking bị ảnh hưởng. Vui lòng liên hệ khách để dời lịch hoặc hủy."
5. Hệ thống tạo record `workspace_maintenance` (status = `scheduled`).
6. Khi đến `start_at`, background job (hoặc query realtime) coi workspace này là KHÔNG khả dụng (loại trừ khỏi UC-BOOK-01).
7. Khi sửa xong, Admin cập nhật status = `completed`.
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Không tìm thấy workspace | Báo lỗi `WORKSPACE_NOT_FOUND` |
| E2 | Thời gian không hợp lệ | `end_at` phải lớn hơn `start_at` |
| E3 | Có booking bị trùng thời gian bảo trì (Auto-Cancel) | Hệ thống tự động tìm các booking đang `pending_payment`, `confirmed` hoặc `checked_in` bị TRÙNG LỊCH: <br> - **`pending_payment`**: Đổi sang `canceled`, từ chối thanh toán. <br> - **`confirmed`**: Đổi sang `canceled`, tạo refund tự động (100%) và bắn Noti. <br> - **`checked_in`**: Đổi sang `completed` (ép checkout sớm), refund % thời gian còn lại và bắn Noti. |

---

## Danh Sách Error Codes (Space Management)

| Code | HTTP Status | Mô tả |
|------|------------|--------|
| `WORKSPACE_TYPE_LOCKED` | 409 | Không thể đổi loại không gian vì đang có lịch đặt |
| `SVG_UPLOAD_FAILED` | 500 | Lỗi kết nối Supabase Storage |
| `FLOOR_NOT_FOUND` | 404 | Không tìm thấy thông tin tầng |
| `WORKSPACE_NOT_FOUND` | 404 | Không tìm thấy không gian |
