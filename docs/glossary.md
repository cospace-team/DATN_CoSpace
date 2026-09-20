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
| Thanh toán trực tuyến | Online Payment | Thanh toán qua PayOS (VietQR động liên ngân hàng) hoặc ví MoMo. |
| Thanh toán tiền mặt | Cash Payment | Thanh toán tại quầy, do Nhân viên quầy hoặc Admin xác nhận. |
| Chính sách hủy | Cancellation Policy | Quy tắc tính % hoàn tiền dựa trên thời điểm hủy (GRACE_HOURS, BEFORE_START_DAYS) theo thứ tự `priority DESC`. |
| Hoàn tiền nội bộ | Internal Refund | Ghi nhận khoản tiền hoàn vào hệ thống khi hủy đơn hoặc thanh toán muộn (Late Webhook). |
| Idempotency | Idempotency | Cơ chế bảo đảm tính duy nhất của giao dịch, ngăn chặn webhook callback lặp bằng `idempotency_key`. |
| Dung sai Check-in | Check-in Tolerance Window | Khoảng thời gian cho phép khách check-in (30 phút trước giờ bắt đầu đến 30 phút sau giờ kết thúc). |
| Hóa đơn mở | Running Tab | Cơ chế cho phép khách đang ngồi làm việc gọi thêm món/dịch vụ phụ và thanh toán lũy kế vào đơn hiện tại. |

## Dịch vụ bổ sung & Giá cả

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Dịch vụ bổ sung | Extra/Add-on Service | Dịch vụ phụ trợ (nước uống, in ấn, thiết bị, phòng streaming). |
| Giá snapshot | Price Snapshot | Đơn giá được chốt cố định tại thời điểm mua (`unit_price`), độc lập với các lần tăng/giảm giá sau này. |
| Ma trận giá không gian | Workspace Price Matrix | Cấu hình giá thuê theo 4 đơn vị thời gian (Giờ/Ngày/Tuần/Tháng) cho từng loại không gian. |
| Trung tâm quản lý bảng giá | Unified Pricing Hub | Giao diện điều phối 3 phân hệ biểu phí: Giá không gian, Phí dịch vụ gia tăng, và Biểu phí phạt hủy. |
| Ghi đè chi nhánh | Branch Price Override | Bảng giá riêng của chi nhánh, có độ ưu tiên cao hơn bảng giá mặc định toàn hệ thống (Global). |

## Kết nối đối tác & Cộng đồng & Trợ lý ảo

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|-----------|-----------|-------------|
| Thẻ kỹ năng/sở thích | Tag | Nhãn phân loại chuyên môn: skill, interest, industry. Dùng để đối sánh đối tác. |
| Điểm tương đồng Jaccard | Jaccard Similarity Score | Tỷ số giao trên hợp giữa tập thẻ của hai hồ sơ, làm trọng số cốt lõi cho thuật toán Matching. |
| Điểm tương thích | Match Score | Điểm số tổng hợp: (Jaccard × 0.85) + (Bonus cùng chi nhánh × 0.15). Ngưỡng ≥ 50% được xếp vào nhóm "Phù hợp nhất". |
| Bảng tin cộng đồng | Community Feed | Không gian chia sẻ kiến thức, kinh nghiệm và tìm kiếm đối tác hợp tác. |
| Hạng thành viên | Membership Tier | 4 hạng (Bronze, Silver, Gold, Platinum) đem lại quyền lợi chiết khấu dựa trên điểm tích lũy. |
| Trợ lý ảo AI | AI Chatbot Assistant | Trợ lý thông minh tích hợp Google Gemini Flash hỗ trợ giải đáp chính sách và tạo đơn đặt phòng qua đối thoại. |

## Vai trò & Phân quyền

| Thuật ngữ | Tiếng Anh | Phạm vi | branch_id |
|-----------|-----------|---------|-----------|
| Quản trị hệ thống | Super Admin | Toàn bộ hệ thống, điều phối chi nhánh, bảng giá toàn cục và nhật ký kiểm toán | NULL |
| Quản lý chi nhánh | Branch Admin | Quản lý mặt bằng, bảng giá chi nhánh, dịch vụ gia tăng và nhân viên thuộc chi nhánh | NOT NULL |
| Nhân viên quầy | Staff | Tiếp nhận khách, check-in/out, đặt phòng tại quầy, quản lý sự cố bảo trì tại chi nhánh | NOT NULL |
| Khách hàng | Customer | Đặt chỗ, thanh toán trực tuyến, quản lý lịch sử, tham gia cộng đồng và mạng lưới đối tác | NULL |

---
