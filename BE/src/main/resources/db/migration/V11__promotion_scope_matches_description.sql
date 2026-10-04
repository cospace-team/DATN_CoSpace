-- =============================================================================
-- V11 — Điều kiện của mã khuyến mãi demo khớp với mô tả
-- =============================================================================
-- VIPMEMBER ghi "Đặc quyền thành viên Gold/Platinum" nhưng không đặt hạng tối thiểu,
-- nên khách hạng Bronze vừa đăng ký cũng dùng được. TECHFEST26 ghi "cho đơn phòng họp"
-- nhưng không giới hạn loại không gian, nên hiện cả khi đặt bàn hotdesk.
-- Chỉ sửa khi admin chưa tự đặt điều kiện cho các mã này.
-- Mọi lệnh đều idempotent.
-- =============================================================================

UPDATE promotions SET min_tier_code = 'gold'
WHERE code = 'VIPMEMBER' AND min_tier_code IS NULL
  AND EXISTS (SELECT 1 FROM membership_tiers WHERE code = 'gold');

UPDATE promotions SET workspace_type_id = (SELECT id FROM workspace_types WHERE code = 'meeting_room')
WHERE code = 'TECHFEST26' AND workspace_type_id IS NULL
  AND EXISTS (SELECT 1 FROM workspace_types WHERE code = 'meeting_room');
