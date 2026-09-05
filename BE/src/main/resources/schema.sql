-- Spring Boot Auto-Initialization Schema (Robust & Fail-safe)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Ensure 'bookings' table status and price snapshot columns exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE bookings ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addon_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ;

-- 2. Ensure 'payments' table status and transaction columns exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'INITIATED';
ALTER TABLE payments ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4. Ensure is_contract column exists
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_contract BOOLEAN NOT NULL DEFAULT false;

-- 5. Cleanup orphaned checkin logs and sync past checked in bookings
UPDATE checkin_logs cl
SET checkout_at = COALESCE(b.end_at, cl.checkin_at + interval '1 hour'),
    note = COALESCE(cl.note || ' | Auto-closed past checkin', 'Auto-closed past checkin')
FROM bookings b
WHERE cl.booking_id = b.id 
  AND cl.checkout_at IS NULL 
  AND (b.status != 'CHECKED_IN' OR b.end_at < now());

UPDATE bookings
SET status = 'COMPLETED', updated_at = now()
WHERE status = 'CHECKED_IN' AND end_at < now() AND is_contract = false;

-- 6. Truncate end_at to updated_at for past non-contract bookings completed early
UPDATE bookings
SET end_at = updated_at
WHERE status IN ('COMPLETED', 'completed') 
  AND end_at > updated_at 
  AND is_contract = false;

-- 7. Fix exclusion constraint for bookings to only consider active occupying statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workspace_id_start_at_end_at_excl;

ALTER TABLE bookings
ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'pending_payment', 'confirmed', 'checked_in'));

-- 8. Fix exclusion constraint for workspace_maintenance to only consider active/scheduled
ALTER TABLE workspace_maintenance DROP CONSTRAINT IF EXISTS no_overlapping_maintenance;

ALTER TABLE workspace_maintenance
ADD CONSTRAINT no_overlapping_maintenance EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('active', 'scheduled'));

-- 9. Table 'extra_services' (Dịch vụ gia tăng / tiện ích bổ sung)
CREATE TABLE IF NOT EXISTS extra_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL DEFAULT 'item',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extra_services_branch ON extra_services(branch_id);

-- 10. Table 'booking_services' (Dịch vụ gọi thêm trong thời gian đặt chỗ - Running Tab)
CREATE TABLE IF NOT EXISTS booking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES extra_services(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price BIGINT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);

-- 11. Table 'booking_cancellations' (Lịch sử hủy đơn & tính toán hoàn tiền)
CREATE TABLE IF NOT EXISTS booking_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    refund_percent INT NOT NULL DEFAULT 0 CHECK (refund_percent >= 0 AND refund_percent <= 100),
    refund_amount BIGINT NOT NULL DEFAULT 0,
    penalty_amount BIGINT NOT NULL DEFAULT 0,
    refund_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    applied_rule_json JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_cancellations_user ON booking_cancellations(user_id);

-- 12. Table 'notifications' (Hệ thống thông báo in-app)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT false,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- 13. Table 'audit_logs' (Nhật ký kiểm toán hệ thống)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);



