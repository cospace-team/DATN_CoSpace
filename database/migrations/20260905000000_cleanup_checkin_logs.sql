-- Migration: Cleanup orphaned checkin logs & sync past checked in bookings
-- Date: 2026-09-05

-- 1. Close checkout_at for past bookings that have already passed their end_at or are not CHECKED_IN
UPDATE checkin_logs cl
SET checkout_at = COALESCE(b.end_at, cl.checkin_at + interval '1 hour'),
    note = COALESCE(cl.note || ' | Auto-closed past checkin', 'Auto-closed past checkin')
FROM bookings b
WHERE cl.booking_id = b.id 
  AND cl.checkout_at IS NULL 
  AND (b.status != 'CHECKED_IN' OR b.end_at < now());

-- 2. Mark any past hourly/daily bookings whose end_at has passed as COMPLETED
UPDATE bookings
SET status = 'COMPLETED', updated_at = now()
WHERE status = 'CHECKED_IN' AND end_at < now() AND is_contract = false;
