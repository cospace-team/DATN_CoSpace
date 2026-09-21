# Sơ đồ lớp, tuần tự, kiến trúc và ERD của CoSpace

Tất cả sơ đồ được dựng từ mã nguồn (Backend `BE/src/main/java/com/cospace/app/` và lược đồ Flyway), không phải từ tài liệu đặc tả.
Mỗi file PNG (xuất tỉ lệ 2x) **nhúng sẵn XML của sơ đồ**: mở trực tiếp PNG bằng draw.io vẫn sửa được.
Cách sinh lại toàn bộ: xem `../../tools/uml/README.md`.

| File nguồn | Số trang | Nội dung |
|---|---|---|
| `cospace-class.drawio` | 11 | Sơ đồ lớp: 6 trang miền dữ liệu, 5 trang tầng nghiệp vụ |
| `cospace-sequence.drawio` | 14 | Sơ đồ tuần tự các luồng nghiệp vụ chính |
| `cospace-architecture.drawio` | 4 | Kiến trúc phân tầng, tổng thể, giao diện và triển khai |
| `cospace-erd.drawio` | 7 | Sơ đồ quan hệ thực thể: bản đồ module và 6 nhóm bảng |

## Sơ đồ lớp

| PNG | Nhãn LaTeX | Nội dung |
|---|---|---|
| `cd-01-khonggian` | `fig:cd_khonggian` | Chi nhánh, tầng, không gian, loại không gian, tiện ích, bảo trì |
| `cd-02-gia-chinhsach` | `fig:cd_gia` | Bảng giá, dịch vụ bổ sung, chính sách hủy |
| `cd-03-datcho` | `fig:cd_datcho` | Người dùng, đơn đặt chỗ, dịch vụ gọi thêm, check-in, hủy |
| `cd-04-thanhtoan` | `fig:cd_thanhtoan` | Thanh toán, sự kiện, hoàn tiền, khuyến mãi, hạng thành viên |
| `cd-05-goiydoitac` | `fig:cd_goiy` | Hồ sơ năng lực, kỹ năng, sở thích, điểm tương đồng |
| `cd-06-congdong` | `fig:cd_congdong` | Bảng tin, thẻ, thông báo, nhật ký kiểm toán |
| `cd-07-svc-datcho` | `fig:cd_svc_datcho` | Dịch vụ đặt chỗ, tính giá, ưu đãi (xoay ngang) |
| `cd-08-svc-vongdoi` | `fig:cd_svc_vongdoi` | Tác vụ định kỳ, check-in, bảo trì |
| `cd-09-svc-thanhtoan` | `fig:cd_svc_thanhtoan` | Thanh toán, hủy, hoàn tiền (xoay ngang) |
| `cd-10-svc-xacthuc` | `fig:cd_svc_xacthuc` | Xác thực và phân quyền |
| `cd-11-svc-trolyao` | `fig:cd_svc_trolyao` | Trợ lý ảo, gợi ý đối tác, kiểm toán |

## Sơ đồ tuần tự

| PNG | Nhãn LaTeX | Luồng |
|---|---|---|
| `sd-01-dangnhap` | `fig:sd_dangnhap` | Đăng nhập email hoặc Google, làm mới phiên |
| `sd-02-xacthuc-api` | `fig:sd_xacthuc_api` | Xác thực và phân quyền mỗi yêu cầu API |
| `sd-03-datcho-kiemtra` | `fig:sd_datcho_1` | Tạo đơn (1/2): giới hạn, khóa tư vấn, kiểm tra trùng lịch |
| `sd-04-datcho-luu` | `fig:sd_datcho_2` | Tạo đơn (2/2): tính giá, lưu đơn |
| `sd-05-thanhtoan` | `fig:sd_thanhtoan` | Khởi tạo thanh toán PayOS, MoMo, tiền mặt |
| `sd-06-webhook` | `fig:sd_webhook` | Xử lý webhook PayOS, thanh toán muộn, trả trùng |
| `sd-07-huy` | `fig:sd_huy` | Hủy đặt chỗ và tính hoàn tiền |
| `sd-08-duyet-hoantien` | `fig:sd_duyet_hoantien` | Duyệt hoặc từ chối hoàn tiền |
| `sd-09-checkin-checkout` | `fig:sd_checkin` | Check-in và check-out |
| `sd-10-hethan-giucho` | `fig:sd_hethan` | Tự động giải phóng chỗ giữ quá 15 phút |
| `sd-11-dong-don` | `fig:sd_dongdon` | Tự động check-out quá hạn, đánh dấu không đến |
| `sd-12-baotri` | `fig:sd_baotri` | Tạo lịch bảo trì, xử lý đơn bị ảnh hưởng |
| `sd-13-chatbot-hoithoai` | `fig:sd_chatbot_1` | Trợ lý ảo: hội thoại, gọi công cụ |
| `sd-14-chatbot-xacnhan` | `fig:sd_chatbot_2` | Trợ lý ảo: xác nhận và thực hiện |

