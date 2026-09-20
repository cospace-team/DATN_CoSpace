-- =============================================================================
-- V2 — Các ràng buộc toàn vẹn còn thiếu + ON UPDATE CASCADE cho users(id)
-- =============================================================================
-- Schema đang chạy thiếu phần lớn ràng buộc mà SYSTEM_SPEC §6.3 mô tả, nên các lỗi
-- logic ở tầng ứng dụng (xem report/LOGIC_AUDIT.md) ghi thẳng được dữ liệu sai
-- xuống database. File này bổ sung lại.
--
-- QUAN TRỌNG — vì sao dùng NOT VALID:
-- Các CHECK bên dưới được thêm ở chế độ NOT VALID. PostgreSQL sẽ áp dụng chúng cho
-- MỌI dòng ghi mới nhưng KHÔNG quét dữ liệu cũ. Nếu dữ liệu lịch sử có dòng vi phạm
-- (ví dụ booking cũ lệch công thức tiền), migration vẫn chạy xong và ứng dụng vẫn
-- khởi động được, thay vì fail lúc boot và làm sập cả hệ thống.
--
-- Sau khi đã dọn dữ liệu cũ, chạy tay từng lệnh VALIDATE ở cuối file để bật kiểm tra
-- đầy đủ. Lệnh VALIDATE chỉ khóa nhẹ (SHARE UPDATE EXCLUSIVE), không chặn đọc/ghi.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ON UPDATE CASCADE cho mọi khóa ngoại trỏ tới users(id) và profiles(user_id)
-- -----------------------------------------------------------------------------
-- /api/auth/sync gắn tài khoản có sẵn vào danh tính Supabase bằng UPDATE users SET id.
-- Không có CASCADE thì thao tác này vi phạm khóa ngoại với bất kỳ tài khoản nào đã có
-- booking, khiến khách đăng ký bằng email rồi đăng nhập Google không vào được tài khoản.
--
-- Dò constraint trong catalog thay vì gọi tên: hai biến thể schema cũ đặt tên khác nhau
-- (fk_bookings_user... so với bookings_user_id_fkey...).
DO $$
DECLARE
    r record;
    new_def text;
BEGIN
    FOR r IN
        SELECT c.conname,
               c.conrelid::regclass::text AS table_name,
               pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.confrelid IN ('users'::regclass, 'profiles'::regclass)
          AND c.confupdtype <> 'c'   -- 'c' = đã có ON UPDATE CASCADE
        ORDER BY 2, 1
    LOOP
        new_def := r.def || ' ON UPDATE CASCADE';
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', r.table_name, r.conname, new_def);
        RAISE NOTICE 'ON UPDATE CASCADE: %.%', r.table_name, r.conname;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. users: vai trò và chi nhánh phải nhất quán (SYSTEM_SPEC §6.3)
-- -----------------------------------------------------------------------------
-- super_admin/customer không thuộc chi nhánh nào; branch_admin/staff bắt buộc có.
-- Role 'admin' là giá trị cũ còn sót lại nên được chấp nhận ở cả hai phía.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_branch_by_role') THEN
        ALTER TABLE users ADD CONSTRAINT check_branch_by_role CHECK (
            (role IN ('super_admin', 'customer') AND branch_id IS NULL)
            OR (role IN ('branch_admin', 'staff') AND branch_id IS NOT NULL)
            OR role = 'admin'
        ) NOT VALID;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. bookings: công thức tiền phải khớp
-- -----------------------------------------------------------------------------
-- total = subtotal - discount + addon + tax + service_fee, và không khoản nào âm.
-- Đây là bất biến mà BookingService, BookingAddonService và CancellationService cùng
-- dựa vào; nếu nó lệch thì mọi con số hoàn tiền và báo cáo đều sai theo.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_booking_amounts') THEN
        ALTER TABLE bookings ADD CONSTRAINT check_booking_amounts CHECK (
            subtotal_amount >= 0
            AND discount_amount >= 0
            AND addon_amount >= 0
            AND total_amount >= 0
            AND total_amount = subtotal_amount - discount_amount + addon_amount
                               + COALESCE(tax_amount, 0) + COALESCE(service_fee_amount, 0)
        ) NOT VALID;
    END IF;
