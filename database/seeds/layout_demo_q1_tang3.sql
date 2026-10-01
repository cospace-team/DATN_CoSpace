-- =============================================================================
-- Sơ đồ demo: CoSpace Nguyễn Huệ (Q1) — Tầng 3 - Executive Private Offices
-- Floor ID: f1030000-0000-0000-0000-000000000003
--
-- Mặt bằng: 3 văn phòng riêng dọc mặt kính phía Bắc/Nam, hành lang giữa, lõi
-- thang (cầu thang bộ + 2 thang máy + WC) phía Đông, pantry phía Tây, sảnh lễ tân.
-- Chỉ PO-301 / PO-302 / PO-303 là chỗ đặt (đã gán workspaceId); mọi phần tử
-- khác là kết cấu / tiện ích nên lưu lại trong trình chỉnh sửa sẽ không tự tạo
-- thêm chỗ đặt.
--
-- Chạy được nhiều lần (chỉ ghi đè layout_json của đúng tầng này).
-- Supabase: SQL Editor -> dán toàn bộ file -> Run.
-- =============================================================================

BEGIN;

UPDATE floors
SET layout_json = '{
  "version": 1,
  "canvas": { "width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc" },
  "elements": [
    { "id": "el-b1f3-corridor", "type": "label", "x": 52, "y": 338, "width": 1096, "height": 84, "rotation": 0, "label": "", "fillColor": "rgba(148,163,184,0.10)", "strokeColor": "transparent", "opacity": 1, "cornerRadius": 0, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-wall-n", "type": "wall", "x": 40, "y": 40, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Bắc", "fillColor": "#64748B", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-s", "type": "wall", "x": 40, "y": 760, "width": 1120, "height": 12, "rotation": 0, "label": "Tường Nam", "fillColor": "#64748B", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-w", "type": "wall", "x": 40, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Tây", "fillColor": "#64748B", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-wall-e", "type": "wall", "x": 1148, "y": 40, "width": 12, "height": 732, "rotation": 0, "label": "Tường Đông", "fillColor": "#64748B", "strokeColor": "#475569", "opacity": 1, "cornerRadius": 2, "workspaceId": null, "locked": true, "visible": true },
    { "id": "el-b1f3-win-n1", "type": "window", "x": 80, "y": 40, "width": 240, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-n2", "type": "window", "x": 400, "y": 40, "width": 300, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-n3", "type": "window", "x": 770, "y": 40, "width": 160, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-s1", "type": "window", "x": 80, "y": 760, "width": 190, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-s2", "type": "window", "x": 340, "y": 760, "width": 390, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-s3", "type": "window", "x": 800, "y": 760, "width": 130, "height": 12, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-w1", "type": "window", "x": 40, "y": 90, "width": 12, "height": 200, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-win-w2", "type": "window", "x": 40, "y": 470, "width": 12, "height": 250, "rotation": 0, "label": "Cửa kính", "fillColor": "#E0F2FE", "strokeColor": "#38BDF8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-301-302", "type": "wall", "x": 352, "y": 52, "width": 8, "height": 278, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-302-lng", "type": "wall", "x": 732, "y": 52, "width": 8, "height": 278, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-core-n", "type": "wall", "x": 960, "y": 52, "width": 8, "height": 286, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cn1", "type": "wall", "x": 52, "y": 330, "width": 218, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cn2", "type": "wall", "x": 326, "y": 330, "width": 324, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cn3", "type": "wall", "x": 706, "y": 330, "width": 94, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cn4", "type": "wall", "x": 900, "y": 330, "width": 60, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cs1", "type": "wall", "x": 52, "y": 422, "width": 58, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cs2", "type": "wall", "x": 250, "y": 422, "width": 150, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cs3", "type": "wall", "x": 464, "y": 422, "width": 336, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-cs4", "type": "wall", "x": 940, "y": 422, "width": 20, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-pan-303", "type": "wall", "x": 300, "y": 430, "width": 8, "height": 330, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-303-lob", "type": "wall", "x": 760, "y": 430, "width": 8, "height": 330, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-core-s", "type": "wall", "x": 960, "y": 422, "width": 8, "height": 338, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-core-m1", "type": "wall", "x": 968, "y": 422, "width": 32, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-p-core-m2", "type": "wall", "x": 1056, "y": 422, "width": 92, "height": 8, "rotation": 0, "label": "Vách ngăn", "fillColor": "#CBD5E1", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-door-301", "type": "door", "x": 270, "y": 330, "width": 56, "height": 8, "rotation": 0, "label": "Cửa PO-301", "fillColor": "#FEF3C7", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-door-302", "type": "door", "x": 650, "y": 330, "width": 56, "height": 8, "rotation": 0, "label": "Cửa PO-302", "fillColor": "#FEF3C7", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-door-303", "type": "door", "x": 400, "y": 422, "width": 64, "height": 8, "rotation": 0, "label": "Cửa Director Suite", "fillColor": "#FEF3C7", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-door-wc", "type": "door", "x": 1000, "y": 422, "width": 56, "height": 8, "rotation": 0, "label": "Cửa khu vệ sinh", "fillColor": "#FEF3C7", "strokeColor": "#D97706", "opacity": 1, "cornerRadius": 1, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-stair", "type": "staircase", "x": 984, "y": 68, "width": 148, "height": 150, "rotation": 0, "label": "Cầu thang bộ", "fillColor": "rgba(148,163,184,0.10)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-elev-a", "type": "elevator", "x": 984, "y": 236, "width": 68, "height": 84, "rotation": 0, "label": "Thang máy A", "fillColor": "rgba(100,116,139,0.12)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-elev-b", "type": "elevator", "x": 1064, "y": 236, "width": 68, "height": 84, "rotation": 0, "label": "Thang máy B", "fillColor": "rgba(100,116,139,0.12)", "strokeColor": "#64748B", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-lift-lobby", "type": "label", "x": 980, "y": 362, "width": 156, "height": 30, "rotation": 0, "label": "Sảnh thang máy", "fillColor": "transparent", "strokeColor": "transparent", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-wc-f", "type": "restroom", "x": 984, "y": 450, "width": 148, "height": 92, "rotation": 0, "label": "WC Nữ", "fillColor": "rgba(148,163,184,0.12)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-wc-m", "type": "restroom", "x": 984, "y": 560, "width": 148, "height": 92, "rotation": 0, "label": "WC Nam", "fillColor": "rgba(148,163,184,0.12)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-tech", "type": "label", "x": 984, "y": 670, "width": 148, "height": 74, "rotation": 0, "label": "Phòng kỹ thuật", "fillColor": "rgba(148,163,184,0.10)", "strokeColor": "#CBD5E1", "opacity": 1, "cornerRadius": 6, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-lounge", "type": "lounge", "x": 760, "y": 72, "width": 180, "height": 110, "rotation": 0, "label": "Executive Lounge", "fillColor": "rgba(139,92,246,0.08)", "strokeColor": "#8B5CF6", "opacity": 1, "cornerRadius": 10, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-pantry", "type": "kitchen", "x": 68, "y": 448, "width": 216, "height": 92, "rotation": 0, "label": "Pantry & Coffee Bar", "fillColor": "rgba(245,158,11,0.10)", "strokeColor": "#F59E0B", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-dining", "type": "label", "x": 96, "y": 580, "width": 160, "height": 64, "rotation": 0, "label": "Bàn ăn chung", "fillColor": "rgba(148,163,184,0.14)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-tea-table", "type": "label", "x": 790, "y": 206, "width": 120, "height": 50, "rotation": 0, "label": "Bàn trà", "fillColor": "rgba(148,163,184,0.14)", "strokeColor": "#94A3B8", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-reception", "type": "reception", "x": 784, "y": 452, "width": 160, "height": 88, "rotation": 0, "label": "Lễ tân tầng 3", "fillColor": "rgba(20,184,166,0.10)", "strokeColor": "#14B8A6", "opacity": 1, "cornerRadius": 8, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-waiting", "type": "lounge", "x": 784, "y": 580, "width": 160, "height": 88, "rotation": 0, "label": "Sofa chờ", "fillColor": "rgba(139,92,246,0.08)", "strokeColor": "#8B5CF6", "opacity": 1, "cornerRadius": 10, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-corridor-label", "type": "label", "x": 380, "y": 364, "width": 200, "height": 30, "rotation": 0, "label": "Hành lang", "fillColor": "transparent", "strokeColor": "transparent", "opacity": 1, "cornerRadius": 4, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-1", "type": "plant", "x": 764, "y": 280, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-2", "type": "plant", "x": 912, "y": 280, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-3", "type": "plant", "x": 70, "y": 690, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-4", "type": "plant", "x": 254, "y": 690, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-5", "type": "plant", "x": 786, "y": 700, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-6", "type": "plant", "x": 914, "y": 700, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-plant-7", "type": "plant", "x": 64, "y": 366, "width": 28, "height": 28, "rotation": 0, "label": "", "fillColor": "rgba(34,197,94,0.18)", "strokeColor": "#22C55E", "opacity": 1, "cornerRadius": 14, "workspaceId": null, "locked": false, "visible": true },
    { "id": "el-b1f3-po301", "type": "private_office", "x": 68, "y": 68, "width": 268, "height": 246, "rotation": 0, "label": "PO-301", "fillColor": "rgba(59,130,246,0.08)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030001-0000-0000-0000-000000000001", "locked": false, "visible": true, "sublabel": "Văn phòng riêng · 4 chỗ", "seatCount": 4 },
    { "id": "el-b1f3-po302", "type": "private_office", "x": 376, "y": 68, "width": 340, "height": 246, "rotation": 0, "label": "PO-302", "fillColor": "rgba(59,130,246,0.08)", "strokeColor": "#3B82F6", "opacity": 1, "cornerRadius": 8, "workspaceId": "c1030002-0000-0000-0000-000000000002", "locked": false, "visible": true, "sublabel": "Văn phòng riêng · 6 chỗ", "seatCount": 6 },
    { "id": "el-b1f3-po303", "type": "private_office", "x": 324, "y": 446, "width": 420, "height": 298, "rotation": 0, "label": "PO-303", "fillColor": "rgba(99,102,241,0.10)", "strokeColor": "#6366F1", "opacity": 1, "cornerRadius": 10, "workspaceId": "c1030003-0000-0000-0000-000000000003", "locked": false, "visible": true, "sublabel": "Director Suite · 12 chỗ", "seatCount": 12 }
  ]
}'::jsonb,
    updated_at = now()
WHERE id = 'f1030000-0000-0000-0000-000000000003'::uuid;

COMMIT;

-- Kiểm tra: phải ra 57 phần tử, trong đó 3 phần tử đã gán chỗ đặt.
SELECT name,
       jsonb_array_length(layout_json->'elements') AS so_phan_tu,
       (SELECT count(*) FROM jsonb_array_elements(layout_json->'elements') e WHERE e->>'workspaceId' IS NOT NULL) AS da_gan_cho_dat
FROM floors
WHERE id = 'f1030000-0000-0000-0000-000000000003'::uuid;