## Chèn vào LaTeX

Dùng hai macro trong `preamble.tex`:

```latex
\hinhuml{cd-03-datcho}{Sơ đồ lớp miền dữ liệu: đặt chỗ}{fig:cd_datcho}        % hình dọc
\hinhumlngang{cd-09-svc-thanhtoan}{Sơ đồ lớp tầng nghiệp vụ}{fig:cd_svc_tt}   % hình xoay ngang
```

Các sơ đồ tuần tự đã được đặt sẵn trong `Contents/Ch05_MoHinhHoaUseCase.tex` (mục *Mô hình hóa tương tác giữa các thành phần*),
các sơ đồ lớp trong `Contents/Ch06_KienTrucThietKe.tex` (mục *Thiết kế lớp*).

## Các điểm mã nguồn khác với `docs/SYSTEM_SPEC.md`

Sơ đồ vẽ theo mã nguồn; những điểm sau lệch so với tài liệu đặc tả nên cần viết theo mã:

- Đăng nhập email dùng mật khẩu BCrypt lưu trong `users.password` và JWT nội bộ HS384; đặc tả ghi mật khẩu do Supabase lưu.
- Chống lặp webhook thanh toán dựa vào trạng thái `payment` (đã `PAID` thì bỏ qua). Lớp `PaymentEvent` và bảng `payment_events` có
  trong mô hình nhưng không có mã nào ghi vào; đặc tả ghi chống lặp bằng `idempotency_key`.
- `Role` còn giá trị cũ `admin` để tương thích ngược, ngoài 4 vai trò chính.
- `BookingStatus` trong mã viết hoa (`CANCELLED`, không phải `canceled`) và có 8 giá trị, thêm `CHECKED_OUT` (trạng thái cũ, chỉ còn được
  đóng thành `COMPLETED`) và `NO_SHOW`; đặc tả chỉ liệt kê 6 giá trị viết thường.
- Liên kết đăng nhập Google vào tài khoản email đã có chỉ được phép với tài khoản khách hàng và token do Google cấp.

## Sơ đồ kiến trúc

Nguồn: `cospace-architecture.drawio` (4 trang; trang `arch-phantang` có PNG nằm ở `../Chuong3/`).

| PNG | Nhãn LaTeX | Nội dung |
|---|---|---|
| `arch-tongthe` | `fig:kientruc_tongthe` | Kiến trúc tổng thể: trình duyệt, máy chủ Spring Boot, Supabase, dịch vụ bên thứ ba |
| `arch-frontend` | `fig:kientruc_frontend` | Các tầng của ứng dụng React (xoay ngang) |
| `arch-trienkhai` | `fig:trienkhai` | Triển khai: Vercel, Render (Docker), Supabase, GitHub Actions giữ máy chủ thức |

## Sơ đồ quan hệ thực thể (ERD)

Nguồn: `cospace-erd.drawio` (7 trang). Sinh tự động từ `BE/src/main/resources/db/migration/V1__baseline.sql`,
nên khi lược đồ đổi chỉ cần chạy lại `python build_erd.py` trong `../../tools/uml`.

| PNG | Nhãn LaTeX | Nội dung |
|---|---|---|
| `erd-00-tongquan` | `fig:erd` | Bản đồ 7 module của 30 bảng, không vẽ quan hệ tới `users` và `branches` |
| `erd-01-dinhdanh` | `fig:erd_dinhdanh` | `users`, `auth_accounts`, `profiles`, `tags`, kỹ năng, sở thích, điểm tương đồng |
| `erd-02-khonggian` | `fig:erd_khonggian` | Chi nhánh, tầng, không gian, loại, tiện ích, bảo trì |
| `erd-03-gia` | `fig:erd_gia` | Bảng giá, dịch vụ bổ sung, chính sách hủy, khuyến mãi, hạng thành viên |
| `erd-04-datcho` | `fig:erd_datcho` | Đơn đặt chỗ, dịch vụ gọi thêm, check-in, bản ghi hủy |
| `erd-05-thanhtoan` | `fig:erd_thanhtoan` | Thanh toán, sự kiện thanh toán, hoàn tiền |
| `erd-06-congdong` | `fig:erd_congdong` | Bài viết, thẻ, thông báo, nhật ký kiểm toán |

Ký hiệu: `PK`, `FK`, `UQ` ghi ngay sau kiểu cột; đầu chân chim ở bảng con; đầu "không hoặc một" ở bảng cha nghĩa là khóa ngoại cho phép NULL;
các cột `created_at`, `updated_at` được lược bớt. Ghi chú `EXCLUDE` trên `bookings` và `workspace_maintenance` là ràng buộc loại trừ
theo khoảng thời gian (lớp bảo vệ thứ hai chống đặt chồng lịch, bên cạnh khóa tư vấn ở ứng dụng).
