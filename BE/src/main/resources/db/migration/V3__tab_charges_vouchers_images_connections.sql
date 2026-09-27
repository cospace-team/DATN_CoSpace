-- =============================================================================
-- V3 — Phí phụ trên running tab, voucher hoàn tiền, ảnh không gian, kết nối đối tác
-- =============================================================================
-- 1. booking_services mở rộng thành "dòng phí" của running tab: ngoài dịch vụ thêm
--    còn chứa phí gia hạn giờ (extension) và phụ phí check-out muộn (late_fee). Các
--    dòng này không gắn với extra_services nên service_id được phép NULL.
-- 2. promotions.owner_user_id: voucher cá nhân (hoàn tiền bằng voucher) chỉ chủ sở
--    hữu dùng được. refunds ghi lại hình thức hoàn (tiền / voucher).
-- 3. workspace_images: ảnh của từng không gian (URL trên Supabase Storage).
-- 4. partner_connections: lời mời kết nối giữa hai thành viên.
-- Mọi lệnh đều idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Running tab: dòng phí gia hạn / check-out muộn
-- -----------------------------------------------------------------------------
ALTER TABLE booking_services ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS line_type VARCHAR(16) NOT NULL DEFAULT 'service';
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS description VARCHAR(200);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_booking_services_line_type') THEN
        ALTER TABLE booking_services ADD CONSTRAINT check_booking_services_line_type CHECK (
            line_type IN ('service', 'extension', 'late_fee')
            AND (line_type <> 'service' OR service_id IS NOT NULL)
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Voucher hoàn tiền
-- -----------------------------------------------------------------------------
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS idx_promotions_owner ON promotions (owner_user_id) WHERE owner_user_id IS NOT NULL;

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_method VARCHAR(16);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS voucher_promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_refunds_method') THEN
        ALTER TABLE refunds ADD CONSTRAINT check_refunds_method CHECK (
            refund_method IS NULL OR refund_method IN ('cash', 'bank_transfer', 'voucher')
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Ảnh không gian
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,
    storage_path VARCHAR(512),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspace_images_workspace ON workspace_images (workspace_id, sort_order);

-- -----------------------------------------------------------------------------
-- 4. Kết nối đối tác
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    message VARCHAR(500),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_partner_connections_status CHECK (status IN ('pending', 'accepted', 'declined')),
    CONSTRAINT check_partner_connections_self CHECK (requester_id <> addressee_id)
);
-- Một cặp thành viên chỉ có một bản ghi, bất kể ai gửi trước.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_connections_pair
    ON partner_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_partner_connections_addressee ON partner_connections (addressee_id, status);
