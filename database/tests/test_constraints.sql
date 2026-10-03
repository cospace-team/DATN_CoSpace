-- =============================================================================
-- Kiểm thử ràng buộc toàn vẹn trên lược đồ Flyway hiện tại (V1 -> V3)
-- =============================================================================
-- Cách chạy (CSDL đã áp dụng các migration trong BE/src/main/resources/db/migration):
--   psql -d <database> -v ON_ERROR_STOP=1 -f database/tests/test_constraints.sql
--
-- Script chạy trong một giao dịch và ROLLBACK ở cuối, nên không để lại dữ liệu.
-- Mỗi ca kiểm thử ghi một dòng PASS/FAIL vào bảng tạm kq và in ra ở cuối.
-- Script dừng với lỗi nếu có ít nhất một ca FAIL.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE kq (ma text PRIMARY KEY, mo_ta text, ket_qua text, chi_tiet text) ON COMMIT DROP;

-- -----------------------------------------------------------------------------
-- Dữ liệu nền
-- -----------------------------------------------------------------------------
INSERT INTO branches (id, code, name, address, city)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'T-B1', 'Chi nhánh kiểm thử', 'Địa chỉ', 'TP.HCM');

INSERT INTO users (id, email, full_name, role, branch_id) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'kt.customer@test.local', 'Khách kiểm thử', 'customer', NULL),
  ('00000000-0000-0000-0000-0000000000c2', 'kt.customer2@test.local', 'Khách kiểm thử 2', 'customer', NULL),
  ('00000000-0000-0000-0000-0000000000d1', 'kt.staff@test.local', 'Nhân viên kiểm thử', 'staff', '00000000-0000-0000-0000-0000000000b1');

INSERT INTO floors (id, branch_id, floor_no, name, svg_url)
VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 1, 'Tầng 1', 'x');

INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, svg_element_id)
SELECT v.id::uuid, '00000000-0000-0000-0000-0000000000f1', wt.id, v.code, v.code, v.code
FROM (VALUES ('00000000-0000-0000-0000-0000000000a1', 'W1'),
             ('00000000-0000-0000-0000-0000000000a2', 'W2')) AS v(id, code)
CROSS JOIN (SELECT id FROM workspace_types ORDER BY code LIMIT 1) wt;

-- Đơn gốc: CONFIRMED trên W1, 09:00-11:00 (giờ Việt Nam)
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
                      start_at, end_at, unit, status, subtotal_amount, total_amount)
VALUES ('00000000-0000-0000-0000-00000000bb01', 'KT-001', '00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'x',
        '2030-01-01 09:00+07', '2030-01-01 11:00+07', 'hour', 'CONFIRMED', 100000, 100000);

