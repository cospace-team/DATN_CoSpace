-- Migration: Refactor Booking & Payment Enums and Price Snapshot
-- Date: 2026-08-03

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Create ENUM types safely if not existing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'PENDING_PAYMENT',
            'CONFIRMED',
            'CHECKED_IN',
            'CHECKED_OUT',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED',
            'NO_SHOW'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'INITIATED',
            'PENDING',
            'AUTHORIZED',
            'PAID',
            'FAILED',
            'CANCELLED',
            'REFUNDED',
            'EXPIRED'
        );
    END IF;
END $$;

-- 2. Update 'bookings' table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT';

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(19, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;

-- Add exclusion constraint if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_workspace_id_start_at_end_at_excl'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
            workspace_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        );
    END IF;
END $$;

-- 3. Update 'payments' table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status payment_status NOT NULL DEFAULT 'INITIATED';

-- Rename provider_trans_id if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'provider_trans_id'
    ) THEN
        ALTER TABLE payments RENAME COLUMN provider_trans_id TO gateway_transaction_id;
    ELSE
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(64);
    END IF;
END $$;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
