-- =============================================================================
-- CoSpace Seed Script: Update layout_json for all Floors (3 Branches, 9 Floors)
-- Architectural Grade: Includes Perimeter Walls, Doors, Restrooms, Pantry, 
--                      Elevators, Stairs, Lounges, Phone Booths, Greenery
-- Compatible with FE FloorPlanViewer and FloorPlanEditor (elementCatalog.ts)
-- Target: PostgreSQL 13+ / Supabase PostgreSQL
-- =============================================================================

BEGIN;

-- =============================================================================
-- BRANCH 1: CoSpace Nguyễn Huệ (Quận 1, TP.HCM)
-- ID: b1000000-0000-0000-0000-000000000001
-- =============================================================================

-- Floor 1: Open Hotdesking & Café Lounge (Layout A)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
  "elements": [
    { "id": "el-b1f1-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường ngoài Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f1-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường ngoài Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f1-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường ngoài Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f1-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường ngoài Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f1-rec", "type": "reception", "x": 80, "y": 80, "width": 160, "height": 50, "rotation": 0, "label": "Lễ Tân CoSpace", "sublabel": "Check-in Desk", "fillColor": "rgba(168,85,247,0.12)", "strokeColor": "#A855F7", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy E1", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Pantry & Coffee Bar", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-lounge", "type": "lounge", "x": 280, "y": 70, "width": 200, "height": 70, "rotation": 0, "label": "Khu Vực Chờ / Lounge", "fillColor": "rgba(251,146,60,0.12)", "strokeColor": "#FB923C", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-plant1", "type": "plant", "x": 250, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-plant2", "type": "plant", "x": 1000, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-hd101", "type": "desk", "x": 100, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-101", "sublabel": "Bàn Hotdesk 101", "seatCount": 1, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b1f1-hd102", "type": "desk", "x": 260, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-102", "sublabel": "Bàn Hotdesk 102", "seatCount": 1, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b1f1-hd103", "type": "desk", "x": 420, "y": 200, "width": 120, "height": 80, "rotation": 0, "label": "HD-103", "sublabel": "Bàn Hotdesk 103", "seatCount": 1, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010003-0000-0000-0000-000000000003", "locked": false, "visible": true },
    { "id": "el-b1f1-hd104", "type": "desk", "x": 100, "y": 340, "width": 120, "height": 80, "rotation": 0, "label": "HD-104", "sublabel": "Bàn Hotdesk 104", "seatCount": 1, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010004-0000-0000-0000-000000000004", "locked": false, "visible": true },
    { "id": "el-b1f1-hd105", "type": "desk", "x": 260, "y": 340, "width": 120, "height": 80, "rotation": 0, "label": "HD-105", "sublabel": "Bàn Hotdesk 105", "seatCount": 1, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 4, "workspaceId": "c1010005-0000-0000-0000-000000000005", "locked": false, "visible": true },
    { "id": "el-b1f1-mr101", "type": "meeting_room", "x": 620, "y": 200, "width": 340, "height": 260, "rotation": 0, "label": "MR-101", "sublabel": "Phòng họp Lounge", "seatCount": 8, "fillColor": "rgba(59,130,246,0.12)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1010006-0000-0000-0000-000000000006", "locked": false, "visible": true },
    { "id": "el-b1f1-print", "type": "reception", "x": 420, "y": 340, "width": 120, "height": 55, "rotation": 0, "label": "Print Station", "sublabel": "Khu In Ấn & Scan", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f1-phone1", "type": "phone_booth", "x": 420, "y": 420, "width": 60, "height": 60, "rotation": 0, "label": "Phone Booth", "sublabel": "Acoustic Pod", "fillColor": "rgba(234,88,12,0.12)", "strokeColor": "#EA580C", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f1010000-0000-0000-0000-000000000001'::uuid;

-- Floor 2: Meeting Suites & Dedicated Workstations (Layout B)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
  "elements": [
    { "id": "el-b1f2-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f2-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f2-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f2-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f2-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy E2", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-lounge", "type": "lounge", "x": 80, "y": 80, "width": 260, "height": 100, "rotation": 0, "label": "Lounge Chờ Họp VIP", "sublabel": "Executive Lounge", "fillColor": "rgba(251,146,60,0.12)", "strokeColor": "#FB923C", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-booth1", "type": "phone_booth", "x": 380, "y": 80, "width": 60, "height": 60, "rotation": 0, "label": "Phone Booth", "sublabel": "Acoustic Pod", "fillColor": "rgba(234,88,12,0.12)", "strokeColor": "#EA580C", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-print", "type": "reception", "x": 460, "y": 80, "width": 80, "height": 60, "rotation": 0, "label": "Print Pod", "sublabel": "Trạm In Ấn", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Coffee & Tea Bar", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-plant1", "type": "plant", "x": 560, "y": 90, "width": 30, "height": 30, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 15, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f2-mr201", "type": "meeting_room", "x": 80, "y": 240, "width": 340, "height": 240, "rotation": 0, "label": "MR-201", "sublabel": "Phòng họp Meeting-A", "seatCount": 6, "fillColor": "rgba(249,115,22,0.12)", "strokeColor": "#F97316", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b1f2-mr202", "type": "meeting_room", "x": 480, "y": 240, "width": 460, "height": 240, "rotation": 0, "label": "MR-202", "sublabel": "Phòng họp Boardroom-B", "seatCount": 10, "fillColor": "rgba(249,115,22,0.12)", "strokeColor": "#F97316", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b1f2-dd201", "type": "desk", "x": 300, "y": 560, "width": 220, "height": 150, "rotation": 0, "label": "DD-201", "sublabel": "Cụm bàn Dedicated 201", "seatCount": 2, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 6, "workspaceId": "c1020003-0000-0000-0000-000000000003", "locked": false, "visible": true },
    { "id": "el-b1f2-dd202", "type": "desk", "x": 580, "y": 560, "width": 220, "height": 150, "rotation": 0, "label": "DD-202", "sublabel": "Cụm bàn Dedicated 202", "seatCount": 2, "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 6, "workspaceId": "c1020004-0000-0000-0000-000000000004", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f1020000-0000-0000-0000-000000000002'::uuid;

-- Floor 3: Executive Private Offices (Layout C)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
  "elements": [
    { "id": "el-b1f3-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy E3", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-lounge", "type": "lounge", "x": 80, "y": 80, "width": 240, "height": 90, "rotation": 0, "label": "Executive Lounge & Bar", "fillColor": "rgba(99,102,241,0.12)", "strokeColor": "#6366F1", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 160, "height": 100, "rotation": 0, "label": "Executive Pantry", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Executive Restroom", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant1", "type": "plant", "x": 350, "y": 90, "width": 30, "height": 30, "rotation": 0, "label": "Cây cảnh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 15, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-po301", "type": "private_office", "x": 80, "y": 220, "width": 380, "height": 250, "rotation": 0, "label": "PO-301", "sublabel": "Văn phòng riêng PO-301", "seatCount": 4, "fillColor": "rgba(37,99,235,0.12)", "strokeColor": "#2563EB", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b1f3-po302", "type": "private_office", "x": 520, "y": 220, "width": 420, "height": 250, "rotation": 0, "label": "PO-302", "sublabel": "Văn phòng riêng PO-302", "seatCount": 6, "fillColor": "rgba(37,99,235,0.12)", "strokeColor": "#2563EB", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b1f3-po303", "type": "private_office", "x": 280, "y": 500, "width": 660, "height": 240, "rotation": 0, "label": "PO-303", "sublabel": "Director Penthouse Suite PO-303", "seatCount": 12, "fillColor": "rgba(79,70,229,0.15)", "strokeColor": "#4F46E5", "opacity": 1, "cornerRadius": 10, "workspaceId": "c1030003-0000-0000-0000-000000000003", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f1030000-0000-0000-0000-000000000003'::uuid;


-- =============================================================================
-- BRANCH 2: CoSpace Nam Kỳ Khởi Nghĩa (Quận 3, TP.HCM)
-- ID: b2000000-0000-0000-0000-000000000002
-- =============================================================================

-- Floor 1: Creative Pods & Flex Workspace (Layout D)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fdf4ff" },
  "elements": [
    { "id": "el-b2f1-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f1-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f1-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f1-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f1-rec", "type": "reception", "x": 80, "y": 80, "width": 160, "height": 50, "rotation": 0, "label": "Lễ Tân Q3", "sublabel": "Creative Welcome Desk", "fillColor": "rgba(217,70,239,0.12)", "strokeColor": "#D946EF", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy Q3", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-lounge", "type": "lounge", "x": 280, "y": 70, "width": 240, "height": 80, "rotation": 0, "label": "Chill & Brainstorm Lounge", "fillColor": "rgba(236,72,153,0.12)", "strokeColor": "#EC4899", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Juice & Coffee Bar", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-plant1", "type": "plant", "x": 250, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-plant2", "type": "plant", "x": 1000, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-phone", "type": "phone_booth", "x": 560, "y": 80, "width": 60, "height": 60, "rotation": 0, "label": "Phone Booth", "fillColor": "rgba(234,88,12,0.12)", "strokeColor": "#EA580C", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f1-fl101", "type": "desk", "x": 120, "y": 220, "width": 220, "height": 140, "rotation": 0, "label": "FL-101", "sublabel": "Creative Pod 101", "seatCount": 2, "fillColor": "rgba(192,132,252,0.18)", "strokeColor": "#C084FC", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b2f1-fl102", "type": "desk", "x": 420, "y": 220, "width": 220, "height": 140, "rotation": 0, "label": "FL-102", "sublabel": "Creative Pod 102", "seatCount": 2, "fillColor": "rgba(192,132,252,0.18)", "strokeColor": "#C084FC", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b2f1-mr102", "type": "meeting_room", "x": 120, "y": 420, "width": 540, "height": 260, "rotation": 0, "label": "MR-102", "sublabel": "Phòng họp Sáng Tạo", "seatCount": 12, "fillColor": "rgba(236,72,153,0.12)", "strokeColor": "#EC4899", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2010003-0000-0000-0000-000000000003", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f2010000-0000-0000-0000-000000000001'::uuid;

-- Floor 2: Team Studios & Brainstorm Hub (Layout E)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f0fdf4" },
  "elements": [
    { "id": "el-b2f2-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f2-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f2-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f2-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f2-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy Q3", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-lounge", "type": "lounge", "x": 80, "y": 80, "width": 260, "height": 90, "rotation": 0, "label": "Idea Incubation Hub", "fillColor": "rgba(34,197,94,0.12)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Coffee & Snack Corner", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-plant1", "type": "plant", "x": 370, "y": 90, "width": 28, "height": 28, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f2-bs201", "type": "meeting_room", "x": 80, "y": 220, "width": 320, "height": 240, "rotation": 0, "label": "BS-201", "sublabel": "Brainstorm Room 1", "seatCount": 6, "fillColor": "rgba(22,163,74,0.12)", "strokeColor": "#16A34A", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b2f2-bs202", "type": "meeting_room", "x": 440, "y": 220, "width": 320, "height": 240, "rotation": 0, "label": "BS-202", "sublabel": "Brainstorm Room 2", "seatCount": 6, "fillColor": "rgba(22,163,74,0.12)", "strokeColor": "#16A34A", "opacity": 1, "cornerRadius": 8, "workspaceId": "c2020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b2f2-ts201", "type": "private_office", "x": 800, "y": 220, "width": 260, "height": 380, "rotation": 0, "label": "TS-201", "sublabel": "Team Studio TS-201", "seatCount": 8, "fillColor": "rgba(67,56,202,0.15)", "strokeColor": "#4338CA", "opacity": 1, "cornerRadius": 10, "workspaceId": "c2020003-0000-0000-0000-000000000003", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f2020000-0000-0000-0000-000000000002'::uuid;

-- Floor 3: Enterprise Suites (Layout F)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#fffbeb" },
  "elements": [
    { "id": "el-b2f3-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f3-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f3-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f3-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b2f3-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy Q3", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-lounge", "type": "lounge", "x": 80, "y": 80, "width": 260, "height": 100, "rotation": 0, "label": "Enterprise VIP Lounge", "fillColor": "rgba(245,158,11,0.12)", "strokeColor": "#F59E0B", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Executive Bar & Pantry", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-plant1", "type": "plant", "x": 370, "y": 90, "width": 30, "height": 30, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 15, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b2f3-es301", "type": "private_office", "x": 80, "y": 220, "width": 440, "height": 380, "rotation": 0, "label": "ES-301", "sublabel": "Enterprise Suite A", "seatCount": 15, "fillColor": "rgba(217,119,6,0.15)", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b2f3-es302", "type": "private_office", "x": 560, "y": 220, "width": 440, "height": 380, "rotation": 0, "label": "ES-302", "sublabel": "Enterprise Suite B", "seatCount": 15, "fillColor": "rgba(217,119,6,0.15)", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 12, "workspaceId": "c2030002-0000-0000-0000-000000000002", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f2030000-0000-0000-0000-000000000003'::uuid;


-- =============================================================================
-- BRANCH 3: CoSpace Cầu Giấy (Quận Cầu Giấy, Hà Nội)
-- ID: b3000000-0000-0000-0000-000000000003
-- =============================================================================

-- Floor 1: Tech Community & Event Space (Layout G)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#ecfeff" },
  "elements": [
    { "id": "el-b3f1-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f1-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f1-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f1-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f1-rec", "type": "reception", "x": 80, "y": 80, "width": 160, "height": 50, "rotation": 0, "label": "Lễ Tân CG", "sublabel": "Tech Hub Welcome", "fillColor": "rgba(6,182,212,0.12)", "strokeColor": "#06B6D4", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy CG", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-lounge", "type": "lounge", "x": 280, "y": 70, "width": 240, "height": 80, "rotation": 0, "label": "Tech Demo & Stage Area", "fillColor": "rgba(8,145,178,0.12)", "strokeColor": "#0891B2", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Coffee & Snack Hub", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-plant1", "type": "plant", "x": 250, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-plant2", "type": "plant", "x": 1000, "y": 80, "width": 26, "height": 26, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 13, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f1-ta101", "type": "desk", "x": 80, "y": 200, "width": 380, "height": 160, "rotation": 0, "label": "TA-101", "sublabel": "Dãy bàn Tech-A", "seatCount": 6, "fillColor": "rgba(8,145,178,0.12)", "strokeColor": "#0891B2", "opacity": 1, "cornerRadius": 6, "workspaceId": "c3010001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b3f1-tb102", "type": "desk", "x": 80, "y": 400, "width": 380, "height": 160, "rotation": 0, "label": "TB-102", "sublabel": "Dãy bàn Tech-B", "seatCount": 6, "fillColor": "rgba(8,145,178,0.12)", "strokeColor": "#0891B2", "opacity": 1, "cornerRadius": 6, "workspaceId": "c3010002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b3f1-ev101", "type": "meeting_room", "x": 520, "y": 200, "width": 480, "height": 360, "rotation": 0, "label": "EV-101", "sublabel": "Hội trường Event Room", "seatCount": 30, "fillColor": "rgba(14,165,233,0.15)", "strokeColor": "#0EA5E9", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3010003-0000-0000-0000-000000000003", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f3010000-0000-0000-0000-000000000001'::uuid;

-- Floor 2: Scale-up Workstations & Boardrooms (Layout H)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#eff6ff" },
  "elements": [
    { "id": "el-b3f2-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f2-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f2-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f2-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f2-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy CG", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-lounge", "type": "lounge", "x": 80, "y": 80, "width": 260, "height": 90, "rotation": 0, "label": "Scale-up Member Lounge", "fillColor": "rgba(59,130,246,0.12)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-booth1", "type": "phone_booth", "x": 380, "y": 80, "width": 60, "height": 60, "rotation": 0, "label": "Phone Booth", "sublabel": "Acoustic Pod", "fillColor": "rgba(234,88,12,0.12)", "strokeColor": "#EA580C", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-print", "type": "reception", "x": 460, "y": 80, "width": 80, "height": 60, "rotation": 0, "label": "Print Station", "sublabel": "Máy In & Scan", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Coffee & Snack Hub", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-plant1", "type": "plant", "x": 560, "y": 90, "width": 30, "height": 30, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 15, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f2-br201", "type": "meeting_room", "x": 80, "y": 220, "width": 360, "height": 260, "rotation": 0, "label": "BR-201", "sublabel": "Boardroom VIP", "seatCount": 10, "fillColor": "rgba(139,92,246,0.15)", "strokeColor": "#8B5CF6", "opacity": 1, "cornerRadius": 10, "workspaceId": "c3020001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b3f2-mr202", "type": "meeting_room", "x": 480, "y": 220, "width": 280, "height": 260, "rotation": 0, "label": "MR-202", "sublabel": "Phòng họp Team", "seatCount": 8, "fillColor": "rgba(59,130,246,0.12)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": "c3020002-0000-0000-0000-000000000002", "locked": false, "visible": true },
    { "id": "el-b3f2-su201", "type": "private_office", "x": 800, "y": 220, "width": 260, "height": 380, "rotation": 0, "label": "SU-201", "sublabel": "Scale-up Office Suite", "seatCount": 16, "fillColor": "rgba(2,132,199,0.15)", "strokeColor": "#0284C7", "opacity": 1, "cornerRadius": 10, "workspaceId": "c3020003-0000-0000-0000-000000000002", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f3020000-0000-0000-0000-000000000002'::uuid;

-- Floor 3: Directors Penthouse Suites (Layout I)
UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#faf5ff" },
  "elements": [
    { "id": "el-b3f3-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f3-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f3-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f3-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#94A3B8", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b3f3-elev", "type": "elevator", "x": 1050, "y": 80, "width": 70, "height": 70, "rotation": 0, "label": "Thang Máy CG", "fillColor": "rgba(100,116,139,0.15)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-stair", "type": "staircase", "x": 1050, "y": 170, "width": 70, "height": 100, "rotation": 0, "label": "Cầu Thang Bộ", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-lounge", "type": "lounge", "x": 80, "y": 80, "width": 260, "height": 100, "rotation": 0, "label": "Skyline Executive Lounge", "fillColor": "rgba(168,85,247,0.12)", "strokeColor": "#A855F7", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-pantry", "type": "kitchen", "x": 80, "y": 640, "width": 180, "height": 100, "rotation": 0, "label": "Penthouse Mini Bar", "fillColor": "rgba(251,191,36,0.15)", "strokeColor": "#FBBF24", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-wc", "type": "restroom", "x": 980, "y": 640, "width": 140, "height": 100, "rotation": 0, "label": "Restroom WC", "fillColor": "rgba(148,163,184,0.15)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-plant1", "type": "plant", "x": 370, "y": 90, "width": 30, "height": 30, "rotation": 0, "label": "Cây xanh", "fillColor": "rgba(34,197,94,0.25)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 15, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b3f3-pe301", "type": "private_office", "x": 80, "y": 220, "width": 440, "height": 380, "rotation": 0, "label": "PE-301", "sublabel": "Penthouse Suite East", "seatCount": 10, "fillColor": "rgba(147,51,234,0.15)", "strokeColor": "#9333EA", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3030001-0000-0000-0000-000000000001", "locked": false, "visible": true },
    { "id": "el-b3f3-pw302", "type": "private_office", "x": 560, "y": 220, "width": 440, "height": 380, "rotation": 0, "label": "PW-302", "sublabel": "Penthouse Suite West", "seatCount": 10, "fillColor": "rgba(147,51,234,0.15)", "strokeColor": "#9333EA", "opacity": 1, "cornerRadius": 12, "workspaceId": "c3030002-0000-0000-0000-000000000003", "locked": false, "visible": true }
  ]
}'::jsonb
WHERE id = 'f3030000-0000-0000-0000-000000000003'::uuid;

COMMIT;
