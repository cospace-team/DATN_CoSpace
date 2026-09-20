# Migrations cũ (đã ngừng sử dụng)

Các file trong thư mục này **không còn được chạy** và chỉ giữ lại để tra cứu lịch sử. Từ 20/09/2026,
`schema.sql` (trước đây nằm ở `BE/src/main/resources/`) cũng được chuyển vào đây: nội dung của nó đã
nằm trọn trong `V1__baseline.sql`, nên để lại trên classpath chỉ khiến `spring.sql.init.mode: always`
chạy lại toàn bộ DDL mỗi lần khởi động ở môi trường dev.

Từ 20/09/2026, schema do Flyway quản lý (quyết định Q15 trong [report/LOGIC_AUDIT.md](../../../report/LOGIC_AUDIT.md)):

| Nơi | Vai trò |
|---|---|
| `BE/src/main/resources/db/migration/V1__baseline.sql` | Schema mà ứng dụng đang chạy, gộp từ `database/full_schema_complete.sql` + `BE/src/main/resources/schema.sql` |
| `BE/src/main/resources/db/migration/V2__constraints.sql` | Bổ sung các ràng buộc toàn vẹn còn thiếu theo SYSTEM_SPEC §6.3 |
| `BE/src/main/resources/db/migration/V<n>__*.sql` | Mọi thay đổi schema về sau |

## Vì sao bộ script này bị loại bỏ

Bản audit phát hiện chuỗi migration cũ **không dựng lại được** schema mà code cần:

- `20240101000000_core_schema.sql` tạo kiểu enum PostgreSQL viết thường (`pending_payment`), trong khi entity Java lưu chữ HOA vào cột `varchar` (`PENDING_PAYMENT`). Chạy bộ này xong thì ứng dụng không insert được booking.
- `20260906000000_add_missing_tables.sql` định nghĩa lại `booking_services` và `booking_cancellations` với cột khác hẳn bản trong core schema (`service_id`/`subtotal` so với `extra_service_id`/`line_total`).
- Không file nào tạo `promotions`, `refunds` hay `membership_tiers` — các bảng này chỉ có trong `BE/src/main/resources/schema.sql`, vốn bị tắt ở production (`spring.sql.init.mode: never`).

Nói cách khác, production đã được dựng bằng tay và không script nào trong thư mục này tái lập được nó.