END $$;

-- Đơn đang chờ thanh toán bắt buộc có hạn thanh toán, nếu không scheduler sẽ không bao
-- giờ giải phóng chỗ. So sánh không phân biệt hoa thường vì dữ liệu cũ dùng chữ thường.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_deadline') THEN
        ALTER TABLE bookings ADD CONSTRAINT check_payment_deadline CHECK (
            upper(status) <> 'PENDING_PAYMENT' OR payment_deadline_at IS NOT NULL
        ) NOT VALID;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. cancellation_policies: phần trăm và khoảng giá trị hợp lệ
-- -----------------------------------------------------------------------------
-- API tạo policy nhận thẳng entity và không validate gì (CAN-03), nên hàng rào cuối
-- cùng phải nằm ở database.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_policy_percent') THEN
        ALTER TABLE cancellation_policies ADD CONSTRAINT check_policy_percent
            CHECK (refund_percent >= 0 AND refund_percent <= 100) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_policy_range') THEN
        ALTER TABLE cancellation_policies ADD CONSTRAINT check_policy_range
            CHECK (min_value >= 0 AND max_value >= min_value) NOT VALID;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. checkin_logs: mỗi booking chỉ có một lượt check-in đang mở (SYSTEM_SPEC §7.9)
-- -----------------------------------------------------------------------------
-- Unique index không có chế độ NOT VALID, nên chỉ tạo khi dữ liệu hiện tại đã sạch.
-- Nếu còn dòng trùng, migration ghi cảnh báo và đi tiếp thay vì chặn khởi động; câu
-- truy vấn tìm dòng trùng nằm ở cuối file.
DO $$
DECLARE
    duplicates int;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_checkin_open') THEN
        RETURN;
    END IF;

    SELECT count(*) INTO duplicates FROM (
        SELECT booking_id FROM checkin_logs WHERE checkout_at IS NULL
        GROUP BY booking_id HAVING count(*) > 1
    ) d;

    IF duplicates > 0 THEN
        RAISE WARNING 'Bỏ qua uq_checkin_open: còn % booking có nhiều lượt check-in đang mở. Dọn xong rồi tạo index thủ công.', duplicates;
    ELSE
        CREATE UNIQUE INDEX uq_checkin_open ON checkin_logs (booking_id) WHERE checkout_at IS NULL;
    END IF;
END $$;

-- =============================================================================
-- Việc cần làm tay sau khi đã dọn dữ liệu cũ
-- =============================================================================
-- 1) Tìm dòng vi phạm:
--
--    SELECT id, role, branch_id FROM users
--    WHERE NOT ((role IN ('super_admin','customer') AND branch_id IS NULL)
--            OR (role IN ('branch_admin','staff') AND branch_id IS NOT NULL)
--            OR role = 'admin');
--
--    SELECT id, booking_code, subtotal_amount, discount_amount, addon_amount, total_amount
--    FROM bookings
--    WHERE total_amount <> subtotal_amount - discount_amount + addon_amount
--                          + COALESCE(tax_amount,0) + COALESCE(service_fee_amount,0);
--
--    SELECT id, booking_code FROM bookings
--    WHERE upper(status) = 'PENDING_PAYMENT' AND payment_deadline_at IS NULL;
--
--    SELECT booking_id, count(*) FROM checkin_logs WHERE checkout_at IS NULL
--    GROUP BY booking_id HAVING count(*) > 1;
--
-- 2) Sau khi sửa xong, bật kiểm tra đầy đủ:
--
--    ALTER TABLE users VALIDATE CONSTRAINT check_branch_by_role;
--    ALTER TABLE bookings VALIDATE CONSTRAINT check_booking_amounts;
--    ALTER TABLE bookings VALIDATE CONSTRAINT check_payment_deadline;
--    ALTER TABLE cancellation_policies VALIDATE CONSTRAINT check_policy_percent;
--    ALTER TABLE cancellation_policies VALIDATE CONSTRAINT check_policy_range;
--    CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_open
--        ON checkin_logs (booking_id) WHERE checkout_at IS NULL;
-- =============================================================================
