-- =============================================================================
-- CoSpace Seed Script: 3 Branches, 9 Floors (3 Distinct Layouts Each)
-- Seeds: Branches, Floors (SVG + layout_json), Workspaces & Price Policies
-- Compatible with FE FloorPlanEditor (FE/src/data/elementCatalog.ts)
-- Database Target: PostgreSQL 13+ / Supabase PostgreSQL
-- Date: 2026-08-03
-- =============================================================================

BEGIN;

-- 1. ENSURE WORKSPACE TYPES EXIST WITH FIXED UUIDs
INSERT INTO workspace_types (id, code, name, capacity_default) 
VALUES 
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'desk', 'Bàn làm việc', 1),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', 'Phòng họp', 8),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'private_office', 'Văn phòng riêng', 4)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  capacity_default = EXCLUDED.capacity_default;

-- =============================================================================
-- BRANCH 1: CoSpace Nguyễn Huệ (Quận 1, TP.HCM)
-- ID: b1000000-0000-0000-0000-000000000001
-- =============================================================================
INSERT INTO branches (id, code, name, address, city, timezone, open_time, close_time, status)
VALUES (
  'b1000000-0000-0000-0000-000000000001'::uuid,
  'CS-Q1',
  'CoSpace Nguyễn Huệ - Innovation Hub',
  '68 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
  'TP. Hồ Chí Minh',
  'Asia/Ho_Chi_Minh',
  '07:00:00',
  '22:00:00',
  'active'
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- Branch 1 - Floor 1: Open Hotdesking & Café (Layout A)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f1010000-0000-0000-0000-000000000001'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid,
  1,
  'Tầng 1 - Open Hotdesking & Café Lounge',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Tầng 1: Hotdesking & Lounge</text><g id="b1-f1-desk-101"><rect x="60" y="100" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/><text x="100" y="152" font-size="14" fill="#334155">Bàn HD-101</text></g><g id="b1-f1-desk-102"><rect x="230" y="100" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/><text x="270" y="152" font-size="14" fill="#334155">Bàn HD-102</text></g><g id="b1-f1-desk-103"><rect x="400" y="100" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/><text x="440" y="152" font-size="14" fill="#334155">Bàn HD-103</text></g><g id="b1-f1-desk-104"><rect x="60" y="240" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/><text x="100" y="292" font-size="14" fill="#334155">Bàn HD-104</text></g><g id="b1-f1-desk-105"><rect x="230" y="240" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/><text x="270" y="292" font-size="14" fill="#334155">Bàn HD-105</text></g><g id="b1-f1-room-101"><rect x="420" y="240" width="320" height="280" rx="12" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="3"/><text x="500" y="380" font-size="16" font-weight="bold" fill="#5b21b6">Phòng họp Lounge (8 người)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
    "elements": [
      { "id": "el-b1f1-rec", "type": "reception", "x": 80, "y": 80, "width": 160, "height": 50, "rotation": 0, "label": "Lễ Tân CoSpace", "fillColor": "rgba(168,85,247,0.12)", "strokeColor": "#A855F7", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
      { "id": "el-b1f1-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
      { "id": "el-b1f1-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Pantry & Coffee Bar", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
      { "id": "el-b1f1-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
      { "id": "el-b1f1-hd101", "type": "desk", "x": 100, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-101", "sublabel": "Bàn Hotdesk 101", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b1f1-hd102", "type": "desk", "x": 260, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-102", "sublabel": "Bàn Hotdesk 102", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b1f1-hd103", "type": "desk", "x": 420, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-103", "sublabel": "Bàn Hotdesk 103", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010003-0000-0000-0000-000000000003", "locked": false, "visible": true },
      { "id": "el-b1f1-hd104", "type": "desk", "x": 100, "y": 340, "width": 120, "height": 80, "rotation": 0, "label": "HD-104", "sublabel": "Bàn Hotdesk 104", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010004-0000-0000-0000-000000000004", "locked": false, "visible": true },
      { "id": "el-b1f1-hd105", "type": "desk", "x": 260, "y": 340, "width": 120, "height": 80, "rotation": 0, "label": "HD-105", "sublabel": "Bàn Hotdesk 105", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010005-0000-0000-0000-000000000005", "locked": false, "visible": true },
      { "id": "el-b1f1-mr101", "type": "meeting_room", "x": 620, "y": 200, "width": 340, "height": 260, "rotation": 0, "label": "MR-101", "sublabel": "Phòng họp Lounge", "seatCount": 8, "fillColor": "rgba(59,130,246,0.12)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1010006-0000-0000-0000-000000000006", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 1 - Floor 1
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c1010001-0000-0000-0000-000000000001'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'HD-101', 'Bàn Hotdesk 101', 1, 'b1-f1-desk-101', 'active'),
  ('c1010002-0000-0000-0000-000000000002'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'HD-102', 'Bàn Hotdesk 102', 1, 'b1-f1-desk-102', 'active'),
  ('c1010003-0000-0000-0000-000000000003'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'HD-103', 'Bàn Hotdesk 103', 1, 'b1-f1-desk-103', 'active'),
  ('c1010004-0000-0000-0000-000000000004'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'HD-104', 'Bàn Hotdesk 104', 1, 'b1-f1-desk-104', 'active'),
  ('c1010005-0000-0000-0000-000000000005'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'HD-105', 'Bàn Hotdesk 105', 1, 'b1-f1-desk-105', 'active'),
  ('c1010006-0000-0000-0000-000000000006'::uuid, 'f1010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'MR-101', 'Phòng họp Lounge', 8, 'b1-f1-room-101', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 1 - Floor 2: Dedicated Desks & Meeting Rooms (Layout B)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f1020000-0000-0000-0000-000000000002'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid,
  2,
  'Tầng 2 - Meeting Suites & Dedicated Workstations',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Tầng 2: Meeting Suites</text><g id="b1-f2-room-201"><rect x="50" y="80" width="320" height="220" rx="12" fill="#fed7aa" stroke="#f97316" strokeWidth="3"/><text x="120" y="190" font-size="16" font-weight="bold" fill="#c2410c">Phòng họp Meeting-A (6 chỗ)</text></g><g id="b1-f2-room-202"><rect x="420" y="80" width="330" height="220" rx="12" fill="#fed7aa" stroke="#f97316" strokeWidth="3"/><text x="490" y="190" font-size="16" font-weight="bold" fill="#c2410c">Phòng họp Meeting-B (10 chỗ)</text></g><g id="b1-f2-desk-201"><rect x="50" y="350" width="150" height="180" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="2"/><text x="80" y="440" font-size="14" fill="#15803d">Cụm bàn DD-201</text></g><g id="b1-f2-desk-202"><rect x="230" y="350" width="150" height="180" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="2"/><text x="260" y="440" font-size="14" fill="#15803d">Cụm bàn DD-202</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f1f5f9" },
    "elements": [
      { "id": "el-b1f2-lounge", "type": "lounge", "x": 80, "y": 80, "width": 200, "height": 100, "rotation": 0, "label": "Lounge Cà Phê", "fillColor": "rgba(251,146,60,0.12)", "strokeColor": "#FB923C", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
      { "id": "el-b1f2-mr201", "type": "meeting_room", "x": 80, "y": 240, "width": 340, "height": 240, "rotation": 0, "label": "MR-201", "sublabel": "Phòng họp Meeting-A", "seatCount": 6, "fillColor": "rgba(249,115,22,0.12)", "strokeColor": "#F97316", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b1f2-mr202", "type": "meeting_room", "x": 480, "y": 240, "width": 380, "height": 240, "rotation": 0, "label": "MR-202", "sublabel": "Phòng họp Meeting-B", "seatCount": 10, "fillColor": "rgba(249,115,22,0.12)", "strokeColor": "#F97316", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b1f2-dd201", "type": "desk", "x": 80, "y": 540, "width": 200, "height": 180, "rotation": 0, "label": "DD-201", "sublabel": "Cụm bàn Dedicated 201", "seatCount": 2, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 6, "workspaceId": "c1020003-0000-0000-0000-000000000003", "locked": false, "visible": true },
      { "id": "el-b1f2-dd202", "type": "desk", "x": 340, "y": 540, "width": 200, "height": 180, "rotation": 0, "label": "DD-202", "sublabel": "Cụm bàn Dedicated 202", "seatCount": 2, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 6, "workspaceId": "c1020004-0000-0000-0000-000000000004", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 1 - Floor 2
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c1020001-0000-0000-0000-000000000001'::uuid, 'f1020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'MR-201', 'Phòng họp Meeting-A', 6, 'b1-f2-room-201', 'active'),
  ('c1020002-0000-0000-0000-000000000002'::uuid, 'f1020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'MR-202', 'Phòng họp Meeting-B', 10, 'b1-f2-room-202', 'active'),
  ('c1020003-0000-0000-0000-000000000003'::uuid, 'f1020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'DD-201', 'Cụm bàn Dedicated 201', 2, 'b1-f2-desk-201', 'active'),
  ('c1020004-0000-0000-0000-000000000004'::uuid, 'f1020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'DD-202', 'Cụm bàn Dedicated 202', 2, 'b1-f2-desk-202', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 1 - Floor 3: Private Offices Suite (Layout C)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f1030000-0000-0000-0000-000000000003'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid,
  3,
  'Tầng 3 - Executive Private Offices',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#fafafa" stroke="#cbd5e1" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Tầng 3: Executive Private Offices</text><g id="b1-f3-office-301"><rect x="50" y="80" width="330" height="220" rx="12" fill="#bfdbfe" stroke="#2563eb" strokeWidth="3"/><text x="120" y="190" font-size="16" font-weight="bold" fill="#1e40af">Private Office PO-301 (4 chỗ)</text></g><g id="b1-f3-office-302"><rect x="420" y="80" width="330" height="220" rx="12" fill="#bfdbfe" stroke="#2563eb" strokeWidth="3"/><text x="490" y="190" font-size="16" font-weight="bold" fill="#1e40af">Private Office PO-302 (6 chỗ)</text></g><g id="b1-f3-office-303"><rect x="50" y="340" width="700" height="210" rx="12" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="3"/><text x="260" y="450" font-size="18" font-weight="bold" fill="#3730a3">Director Penthouse Suite PO-303 (12 chỗ)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fafafa" },
    "elements": [
      { "id": "el-b1f3-po301", "type": "private_office", "x": 80, "y": 100, "width": 380, "height": 260, "rotation": 0, "label": "PO-301", "sublabel": "Văn phòng riêng PO-301", "seatCount": 4, "fillColor": "rgba(37,99,235,0.12)", "strokeColor": "#2563EB", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b1f3-po302", "type": "private_office", "x": 500, "y": 100, "width": 380, "height": 260, "rotation": 0, "label": "PO-302", "sublabel": "Văn phòng riêng PO-302", "seatCount": 6, "fillColor": "rgba(37,99,235,0.12)", "strokeColor": "#2563EB", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b1f3-po303", "type": "private_office", "x": 80, "y": 420, "width": 800, "height": 280, "rotation": 0, "label": "PO-303", "sublabel": "Director Penthouse Suite PO-303", "seatCount": 12, "fillColor": "rgba(79,70,229,0.15)", "strokeColor": "#4F46E5", "opacity": 1, "cornerRadius": 10, "workspaceId": "c1030003-0000-0000-0000-000000000003", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 1 - Floor 3
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c1030001-0000-0000-0000-000000000001'::uuid, 'f1030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'PO-301', 'Văn phòng riêng PO-301', 4, 'b1-f3-office-301', 'active'),
  ('c1030002-0000-0000-0000-000000000002'::uuid, 'f1030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'PO-302', 'Văn phòng riêng PO-302', 6, 'b1-f3-office-302', 'active'),
  ('c1030003-0000-0000-0000-000000000003'::uuid, 'f1030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'PO-303', 'Director Suite PO-303', 12, 'b1-f3-office-303', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;


-- =============================================================================
-- BRANCH 2: CoSpace Nam Kỳ Khởi Nghĩa (Quận 3, TP.HCM)
-- ID: b2000000-0000-0000-0000-000000000002
-- =============================================================================
INSERT INTO branches (id, code, name, address, city, timezone, open_time, close_time, status)
VALUES (
  'b2000000-0000-0000-0000-000000000002'::uuid,
  'CS-Q3',
  'CoSpace Nam Kỳ Khởi Nghĩa - Tech & Creative',
  '201 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3',
  'TP. Hồ Chí Minh',
  'Asia/Ho_Chi_Minh',
  '07:30:00',
  '21:30:00',
  'active'
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- Branch 2 - Floor 1: Creative Pods & Flex Workspace (Layout D)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f2010000-0000-0000-0000-000000000001'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid,
  1,
  'Tầng 1 - Creative Pods & Flex Area',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#fdf4ff" stroke="#f0abfc" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#701a75">Tầng 1: Creative Flex Pods</text><g id="b2-f1-desk-101"><circle cx="200" cy="200" r="80" fill="#f5d0fe" stroke="#c084fc" strokeWidth="3"/><text x="160" y="205" font-size="14" font-weight="bold" fill="#6b21a8">Pod Flex-101</text></g><g id="b2-f1-desk-102"><circle cx="550" cy="200" r="80" fill="#f5d0fe" stroke="#c084fc" strokeWidth="3"/><text x="510" y="205" font-size="14" font-weight="bold" fill="#6b21a8">Pod Flex-102</text></g><g id="b2-f1-room-101"><rect x="150" y="360" width="500" height="180" rx="16" fill="#fce7f3" stroke="#ec4899" strokeWidth="3"/><text x="300" y="450" font-size="16" font-weight="bold" fill="#9d174d">Phòng họp Sáng Tạo (12 người)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fdf4ff" },
    "elements": [
      { "id": "el-b2f1-fl101", "type": "custom_circle", "x": 120, "y": 120, "width": 180, "height": 180, "rotation": 0, "label": "FL-101", "sublabel": "Creative Pod 101", "seatCount": 2, "fillColor": "rgba(192,132,252,0.18)", "strokeColor": "#C084FC", "opacity": 1, "cornerRadius": 90, "workspaceId": "c2010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b2f1-fl102", "type": "custom_circle", "x": 480, "y": 120, "width": 180, "height": 180, "rotation": 0, "label": "FL-102", "sublabel": "Creative Pod 102", "seatCount": 2, "fillColor": "rgba(192,132,252,0.18)", "strokeColor": "#C084FC", "opacity": 1, "cornerRadius": 90, "workspaceId": "c2010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b2f1-mr102", "type": "meeting_room", "x": 120, "y": 380, "width": 540, "height": 260, "rotation": 0, "label": "MR-102", "sublabel": "Phòng họp Sáng Tạo", "seatCount": 12, "fillColor": "rgba(236,72,153,0.12)", "strokeColor": "#EC4899", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2010003-0000-0000-0000-000000000003", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 2 - Floor 1
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c2010001-0000-0000-0000-000000000001'::uuid, 'f2010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'FL-101', 'Creative Pod 101', 2, 'b2-f1-desk-101', 'active'),
  ('c2010002-0000-0000-0000-000000000002'::uuid, 'f2010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'FL-102', 'Creative Pod 102', 2, 'b2-f1-desk-102', 'active'),
  ('c2010003-0000-0000-0000-000000000003'::uuid, 'f2010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'MR-102', 'Phòng họp Sáng Tạo', 12, 'b2-f1-room-101', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 2 - Floor 2: Team Studios & Brainstorm Hub (Layout E)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f2020000-0000-0000-0000-000000000002'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid,
  2,
  'Tầng 2 - Team Studios & Brainstorm Hub',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f0fdf4" stroke="#86efac" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#14532d">Tầng 2: Team Studios & Brainstorm</text><g id="b2-f2-room-201"><rect x="60" y="90" width="220" height="200" rx="10" fill="#bbf7d0" stroke="#16a34a" strokeWidth="3"/><text x="90" y="190" font-size="15" font-weight="bold" fill="#14532d">Brainstorm Room 1</text></g><g id="b2-f2-room-202"><rect x="310" y="90" width="220" height="200" rx="10" fill="#bbf7d0" stroke="#16a34a" strokeWidth="3"/><text x="340" y="190" font-size="15" font-weight="bold" fill="#14532d">Brainstorm Room 2</text></g><g id="b2-f2-office-201"><rect x="560" y="90" width="180" height="440" rx="12" fill="#c7d2fe" stroke="#4338ca" strokeWidth="3"/><text x="590" y="310" font-size="16" font-weight="bold" fill="#312e81">Team Studio TS-201</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f0fdf4" },
    "elements": [
      { "id": "el-b2f2-bs201", "type": "meeting_room", "x": 80, "y": 100, "width": 260, "height": 220, "rotation": 0, "label": "BS-201", "sublabel": "Brainstorm Room 1", "seatCount": 6, "fillColor": "rgba(22,163,74,0.12)", "strokeColor": "#16A34A", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b2f2-bs202", "type": "meeting_room", "x": 380, "y": 100, "width": 260, "height": 220, "rotation": 0, "label": "BS-202", "sublabel": "Brainstorm Room 2", "seatCount": 6, "fillColor": "rgba(22,163,74,0.12)", "strokeColor": "#16A34A", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b2f2-ts201", "type": "private_office", "x": 680, "y": 100, "width": 240, "height": 520, "rotation": 0, "label": "TS-201", "sublabel": "Team Studio TS-201", "seatCount": 8, "fillColor": "rgba(67,56,202,0.15)", "strokeColor": "#4338CA", "opacity": 1, "cornerRadius": 10, "workspaceId": "c2020003-0000-0000-0000-000000000003", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 2 - Floor 2
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c2020001-0000-0000-0000-000000000001'::uuid, 'f2020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'BS-201', 'Brainstorm Room 1', 6, 'b2-f2-room-201', 'active'),
  ('c2020002-0000-0000-0000-000000000002'::uuid, 'f2020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'BS-202', 'Brainstorm Room 2', 6, 'b2-f2-room-202', 'active'),
  ('c2020003-0000-0000-0000-000000000003'::uuid, 'f2020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'TS-201', 'Team Studio TS-201', 8, 'b2-f2-office-201', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 2 - Floor 3: Enterprise Suites (Layout F)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f2030000-0000-0000-0000-000000000003'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid,
  3,
  'Tầng 3 - Corporate Enterprise Suites',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#fffbebf" stroke="#fde68a" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#78350f">Tầng 3: Corporate Enterprise Suites</text><g id="b2-f3-office-301"><rect x="50" y="80" width="330" height="460" rx="16" fill="#fef3c7" stroke="#d97706" strokeWidth="3"/><text x="110" y="300" font-size="18" font-weight="bold" fill="#92400e">Enterprise Suite A (15 chỗ)</text></g><g id="b2-f3-office-302"><rect x="420" y="80" width="330" height="460" rx="16" fill="#fef3c7" stroke="#d97706" strokeWidth="3"/><text x="480" y="300" font-size="18" font-weight="bold" fill="#92400e">Enterprise Suite B (15 chỗ)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fffbeb" },
    "elements": [
      { "id": "el-b2f3-es301", "type": "private_office", "x": 80, "y": 100, "width": 400, "height": 540, "rotation": 0, "label": "ES-301", "sublabel": "Enterprise Suite A", "seatCount": 15, "fillColor": "rgba(217,119,6,0.15)", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b2f3-es302", "type": "private_office", "x": 520, "y": 100, "width": 400, "height": 540, "rotation": 0, "label": "ES-302", "sublabel": "Enterprise Suite B", "seatCount": 15, "fillColor": "rgba(217,119,6,0.15)", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2030002-0000-0000-0000-000000000002", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 2 - Floor 3
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c2030001-0000-0000-0000-000000000001'::uuid, 'f2030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'ES-301', 'Enterprise Suite A', 15, 'b2-f3-office-301', 'active'),
  ('c2030002-0000-0000-0000-000000000002'::uuid, 'f2030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'ES-302', 'Enterprise Suite B', 15, 'b2-f3-office-302', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;


-- =============================================================================
-- BRANCH 3: CoSpace Cầu Giấy (Quận Cầu Giấy, Hà Nội)
-- ID: b3000000-0000-0000-0000-000000000003
-- =============================================================================
INSERT INTO branches (id, code, name, address, city, timezone, open_time, close_time, status)
VALUES (
  'b3000000-0000-0000-0000-000000000003'::uuid,
  'CS-CG',
  'CoSpace Cầu Giấy - Tech Community Hub',
  '12 Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy',
  'Hà Nội',
  'Asia/Ho_Chi_Minh',
  '08:00:00',
  '21:00:00',
  'active'
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- Branch 3 - Floor 1: Tech Community & Open Workspace (Layout G)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f3010000-0000-0000-0000-000000000001'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid,
  1,
  'Tầng 1 - Tech Community & Event Space',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#ecfeff" stroke="#67e8f9" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#083344">Tầng 1: Tech Community Hub</text><g id="b3-f1-desk-101"><rect x="50" y="100" width="300" height="120" rx="8" fill="#a5f3fc" stroke="#0891b2" strokeWidth="2"/><text x="120" y="165" font-size="14" font-weight="bold" fill="#155e75">Dãy bàn Tech-A (6 chỗ)</text></g><g id="b3-f1-desk-102"><rect x="50" y="260" width="300" height="120" rx="8" fill="#a5f3fc" stroke="#0891b2" strokeWidth="2"/><text x="120" y="325" font-size="14" font-weight="bold" fill="#155e75">Dãy bàn Tech-B (6 chỗ)</text></g><g id="b3-f1-room-101"><rect x="400" y="100" width="350" height="420" rx="14" fill="#cffafe" stroke="#06b6d4" strokeWidth="3"/><text x="470" y="300" font-size="18" font-weight="bold" fill="#0e7490">Hội trường Event Room (30 chỗ)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#ecfeff" },
    "elements": [
      { "id": "el-b3f1-ta101", "type": "desk", "x": 80, "y": 120, "width": 360, "height": 140, "rotation": 0, "label": "TA-101", "sublabel": "Dãy bàn Tech-A", "seatCount": 6, "fillColor": "rgba(8,145,178,0.12)", "strokeColor": "#0891B2", "opacity": 1, "cornerRadius": 6, "workspaceId": "c3010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b3f1-tb102", "type": "desk", "x": 80, "y": 320, "width": 360, "height": 140, "rotation": 0, "label": "TB-102", "sublabel": "Dãy bàn Tech-B", "seatCount": 6, "fillColor": "rgba(8,145,178,0.12)", "strokeColor": "#0891B2", "opacity": 1, "cornerRadius": 6, "workspaceId": "c3010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b3f1-ev101", "type": "meeting_room", "x": 480, "y": 120, "width": 420, "height": 500, "rotation": 0, "label": "EV-101", "sublabel": "Hội trường Event Room", "seatCount": 30, "fillColor": "rgba(6,182,212,0.15)", "strokeColor": "#06B6D4", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3010003-0000-0000-0000-000000000003", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 3 - Floor 1
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c3010001-0000-0000-0000-000000000001'::uuid, 'f3010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'TA-101', 'Dãy bàn Tech-A', 6, 'b3-f1-desk-101', 'active'),
  ('c3010002-0000-0000-0000-000000000002'::uuid, 'f3010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'TB-102', 'Dãy bàn Tech-B', 6, 'b3-f1-desk-102', 'active'),
  ('c3010003-0000-0000-0000-000000000003'::uuid, 'f3010000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'EV-101', 'Hội trường Event Room', 30, 'b3-f1-room-101', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 3 - Floor 2: Scale-up Workstations & Boardrooms (Layout H)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f3020000-0000-0000-0000-000000000002'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid,
  2,
  'Tầng 2 - Scale-up Workstations & Boardrooms',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#fef2f2" stroke="#fca5a5" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#7f1d1d">Tầng 2: Scale-up Hub</text><g id="b3-f2-room-201"><rect x="60" y="100" width="310" height="200" rx="10" fill="#fecaca" stroke="#ef4444" strokeWidth="3"/><text x="130" y="200" font-size="16" font-weight="bold" fill="#991b1b">Boardroom VIP (10 chỗ)</text></g><g id="b3-f2-room-202"><rect x="420" y="100" width="310" height="200" rx="10" fill="#fecaca" stroke="#ef4444" strokeWidth="3"/><text x="490" y="200" font-size="16" font-weight="bold" fill="#991b1b">Phòng họp Team (8 chỗ)</text></g><g id="b3-f2-office-201"><rect x="60" y="340" width="670" height="200" rx="12" fill="#fed7aa" stroke="#ea580c" strokeWidth="3"/><text x="260" y="450" font-size="18" font-weight="bold" fill="#9a3412">Scale-up Office Suite (16 chỗ)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fef2f2" },
    "elements": [
      { "id": "el-b3f2-br201", "type": "meeting_room", "x": 80, "y": 100, "width": 360, "height": 220, "rotation": 0, "label": "BR-201", "sublabel": "Boardroom VIP", "seatCount": 10, "fillColor": "rgba(239,68,68,0.12)", "strokeColor": "#EF4444", "opacity": 1, "cornerRadius": 8, "workspaceId": "c3020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b3f2-mr202", "type": "meeting_room", "x": 480, "y": 100, "width": 360, "height": 220, "rotation": 0, "label": "MR-202", "sublabel": "Phòng họp Team", "seatCount": 8, "fillColor": "rgba(239,68,68,0.12)", "strokeColor": "#EF4444", "opacity": 1, "cornerRadius": 8, "workspaceId": "c3020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
      { "id": "el-b3f2-su201", "type": "private_office", "x": 80, "y": 380, "width": 760, "height": 260, "rotation": 0, "label": "SU-201", "sublabel": "Scale-up Office Suite", "seatCount": 16, "fillColor": "rgba(234,88,12,0.15)", "strokeColor": "#EA580C", "opacity": 1, "cornerRadius": 10, "workspaceId": "c3020003-0000-0000-0000-000000000002", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 3 - Floor 2
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c3020001-0000-0000-0000-000000000001'::uuid, 'f3020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'BR-201', 'Boardroom VIP', 10, 'b3-f2-room-201', 'active'),
  ('c3020002-0000-0000-0000-000000000002'::uuid, 'f3020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'MR-202', 'Phòng họp Team', 8, 'b3-f2-room-202', 'active'),
  ('c3020003-0000-0000-0000-000000000002'::uuid, 'f3020000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'SU-201', 'Scale-up Office Suite', 16, 'b3-f2-office-201', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;

-- Branch 3 - Floor 3: Directors Penthouse (Layout I)
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, map_version, is_published, layout_json)
VALUES (
  'f3030000-0000-0000-0000-000000000003'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid,
  3,
  'Tầng 3 - Directors Penthouse Suites',
  '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f8fafc" stroke="#64748b" strokeWidth="4"/><text x="30" y="40" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Tầng 3: Directors Penthouse</text><g id="b3-f3-office-301"><rect x="60" y="90" width="320" height="450" rx="16" fill="#e2e8f0" stroke="#475569" strokeWidth="3"/><text x="120" y="310" font-size="18" font-weight="bold" fill="#1e293b">Penthouse Suite East (10 chỗ)</text></g><g id="b3-f3-office-302"><rect x="420" y="90" width="320" height="450" rx="16" fill="#e2e8f0" stroke="#475569" strokeWidth="3"/><text x="480" y="310" font-size="18" font-weight="bold" fill="#1e293b">Penthouse Suite West (10 chỗ)</text></g></svg>',
  1,
  true,
  '{
    "version": 1,
    "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
    "elements": [
      { "id": "el-b3f3-pe301", "type": "private_office", "x": 80, "y": 100, "width": 400, "height": 520, "rotation": 0, "label": "PE-301", "sublabel": "Penthouse Suite East", "seatCount": 10, "fillColor": "rgba(71,85,105,0.15)", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
      { "id": "el-b3f3-pw302", "type": "private_office", "x": 520, "y": 100, "width": 400, "height": 520, "rotation": 0, "label": "PW-302", "sublabel": "Penthouse Suite West", "seatCount": 10, "fillColor": "rgba(71,85,105,0.15)", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3030002-0000-0000-0000-000000000003", "locked": false, "visible": true }
    ]
  }'::jsonb
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET name = EXCLUDED.name, svg_url = EXCLUDED.svg_url, layout_json = EXCLUDED.layout_json;

-- Workspaces for Branch 3 - Floor 3
INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status) VALUES
  ('c3030001-0000-0000-0000-000000000001'::uuid, 'f3030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'PE-301', 'Penthouse Suite East', 10, 'b3-f3-office-301', 'active'),
  ('c3030002-0000-0000-0000-000000000003'::uuid, 'f3030000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'PW-302', 'Penthouse Suite West', 10, 'b3-f3-office-302', 'active')
ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity;


-- =============================================================================
-- PRICE POLICIES SEED (For All 3 Branches and All Workspace Types)
-- =============================================================================

-- Branch 1 Price Policies
INSERT INTO price_policies (branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour', 30000.00, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day', 200000.00, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour', 150000.00, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day', 1000000.00, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month', 8000000.00, true)
ON CONFLICT DO NOTHING;

-- Branch 2 Price Policies
INSERT INTO price_policies (branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour', 25000.00, true),
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day', 180000.00, true),
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour', 120000.00, true),
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day', 850000.00, true),
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month', 7500000.00, true)
ON CONFLICT DO NOTHING;

-- Branch 3 Price Policies
INSERT INTO price_policies (branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour', 35000.00, true),
  ('b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day', 220000.00, true),
  ('b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour', 180000.00, true),
  ('b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day', 1200000.00, true),
  ('b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month', 9000000.00, true)
ON CONFLICT DO NOTHING;

COMMIT;
