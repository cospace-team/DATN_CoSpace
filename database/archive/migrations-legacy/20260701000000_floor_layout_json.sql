-- ============================================
-- Migration: Add layout_json to floors table
-- ============================================
-- Purpose: Support structured floor layout data for the
--          interactive drag-and-drop Floor Plan Editor.
--          This replaces/supplements the svg_content approach.
-- Date: 2026-07-01

BEGIN;

-- Add layout_json column to store structured layout data
ALTER TABLE floors
  ADD COLUMN IF NOT EXISTS layout_json JSONB;

-- Add svg_content column if not already present (for inline SVG rendering)
ALTER TABLE floors
  ADD COLUMN IF NOT EXISTS svg_content TEXT;

-- Comment for documentation
COMMENT ON COLUMN floors.layout_json IS
  'Structured floor layout JSON from the drag-and-drop editor. Schema: { version, canvas: {width, height, gridSize, backgroundColor}, elements: [{id, type, x, y, width, height, rotation, label, ...}] }';

COMMENT ON COLUMN floors.svg_content IS
  'Raw SVG content for legacy SVG-upload based floor plans. Being replaced by layout_json.';

-- GIN index for JSONB queries (optional, for performance if querying inside layout_json)
CREATE INDEX IF NOT EXISTS idx_floors_layout_json
  ON floors USING GIN (layout_json);

COMMIT;