-- Hàm tiện ích: chèn một đơn và trả về SQLSTATE nếu bị từ chối, 'OK' nếu thành công
CREATE FUNCTION pg_temp.them_don(p_code text, p_ws uuid, p_start timestamptz, p_end timestamptz,
                                 p_status text, p_subtotal numeric, p_total numeric,
                                 p_deadline timestamptz DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO bookings (booking_code, user_id, workspace_id, branch_id, workspace_type_id,
                        start_at, end_at, unit, status, subtotal_amount, total_amount, payment_deadline_at)
  VALUES (p_code, '00000000-0000-0000-0000-0000000000c2', p_ws, '00000000-0000-0000-0000-0000000000b1', 'x',
          p_start, p_end, 'hour', p_status, p_subtotal, p_total, p_deadline);
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;

CREATE FUNCTION pg_temp.ghi(p_ma text, p_mo_ta text, p_mong_doi text, p_thuc_te text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO kq VALUES (p_ma, p_mo_ta,
                         CASE WHEN p_mong_doi = p_thuc_te THEN 'PASS' ELSE 'FAIL' END,
                         'mong đợi ' || p_mong_doi || ', thực tế ' || p_thuc_te);
$$;

-- -----------------------------------------------------------------------------
-- Nhóm 1: ràng buộc loại trừ trên bookings
-- -----------------------------------------------------------------------------
DO $$ BEGIN PERFORM pg_temp.ghi('DB-01', 'Đơn CONFIRMED giao với đơn CONFIRMED khác trên cùng chỗ bị từ chối', '23P01',
  pg_temp.them_don('KT-002', '00000000-0000-0000-0000-0000000000a1', '2030-01-01 10:00+07', '2030-01-01 12:00+07', 'CONFIRMED', 100000, 100000)); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-02', 'Đơn PENDING_PAYMENT giao với đơn đang hiệu lực bị từ chối', '23P01',
  pg_temp.them_don('KT-003', '00000000-0000-0000-0000-0000000000a1', '2030-01-01 08:00+07', '2030-01-01 09:30+07', 'PENDING_PAYMENT', 100000, 100000, '2030-01-01 07:15+07')); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-03', 'Đơn đã hủy (CANCELLED) được phép nằm trùng khung giờ', 'OK',
  pg_temp.them_don('KT-004', '00000000-0000-0000-0000-0000000000a1', '2030-01-01 10:00+07', '2030-01-01 12:00+07', 'CANCELLED', 100000, 100000)); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-04', 'Hai đơn liền kề [09:00, 11:00) và [11:00, 12:00) không xung đột', 'OK',
  pg_temp.them_don('KT-005', '00000000-0000-0000-0000-0000000000a1', '2030-01-01 11:00+07', '2030-01-01 12:00+07', 'CONFIRMED', 100000, 100000)); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-05', 'Cùng khung giờ nhưng khác chỗ ngồi được phép', 'OK',
  pg_temp.them_don('KT-006', '00000000-0000-0000-0000-0000000000a2', '2030-01-01 09:00+07', '2030-01-01 11:00+07', 'CONFIRMED', 100000, 100000)); END $$;
-- -----------------------------------------------------------------------------
-- Nhóm 2: ràng buộc CHECK trên bookings
-- -----------------------------------------------------------------------------
DO $$ BEGIN PERFORM pg_temp.ghi('DB-06', 'Tổng tiền khác subtotal - discount + addon bị từ chối (check_booking_amounts)', '23514',
  pg_temp.them_don('KT-007', '00000000-0000-0000-0000-0000000000a2', '2030-01-02 09:00+07', '2030-01-02 10:00+07', 'CONFIRMED', 100000, 90000)); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-07', 'Thời điểm kết thúc không sau thời điểm bắt đầu bị từ chối (check_booking_time)', '23514',
  pg_temp.them_don('KT-008', '00000000-0000-0000-0000-0000000000a2', '2030-01-02 10:00+07', '2030-01-02 10:00+07', 'CONFIRMED', 100000, 100000)); END $$;
DO $$ BEGIN PERFORM pg_temp.ghi('DB-08', 'Đơn PENDING_PAYMENT thiếu hạn thanh toán bị từ chối (check_payment_deadline)', '23514',
  pg_temp.them_don('KT-009', '00000000-0000-0000-0000-0000000000a2', '2030-01-02 11:00+07', '2030-01-02 12:00+07', 'PENDING_PAYMENT', 100000, 100000, NULL)); END $$;
