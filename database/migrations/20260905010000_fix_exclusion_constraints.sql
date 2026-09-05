-- Migration: Fix Exclusion Constraints for Bookings & Workspace Maintenance
-- Date: 2026-09-05

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Truncate end_at to updated_at for past non-contract bookings completed early
UPDATE bookings
SET end_at = updated_at
WHERE status IN ('COMPLETED', 'completed') 
  AND end_at > updated_at 
  AND is_contract = false;

-- 2. Recreate exclusion constraint for bookings with active statuses only
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workspace_id_start_at_end_at_excl;

ALTER TABLE bookings
ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'pending_payment', 'confirmed', 'checked_in'));

-- 3. Recreate exclusion constraint for workspace_maintenance with active/scheduled statuses only
ALTER TABLE workspace_maintenance DROP CONSTRAINT IF EXISTS no_overlapping_maintenance;

ALTER TABLE workspace_maintenance
ADD CONSTRAINT no_overlapping_maintenance EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('active', 'scheduled'));
