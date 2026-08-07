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