-- -----------------------------------------------------------------------------
-- Nhóm 3: người dùng, bảo trì, check-in, chính sách, hoàn tiền, kết nối
-- -----------------------------------------------------------------------------
DO $$
DECLARE s text;
BEGIN
  -- DB-09: nhân viên bắt buộc thuộc một chi nhánh
  BEGIN
    INSERT INTO users (email, full_name, role, branch_id) VALUES ('kt.staff2@test.local', 'NV', 'staff', NULL);
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-09', 'Nhân viên không gắn chi nhánh bị từ chối (check_branch_by_role)', '23514', s);

  -- DB-10: khách hàng không được gắn chi nhánh
  BEGIN
    INSERT INTO users (email, full_name, role, branch_id)
    VALUES ('kt.customer3@test.local', 'KH', 'customer', '00000000-0000-0000-0000-0000000000b1');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-10', 'Khách hàng gắn chi nhánh bị từ chối (check_branch_by_role)', '23514', s);

  -- DB-11: hai lịch bảo trì đang hiệu lực giao nhau trên cùng chỗ
  INSERT INTO workspace_maintenance (workspace_id, start_at, end_at, status, created_by)
  VALUES ('00000000-0000-0000-0000-0000000000a2', '2030-02-01 08:00+07', '2030-02-01 12:00+07', 'scheduled',
          '00000000-0000-0000-0000-0000000000d1');
  BEGIN
    INSERT INTO workspace_maintenance (workspace_id, start_at, end_at, status, created_by)
    VALUES ('00000000-0000-0000-0000-0000000000a2', '2030-02-01 10:00+07', '2030-02-01 14:00+07', 'active',
            '00000000-0000-0000-0000-0000000000d1');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-11', 'Hai lịch bảo trì giao nhau trên cùng chỗ bị từ chối (no_overlapping_maintenance)', '23P01', s);

  -- DB-12: một đơn chỉ có một lượt check-in đang mở
  INSERT INTO checkin_logs (booking_id, staff_user_id, checkin_at)
  VALUES ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000d1', '2030-01-01 09:00+07');
  BEGIN
    INSERT INTO checkin_logs (booking_id, staff_user_id, checkin_at)
    VALUES ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000d1', '2030-01-01 09:05+07');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-12', 'Lượt check-in thứ hai khi lượt trước chưa check-out bị từ chối (uq_checkin_open)', '23505', s);

  -- DB-13: tỷ lệ hoàn tiền của chính sách hủy nằm trong [0, 100]
  BEGIN
    INSERT INTO cancellation_policies (name, rule_type, min_value, max_value, refund_percent, effective_from)
    VALUES ('Sai', 'BEFORE_START_DAYS', 0, 1, 150, now());
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-13', 'Chính sách hoàn 150% bị từ chối (check_policy_percent)', '23514', s);

  -- DB-14: một giao dịch không được hoàn hai lần với cùng một lý do
  INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status)
  VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb01',
          '00000000-0000-0000-0000-0000000000c1', 'payos', 'qr', 'KT-ORDER-1', 100000, 'PAID');
  INSERT INTO refunds (booking_id, payment_id, user_id, branch_id, amount, reason_type)
  VALUES ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000e1',
          '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 100000, 'LATE_PAYMENT');
  BEGIN
    INSERT INTO refunds (booking_id, payment_id, user_id, branch_id, amount, reason_type)
    VALUES ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000e1',
            '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 100000, 'LATE_PAYMENT');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-14', 'Hoàn tiền lần hai cho cùng giao dịch và lý do bị từ chối (uq_refunds_payment_reason)', '23505', s);

  -- DB-15: một cặp thành viên chỉ có một lời mời kết nối, bất kể ai gửi trước
  INSERT INTO partner_connections (requester_id, addressee_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
  BEGIN
    INSERT INTO partner_connections (requester_id, addressee_id)
    VALUES ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-15', 'Lời mời kết nối theo chiều ngược lại bị từ chối (uq_partner_connections_pair)', '23505', s);

  -- DB-16: không tự kết nối với chính mình
  BEGIN
    INSERT INTO partner_connections (requester_id, addressee_id)
    VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1');
    s := 'OK';
  EXCEPTION WHEN OTHERS THEN s := SQLSTATE; END;
  PERFORM pg_temp.ghi('DB-16', 'Tự gửi lời mời kết nối cho chính mình bị từ chối', '23514', s);
END $$;

-- -----------------------------------------------------------------------------
-- Nhóm 4: dữ liệu khởi tạo
-- -----------------------------------------------------------------------------
DO $$ BEGIN PERFORM pg_temp.ghi('DB-17', 'Dữ liệu khởi tạo có 4 hạng thành viên với mức giảm 0/3/5/10%', '0,3,5,10',
  (SELECT string_agg(discount_percent::text, ',' ORDER BY sort_order) FROM membership_tiers)); END $$;
-- -----------------------------------------------------------------------------
-- Kết quả
-- -----------------------------------------------------------------------------
SELECT ma, ket_qua, mo_ta, chi_tiet FROM kq ORDER BY ma;

DO $$
DECLARE so_loi int;
BEGIN
  SELECT count(*) INTO so_loi FROM kq WHERE ket_qua <> 'PASS';
  IF so_loi > 0 THEN
    RAISE EXCEPTION '% ca kiểm thử không đạt', so_loi;
  END IF;
  RAISE NOTICE 'Tất cả % ca kiểm thử đều đạt', (SELECT count(*) FROM kq);
END $$;

ROLLBACK;
