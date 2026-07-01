# 📖 Từ Điển Thuật Ngữ Nghiệp Vụ (Business Glossary)

> Tài liệu này chuẩn hóa các thuật ngữ để đảm bảo tất cả stakeholders (developer, BA, tester, AI Agent) đều hiểu cùng một ý nghĩa.

---

## Không gian & Cơ sở vật chất

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Chi nhánh | Branch | Một địa điểm vật lý cung cấp dịch vụ co-working. Có địa chỉ, múi giờ, trạng thái riêng. |
| Tầng | Floor | Một tầng trong chi nhánh, chứa nhiều không gian làm việc. Bắt buộc có bản vẽ SVG. |
| Không gian làm việc | Workspace | Đơn vị cho thuê nhỏ nhất: bàn đơn (desk), phòng họp (meeting_room), văn phòng riêng (private_office). |
| Loại không gian | Workspace Type | Phân loại workspace (desk, meeting_room, private_office) với sức chứa mặc định. |
| Bản vẽ mặt bằng | SVG Floorplan | Sơ đồ SVG tương tác cho mỗi tầng, mỗi workspace được map bằng `svg_element_id`. |
| Bảo trì | Maintenance | Khoảng thời gian workspace không khả dụng do sửa chữa/nâng cấp. |

## Đặt chỗ & Hợp đồng

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Đặt chỗ | Booking | Đơn đặt sử dụng workspace trong khoảng thời gian xác định. Đơn vị: giờ/ngày (ngắn hạn). |
| Hợp đồng thuê | Contract | Booking dài hạn (tuần/tháng). Cùng bảng `bookings` với `is_contract = true`. |
| Mã đặt chỗ | Booking Code | Mã unique dùng để check-in/check-out tại quầy. |
| Chống trùng lịch | Overlap Check | Cơ chế đảm bảo không có 2 booking active cùng workspace cùng thời điểm. |
| Hết hạn thanh toán | Payment Timeout | Sau 15 phút không thanh toán → booking tự động chuyển `expired`. |

## Thanh toán & Hoàn tiền

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Thanh toán trực tuyến | MoMo Payment | Thanh toán qua ví điện tử MoMo (Customer tự thanh toán). |
| Thanh toán tiền mặt | Cash Payment | Thanh toán tại quầy, CHỈ Staff/Admin mới được tạo đơn. |
| Chính sách hủy | Cancellation Policy | Quy tắc tính % hoàn tiền dựa trên thời điểm hủy (GRACE_HOURS, BEFORE_START_DAYS). |
| Hoàn tiền nội bộ | Internal Refund | MVP chỉ ghi nhận số tiền hoàn, không payout thực tế ra MoMo. |
| Idempotency | Idempotency | Cơ chế chống webhook callback lặp từ MoMo bằng `idempotency_key`. |

## Dịch vụ bổ sung

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Dịch vụ bổ sung | Extra/Add-on Service | Dịch vụ phụ thêm vào booking: đồ uống, in ấn, bữa ăn... |
| Giá snapshot | Price Snapshot | Lưu giá tại thời điểm đặt vào `unit_price` (booking_services), không bị ảnh hưởng khi giá thay đổi sau đó. |

## Giá cả

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Bảng giá global | Global Price Policy | Giá mặc định áp dụng toàn hệ thống (branch_id = NULL). |
| Bảng giá chi nhánh | Branch Price Override | Giá riêng cho chi nhánh, ưu tiên cao hơn global. |
| Fallback | Pricing Fallback | Nếu không có giá riêng chi nhánh → dùng giá global. |

## Kết nối đối tác

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Thẻ kỹ năng/sở thích | Tag | Nhãn phân loại: skill, interest, industry. Dùng để matching. |
| Điểm tương thích | Match Score | Điểm số tính bằng batch job: (skill_overlap × 0.6) + (interest_overlap × 0.25) + (same_branch_bonus × 0.15) |
| Gợi ý đối tác | Suggested Partner | Danh sách user có match score cao, contact chỉ hiện khi `contact_public = true`. |

## Vai trò & Phân quyền

| Thuật ngữ | Tiếng Anh | Phạm vi | branch_id |
|-----------|-----------|---------|-----------|
| Quản trị hệ thống | Super Admin | Toàn bộ | NULL |
| Quản lý chi nhánh | Branch Admin | Chi nhánh được gán | NOT NULL |
| Nhân viên | Staff | Chi nhánh được gán | NOT NULL |
| Khách hàng | Customer | Sử dụng dịch vụ | NULL |

---
