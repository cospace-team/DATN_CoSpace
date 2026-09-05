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


