#!/usr/bin/env python3
"""
Sinh sơ đồ tầng (floors.layout_json) cho 9 tầng của 3 chi nhánh demo và ghi ra
database/seed_floor_layouts_json.sql.

    python3 database/tools/floor_layouts.py           # ghi lại file SQL
    python3 database/tools/floor_layouts.py --check   # chỉ chạy các kiểm tra

Mỗi chi nhánh là một tòa nhà: ba tầng dùng chung vỏ, mặt kính và lõi thang (cầu thang
bộ, 2 thang máy, WC) ở cùng một chỗ — phía Đông (Nguyễn Huệ), phía Tây (Nam Kỳ Khởi
Nghĩa), giữa phía Bắc (Cầu Giấy). Chỉ các chỗ đặt thật (bảng workspaces) dùng loại phần
tử có thể gán chỗ; mọi thứ khác là kết cấu / tiện ích, nên bấm lưu trong trình chỉnh sửa
không tự sinh thêm chỗ đặt.

Lưu ý khi chỉnh: nhãn được vẽ ở đáy phần tử còn icon ở giữa và to theo cạnh ngắn, nên
phòng tiện ích (lounge, pantry, WC, lễ tân, thang máy) giữ cạnh ngắn ~70–100px và
không dùng sublabel.
"""
import json
import os
import sys

CANVAS = {"width": 1200, "height": 800, "gridSize": 20, "backgroundColor": "#f8fafc"}
T = 8          # interior partition thickness
EXT = 12       # exterior wall thickness

# Element types the editor turns into bookable workspaces when they are saved unlinked.
LINKABLE = {"desk", "chair", "standing_desk", "meeting_room", "private_office",
            "phone_booth", "event_space", "custom_workspace"}

# (fill, stroke, corner radius)
STYLE = {
    "ext_wall":    ("#64748B", "#475569", 2),
    "wall":        ("#CBD5E1", "#94A3B8", 1),
    "window":      ("#E0F2FE", "#38BDF8", 1),
    "glass":       ("#E0F2FE", "#7DD3FC", 1),
    "door":        ("#FEF3C7", "#D97706", 1),
    "floor":       ("rgba(148,163,184,0.10)", "transparent", 0),
    "zone_green":  ("rgba(34,197,94,0.06)", "rgba(34,197,94,0.30)", 12),
    "zone_amber":  ("rgba(245,158,11,0.06)", "rgba(245,158,11,0.30)", 12),
    "zone_violet": ("rgba(139,92,246,0.06)", "rgba(139,92,246,0.30)", 12),
    "zone_teal":   ("rgba(20,184,166,0.06)", "rgba(20,184,166,0.30)", 12),
    "terrace":     ("rgba(34,197,94,0.07)", "transparent", 0),
    "text":        ("transparent", "transparent", 4),
    "desk":        ("rgba(34,197,94,0.10)", "#22C55E", 6),
    "meeting":     ("rgba(59,130,246,0.08)", "#3B82F6", 10),
    "office":      ("rgba(59,130,246,0.08)", "#3B82F6", 8),
    "suite":       ("rgba(99,102,241,0.10)", "#6366F1", 10),
    "event":       ("rgba(244,63,94,0.06)", "#F43F5E", 12),
    "lounge":      ("rgba(139,92,246,0.08)", "#8B5CF6", 10),
    "kitchen":     ("rgba(245,158,11,0.10)", "#F59E0B", 8),
    "reception":   ("rgba(20,184,166,0.10)", "#14B8A6", 8),
    "restroom":    ("rgba(148,163,184,0.12)", "#94A3B8", 6),
    "elevator":    ("rgba(100,116,139,0.12)", "#64748B", 6),
    "staircase":   ("rgba(148,163,184,0.10)", "#94A3B8", 6),
    "plant":       ("rgba(34,197,94,0.18)", "#22C55E", 14),
    "furniture":   ("rgba(148,163,184,0.14)", "#94A3B8", 8),
    "utility":     ("rgba(148,163,184,0.10)", "#CBD5E1", 6),
}

# Draw order: floor finishes under everything, bookable workspaces on top.
LAYER = {"tint": 0, "ext": 1, "facade": 2, "wall": 3, "door": 4, "fixture": 5, "plant": 6, "text": 7, "workspace": 8}

# Workspaces of the demo data (database/seed_3_branches_9_floors.sql): code -> (id, seats).
WS = {
    "HD-101": ("c1010001-0000-0000-0000-000000000001", 1),
    "HD-102": ("c1010002-0000-0000-0000-000000000002", 1),
    "HD-103": ("c1010003-0000-0000-0000-000000000003", 1),
    "HD-104": ("c1010004-0000-0000-0000-000000000004", 1),
    "HD-105": ("c1010005-0000-0000-0000-000000000005", 1),
    "MR-101": ("c1010006-0000-0000-0000-000000000006", 8),
    "MR-201": ("c1020001-0000-0000-0000-000000000001", 6),
    "MR-202": ("c1020002-0000-0000-0000-000000000002", 10),
    "DD-201": ("c1020003-0000-0000-0000-000000000003", 2),
    "DD-202": ("c1020004-0000-0000-0000-000000000004", 2),
    "PO-301": ("c1030001-0000-0000-0000-000000000001", 4),
    "PO-302": ("c1030002-0000-0000-0000-000000000002", 6),
    "PO-303": ("c1030003-0000-0000-0000-000000000003", 12),
    "FL-101": ("c2010001-0000-0000-0000-000000000001", 2),
    "FL-102": ("c2010002-0000-0000-0000-000000000002", 2),
    "MR-102": ("c2010003-0000-0000-0000-000000000003", 12),
    "BS-201": ("c2020001-0000-0000-0000-000000000001", 6),
    "BS-202": ("c2020002-0000-0000-0000-000000000002", 6),
    "TS-201": ("c2020003-0000-0000-0000-000000000003", 8),
    "ES-301": ("c2030001-0000-0000-0000-000000000001", 15),
    "ES-302": ("c2030002-0000-0000-0000-000000000002", 15),
    "TA-101": ("c3010001-0000-0000-0000-000000000001", 6),
    "TB-102": ("c3010002-0000-0000-0000-000000000002", 6),
    "EV-101": ("c3010003-0000-0000-0000-000000000003", 30),
    "BR-201": ("c3020001-0000-0000-0000-000000000001", 10),
    "MR-202@b3": ("c3020002-0000-0000-0000-000000000002", 8),   # second "MR-202", Cầu Giấy floor 2
    "SU-201": ("c3020003-0000-0000-0000-000000000002", 16),
    "PE-301": ("c3030001-0000-0000-0000-000000000001", 10),
    "PW-302": ("c3030002-0000-0000-0000-000000000003", 10),
}


class Floor:
    def __init__(self, prefix, floor_id, title):
        self.prefix, self.floor_id, self.title = prefix, floor_id, title
        self.items = []          # (layer, seq, element)
        self.auto = {}

    # ── primitives ──
    def _id(self, eid, base):
        if eid:
            return self.prefix + eid
        self.auto[base] = self.auto.get(base, 0) + 1
        return f"{self.prefix}{base}-{self.auto[base]}"

    def add(self, layer, etype, x, y, w, h, label="", style=None, eid=None, **extra):
        fill, stroke, radius = STYLE[style or etype]
        el = {
            "id": self._id(eid, etype.replace("_", "-")), "type": etype,
            "x": x, "y": y, "width": w, "height": h, "rotation": 0,
            "label": label, "fillColor": fill, "strokeColor": stroke,
            "opacity": 1, "cornerRadius": radius,
            "workspaceId": None, "locked": False, "visible": True,
        }
        el.update(extra)
        self.items.append((LAYER[layer], len(self.items), el))
        return el

    # ── building shell ──
    def shell(self):
        for eid, x, y, w, h, label in [
            ("wall-n", 40, 40, 1120, EXT, "Tường Bắc"), ("wall-s", 40, 760, 1120, EXT, "Tường Nam"),
            ("wall-w", 40, 40, EXT, 732, "Tường Tây"), ("wall-e", 1148, 40, EXT, 732, "Tường Đông"),
        ]:
            self.add("ext", "wall", x, y, w, h, label, "ext_wall", eid, locked=True)

    def windows(self, side, *spans):
        """Glass on the façade, `spans` along the wall: (from, to)."""
        for a, b in spans:
            if side in "ns":
                self.add("facade", "window", a, 40 if side == "n" else 760, b - a, EXT, "Cửa kính")
            else:
                self.add("facade", "window", 40 if side == "w" else 1148, a, EXT, b - a, "Cửa kính")

    def entrance(self, side, a, b, label="Cửa chính"):
        y = 40 if side == "n" else 760
        self.add("facade", "door", a, y, b - a, EXT, label, eid="entrance")

    # ── partitions with doors / openings ──
    def hwall(self, y, x1, x2, *gaps, glass=False):
        """Partition along y from x1 to x2; gaps: (a, b) open, or (a, b, "Cửa …") with a door."""
        self._wall(True, y, x1, x2, gaps, glass)

    def vwall(self, x, y1, y2, *gaps, glass=False):
        self._wall(False, x, y1, y2, gaps, glass)

    def _wall(self, horizontal, at, start, end, gaps, glass):
        cur = start
        for gap in sorted(gaps):
            a, b = gap[0], gap[1]
            if a > cur:
                self._segment(horizontal, at, cur, a, glass)
            if len(gap) > 2:
                self._door(horizontal, at, a, b, gap[2])
            cur = b
        if end > cur:
            self._segment(horizontal, at, cur, end, glass)

    def _segment(self, horizontal, at, a, b, glass):
        etype, style, label = ("window", "glass", "Vách kính") if glass else ("wall", "wall", "Vách ngăn")
        if horizontal:
            self.add("wall", etype, a, at, b - a, T, label, style)
        else:
            self.add("wall", etype, at, a, T, b - a, label, style)

    def _door(self, horizontal, at, a, b, label):
        if horizontal:
            self.add("door", "door", a, at, b - a, T, label)
        else:
            # Doors draw their swing line across the width, so a door in a vertical wall is a
            # horizontal door turned 90° about its centre.
            length = b - a
            cx, cy = at + T // 2, (a + b) // 2
            self.add("door", "door", cx - length // 2, cy - T // 2, length, T, label, rotation=90)

    # ── contents ──
    def tint(self, x, y, w, h, style, label="", eid=None):
        self.add("tint", "label", x, y, w, h, label, style, eid)

    def text(self, x, y, w, label, eid=None):
        self.add("text", "label", x, y, w, 30, label, "text", eid)

    def fixture(self, etype, x, y, w, h, label, eid=None, style=None):
        self.add("fixture", etype, x, y, w, h, label, style, eid)

    def furniture(self, x, y, w, h, label="", radius=None):
        el = self.add("fixture", "label", x, y, w, h, label, "furniture")
        if radius is not None:
            el["cornerRadius"] = radius

    def round_tables(self, *points, d=44):
        for x, y in points:
            self.furniture(x, y, d, d, "", radius=d // 2)

    def plants(self, *points):
        for x, y in points:
            self.add("plant", "plant", x, y, 28, 28, "", "plant")

    def workspace(self, etype, code, x, y, w, h, sublabel, style):
        ws_id, seats = WS[code]
        label = code.split("@")[0]
        self.add("workspace", etype, x, y, w, h, label, style, "ws-" + label.lower(),
                 sublabel=sublabel, seatCount=seats, workspaceId=ws_id)

    # ── output ──
    def layout(self):
        els = [el for _, _, el in sorted(self.items, key=lambda t: (t[0], t[1]))]
        return {"version": 1, "canvas": dict(CANVAS), "elements": els}


# ═════════════════════════════ shared cores ═════════════════════════════

def core_east(f):
    """Nguyễn Huệ: stairs, two lifts and restrooms along the east wall; lift lobby at y 338–422."""
    f.vwall(960, 52, 338)
    f.vwall(960, 422, 760)
    f.hwall(422, 968, 1148, (1000, 1056, "Cửa khu vệ sinh"))
    f.fixture("staircase", 984, 68, 148, 150, "Cầu thang bộ", "stair")
    f.fixture("elevator", 984, 236, 68, 84, "Thang máy A", "elev-a")
    f.fixture("elevator", 1064, 236, 68, 84, "Thang máy B", "elev-b")
    f.text(980, 362, 156, "Sảnh thang máy", "lift-lobby")
    f.fixture("restroom", 984, 450, 148, 92, "WC Nữ", "wc-f")
    f.fixture("restroom", 984, 560, 148, 92, "WC Nam", "wc-m")
    f.add("fixture", "label", 984, 670, 148, 74, "Phòng kỹ thuật", "utility", "tech")


def core_west(f):
    """Nam Kỳ Khởi Nghĩa: the same core on the west wall; lift lobby at y 338–422."""
    f.vwall(232, 52, 338)
    f.vwall(232, 422, 760)
    f.hwall(422, 52, 232, (144, 200, "Cửa khu vệ sinh"))
    f.fixture("staircase", 68, 68, 148, 150, "Cầu thang bộ", "stair")
    f.fixture("elevator", 68, 236, 68, 84, "Thang máy A", "elev-a")
    f.fixture("elevator", 148, 236, 68, 84, "Thang máy B", "elev-b")
    f.text(64, 362, 156, "Sảnh thang máy", "lift-lobby")
    f.fixture("restroom", 68, 450, 148, 92, "WC Nữ", "wc-f")
    f.fixture("restroom", 68, 560, 148, 92, "WC Nam", "wc-m")
    f.add("fixture", "label", 68, 670, 148, 74, "Phòng kỹ thuật", "utility", "tech")


def core_north(f):
    """Cầu Giấy: a central core on the north wall, lifts facing a lobby that opens onto the
    corridor (y 400–470). Rooms either side run down to y 392."""
    f.vwall(472, 52, 392)
    f.vwall(720, 52, 392)
    f.hwall(300, 480, 720, (540, 660))
    f.fixture("staircase", 488, 64, 100, 150, "Cầu thang bộ", "stair")
    f.fixture("restroom", 612, 64, 100, 72, "WC Nữ", "wc-f")
    f.fixture("restroom", 612, 144, 100, 72, "WC Nam", "wc-m")
    f.fixture("elevator", 496, 222, 92, 70, "Thang máy A", "elev-a")
    f.fixture("elevator", 612, 222, 92, 70, "Thang máy B", "elev-b")
    f.text(520, 330, 160, "Sảnh thang máy", "lift-lobby")


def corridor(f, y=338, h=84):
    f.tint(52, y, 1096, h, "floor", eid="corridor")


# ═════════════════════════════ Nguyễn Huệ (Q1) ═════════════════════════════

def b1f1():
    f = Floor("el-b1f1-", "f1010000-0000-0000-0000-000000000001", "Tầng 1 - Open Hotdesking & Café Lounge")
    f.shell(); core_east(f); corridor(f)
    f.windows("n", (80, 300), (330, 570), (630, 930))
    f.windows("s", (80, 400), (440, 510), (670, 740), (790, 930))
    f.windows("w", (90, 310), (470, 730))
    f.entrance("s", 530, 650)

    # Hotdesk zone (north-west) and the glass meeting room beside it
    f.tint(60, 60, 532, 262, "zone_green", "Khu hotdesk")
    for code, x, y in [("HD-101", 96, 88), ("HD-102", 260, 88), ("HD-103", 424, 88),
                       ("HD-104", 96, 196), ("HD-105", 260, 196)]:
        f.workspace("desk", code, x, y, 120, 80, "Bàn hotdesk", "desk")
    f.furniture(424, 196, 120, 80, "Tủ locker")
    f.vwall(600, 52, 330, glass=True)
    f.hwall(330, 600, 960, (856, 912, "Cửa phòng họp"), glass=True)
    f.workspace("meeting_room", "MR-101", 624, 68, 320, 246, "Phòng họp Lounge", "meeting")

    # Café lounge (south-west), main lobby with reception, print corner (south-east)
    f.tint(60, 438, 352, 314, "zone_amber", "Café Lounge")
    f.fixture("kitchen", 76, 452, 200, 84, "Coffee bar")
    f.round_tables((88, 576), (168, 576), (88, 652), (168, 652))
    f.fixture("lounge", 252, 572, 140, 88, "Sofa")
    f.plants((372, 452))
    f.fixture("reception", 480, 466, 200, 84, "Lễ tân CoSpace")
    f.text(520, 582, 140, "Sảnh chính")
    f.fixture("lounge", 432, 628, 88, 84, "Sofa chờ")
    f.plants((496, 718), (656, 718), (712, 466))
    f.fixture("reception", 784, 462, 152, 84, "Print & Scan")
    f.furniture(784, 580, 152, 56, "Hộp thư thành viên")
    f.plants((786, 700), (908, 700))
    return f


def b1f2():
    f = Floor("el-b1f2-", "f1020000-0000-0000-0000-000000000002", "Tầng 2 - Meeting Suites & Dedicated Workstations")
    f.shell(); core_east(f); corridor(f)
    f.windows("n", (80, 350), (420, 730), (790, 930))
    f.windows("s", (80, 610), (680, 930))
    f.windows("w", (90, 300), (470, 730))

    # Meeting rooms along the north façade, coffee corner by the core
    f.vwall(380, 52, 330, glass=True)
    f.vwall(760, 52, 330, glass=True)
    f.hwall(330, 52, 960, (300, 356, "Cửa MR-201"), (680, 736, "Cửa MR-202"), (800, 900), glass=True)
    f.workspace("meeting_room", "MR-201", 68, 68, 296, 246, "Phòng họp Meeting-A", "meeting")
    f.workspace("meeting_room", "MR-202", 396, 68, 348, 246, "Phòng họp Meeting-B", "meeting")
    f.fixture("kitchen", 784, 76, 160, 90, "Coffee corner")
    f.furniture(784, 196, 160, 44, "Quầy bàn đứng")
    f.plants((790, 280), (912, 280))
    f.text(380, 364, 200, "Hành lang")

    # Dedicated desks open onto the corridor; pantry closed off
    f.hwall(422, 640, 960, (700, 756, "Cửa pantry"))
    f.vwall(640, 430, 760)
    f.tint(60, 438, 572, 314, "zone_green", "Khu bàn cố định")
    f.workspace("desk", "DD-201", 96, 466, 220, 140, "Cụm bàn Dedicated", "desk")
    f.workspace("desk", "DD-202", 356, 466, 220, 140, "Cụm bàn Dedicated", "desk")
    f.furniture(96, 636, 480, 44, "Tủ locker cá nhân")
    f.plants((72, 706), (592, 706))
    f.fixture("kitchen", 664, 452, 200, 90, "Pantry")
    f.furniture(672, 584, 184, 64, "Bàn ăn chung")
    f.plants((900, 470), (668, 706), (912, 706))
    return f


def b1f3():
    f = Floor("el-b1f3-", "f1030000-0000-0000-0000-000000000003", "Tầng 3 - Executive Private Offices")
    f.shell(); core_east(f); corridor(f)
    f.windows("n", (80, 320), (400, 700), (770, 930))
    f.windows("s", (80, 270), (340, 730), (800, 930))
    f.windows("w", (90, 290), (470, 720))

    f.vwall(352, 52, 330)
    f.vwall(732, 52, 330)
    f.hwall(330, 52, 960, (270, 326, "Cửa PO-301"), (650, 706, "Cửa PO-302"), (800, 900))
    f.hwall(422, 52, 960, (110, 250), (400, 464, "Cửa Director Suite"), (800, 940))
    f.vwall(300, 430, 760)
    f.vwall(760, 430, 760)

    f.workspace("private_office", "PO-301", 68, 68, 268, 246, "Văn phòng riêng · 4 chỗ", "office")
    f.workspace("private_office", "PO-302", 376, 68, 340, 246, "Văn phòng riêng · 6 chỗ", "office")
    f.workspace("private_office", "PO-303", 324, 446, 420, 298, "Director Suite · 12 chỗ", "suite")
    f.fixture("lounge", 760, 72, 180, 110, "Executive Lounge")
    f.furniture(790, 206, 120, 50, "Bàn trà")
    f.plants((764, 280), (912, 280), (64, 366))
    f.text(380, 364, 200, "Hành lang")
    f.fixture("kitchen", 68, 448, 216, 92, "Pantry & Coffee Bar")
    f.furniture(96, 580, 160, 64, "Bàn ăn chung")
    f.plants((70, 690), (254, 690))
    f.fixture("reception", 784, 452, 160, 88, "Lễ tân tầng 3")
    f.fixture("lounge", 784, 580, 160, 88, "Sofa chờ")
    f.plants((786, 700), (914, 700))
    return f


# ═════════════════════════════ Nam Kỳ Khởi Nghĩa (Q3) ═════════════════════════════

def b2f1():
    f = Floor("el-b2f1-", "f2010000-0000-0000-0000-000000000001", "Tầng 1 - Creative Pods & Flex Area")
    f.shell(); core_west(f); corridor(f)
    f.windows("n", (290, 670), (760, 1110))
    f.windows("s", (290, 520), (680, 1110))
    f.windows("e", (90, 310), (470, 730))
    f.entrance("s", 540, 660)

    # Glass meeting room and the flex area with creative pods
    f.vwall(700, 52, 330, glass=True)
    f.hwall(330, 240, 700, (600, 656, "Cửa MR-102"), glass=True)
    f.workspace("meeting_room", "MR-102", 256, 68, 428, 246, "Phòng họp Sáng Tạo", "meeting")
    f.tint(716, 60, 424, 262, "zone_violet", "Flex area")
    f.workspace("desk", "FL-101", 744, 84, 180, 120, "Creative Pod", "desk")
    f.workspace("desk", "FL-102", 948, 84, 180, 120, "Creative Pod", "desk")
    f.fixture("lounge", 744, 226, 120, 80, "Bean bag")
    f.plants((1100, 240))

    # Showcase corner, main lobby, café bar
    f.tint(248, 438, 172, 314, "zone_teal", "Góc trưng bày")
    for y in (462, 526, 590):
        f.furniture(264, y, 140, 36)
    f.plants((262, 652), (378, 652))
    f.fixture("reception", 500, 466, 200, 84, "Lễ tân CoSpace")
    f.text(530, 582, 140, "Sảnh chính")
    f.fixture("lounge", 436, 640, 88, 84, "Sofa chờ")
    f.plants((506, 718), (674, 718))
    f.tint(768, 438, 372, 314, "zone_amber", "Café bar")
    f.fixture("kitchen", 788, 456, 200, 84, "Quầy café")
    f.round_tables((796, 576), (876, 576), (796, 652), (876, 652))
    f.fixture("lounge", 972, 576, 140, 88, "Sofa")
    f.plants((1100, 456))
    return f


def b2f2():
    f = Floor("el-b2f2-", "f2020000-0000-0000-0000-000000000002", "Tầng 2 - Team Studios & Brainstorm Hub")
    f.shell(); core_west(f); corridor(f)
    f.windows("n", (270, 540), (590, 870), (920, 1120))
    f.windows("s", (270, 680), (740, 1120))
    f.windows("e", (90, 300), (470, 730))

    f.vwall(560, 52, 330, glass=True)
    f.vwall(888, 52, 330, glass=True)
    f.hwall(330, 240, 1148, (480, 536, "Cửa BS-201"), (808, 864, "Cửa BS-202"), (960, 1060), glass=True)
    f.workspace("meeting_room", "BS-201", 256, 68, 288, 246, "Brainstorm Room 1", "meeting")
    f.workspace("meeting_room", "BS-202", 584, 68, 288, 246, "Brainstorm Room 2", "meeting")
    f.fixture("lounge", 916, 76, 212, 96, "Góc ý tưởng")
    f.furniture(916, 200, 212, 36, "Tường bảng trắng")
    f.plants((920, 280), (1096, 280))
    f.text(580, 364, 200, "Hành lang")

    f.hwall(422, 240, 1148, (600, 656, "Cửa Team Studio"), (760, 900))
    f.vwall(700, 430, 760)
    f.workspace("private_office", "TS-201", 256, 446, 428, 298, "Team Studio · 8 chỗ", "office")
    f.fixture("kitchen", 728, 456, 200, 90, "Pantry")
    f.fixture("lounge", 960, 456, 168, 90, "Khu nghỉ")
    f.furniture(736, 590, 192, 64, "Bàn ăn chung")
    f.add("fixture", "label", 960, 590, 168, 120, "Phòng nghỉ trưa", "utility")
    f.plants((730, 706), (900, 706))
    return f


def b2f3():
    f = Floor("el-b2f3-", "f2030000-0000-0000-0000-000000000003", "Tầng 3 - Corporate Enterprise Suites")
    f.shell(); core_west(f); corridor(f)
    f.windows("n", (270, 730), (790, 1120))
    f.windows("s", (270, 730), (790, 1120))
    f.windows("e", (90, 300), (470, 730))

    f.vwall(760, 52, 330)
    f.hwall(330, 240, 1148, (640, 704, "Cửa Enterprise Suite A"), (880, 1000))
    f.workspace("private_office", "ES-301", 256, 68, 488, 246, "Enterprise Suite A · 15 chỗ", "suite")
    f.fixture("lounge", 788, 76, 200, 100, "Executive Lounge")
    f.fixture("kitchen", 1008, 76, 124, 90, "Mini bar")
    f.furniture(820, 204, 140, 50, "Bàn trà")
    f.plants((790, 280), (1096, 280))
    f.text(560, 364, 200, "Hành lang")

    f.hwall(422, 240, 1148, (640, 704, "Cửa Enterprise Suite B"), (840, 1000))
    f.vwall(760, 430, 760)
    f.workspace("private_office", "ES-302", 256, 446, 488, 298, "Enterprise Suite B · 15 chỗ", "suite")
    f.fixture("reception", 796, 456, 200, 84, "Lễ tân doanh nghiệp")
    f.fixture("lounge", 796, 588, 140, 88, "Sofa chờ")
    f.fixture("kitchen", 968, 588, 160, 88, "Pantry")
    f.plants((790, 706), (1096, 706), (1096, 470))
    return f


# ═════════════════════════════ Cầu Giấy ═════════════════════════════

def b3f1():
    f = Floor("el-b3f1-", "f3010000-0000-0000-0000-000000000001", "Tầng 1 - Tech Community & Event Space")
    f.shell(); core_north(f); corridor(f, 400, 70)
    f.windows("n", (80, 440), (760, 1120))
    f.windows("w", (90, 370), (500, 730))
    f.windows("e", (90, 370), (500, 730))
    f.windows("s", (330, 880), (940, 1120))
    f.entrance("s", 110, 230)

    # Tech benches (north-west) and the community lounge (north-east), both open to the corridor
    f.tint(60, 60, 404, 324, "zone_green", "Khu bàn Tech")
    f.workspace("desk", "TA-101", 88, 84, 348, 120, "Dãy bàn Tech-A", "desk")
    f.workspace("desk", "TB-102", 88, 236, 348, 120, "Dãy bàn Tech-B", "desk")
    f.tint(736, 60, 404, 324, "zone_violet", "Community lounge")
    f.fixture("lounge", 760, 84, 200, 100, "Sofa cộng đồng")
    f.fixture("kitchen", 984, 84, 140, 90, "Coffee bar")
    f.furniture(760, 214, 200, 40, "Bảng tin cộng đồng")
    f.round_tables((996, 208), (1068, 208), (996, 280), (1068, 280))
    f.plants((764, 300), (930, 300))
    f.text(220, 420, 160, "Hành lang")

    # Reception by the entrance, event hall, equipment store
    f.hwall(470, 52, 1148, (110, 250), (560, 640, "Cửa hội trường"), (960, 1016, "Cửa kho"))
    f.vwall(292, 478, 760)
    f.vwall(908, 478, 760)
    f.fixture("reception", 72, 498, 200, 84, "Lễ tân CoSpace")
    f.text(100, 610, 140, "Sảnh chính")
    f.plants((64, 716), (252, 716))
    f.workspace("meeting_room", "EV-101", 316, 494, 576, 250, "Hội trường Event Room", "event")
    f.add("fixture", "label", 932, 494, 200, 110, "Kho thiết bị sự kiện", "utility")
    f.fixture("lounge", 932, 632, 200, 92, "Phòng chờ diễn giả")
    return f


def b3f2():
    f = Floor("el-b3f2-", "f3020000-0000-0000-0000-000000000002", "Tầng 2 - Scale-up Workstations & Boardrooms")
    f.shell(); core_north(f); corridor(f, 400, 70)
    f.windows("n", (80, 440), (760, 1120))
    f.windows("s", (80, 680), (740, 1120))
    f.windows("w", (90, 370), (500, 730))
    f.windows("e", (90, 370), (500, 730))

    f.hwall(392, 52, 472, (380, 436, "Cửa Boardroom"), glass=True)
    f.hwall(392, 728, 1148, (764, 820, "Cửa phòng họp"), glass=True)
    f.workspace("meeting_room", "BR-201", 68, 68, 388, 308, "Boardroom VIP", "suite")
    f.workspace("meeting_room", "MR-202@b3", 744, 68, 388, 308, "Phòng họp Team", "meeting")
    f.text(860, 420, 200, "Hành lang")

    f.hwall(470, 52, 1148, (560, 616, "Cửa Scale-up Suite"), (780, 920))
    f.vwall(700, 478, 760)
    f.workspace("private_office", "SU-201", 68, 494, 616, 250, "Scale-up Office Suite · 16 chỗ", "office")
    f.fixture("kitchen", 728, 496, 200, 90, "Pantry")
    f.fixture("lounge", 960, 496, 168, 90, "Khu nghỉ")
    f.furniture(736, 620, 192, 60, "Bàn ăn chung")
    f.furniture(960, 620, 168, 60, "Tủ locker")
    f.plants((730, 712), (1100, 712))
    return f


def b3f3():
    f = Floor("el-b3f3-", "f3030000-0000-0000-0000-000000000003", "Tầng 3 - Directors Penthouse Suites")
    f.shell(); core_north(f); corridor(f, 400, 70)
    f.windows("n", (80, 440), (760, 1120))
    f.windows("s", (60, 1140))
    f.windows("w", (90, 370), (500, 740))
    f.windows("e", (90, 370), (500, 740))

    f.hwall(392, 52, 472, (380, 436, "Cửa Penthouse West"))
    f.hwall(392, 728, 1148, (764, 820, "Cửa Penthouse East"))
    f.workspace("private_office", "PW-302", 68, 68, 388, 308, "Penthouse Suite West", "suite")
    f.workspace("private_office", "PE-301", 744, 68, 388, 308, "Penthouse Suite East", "suite")
    f.text(240, 420, 160, "Hành lang")
    f.text(800, 420, 160, "Hành lang")

    # Glass wall onto the roof terrace
    f.hwall(470, 52, 1148, (200, 280, "Cửa ra sân thượng"), (920, 1000, "Cửa ra sân thượng"), glass=True)
    f.tint(52, 478, 1096, 282, "terrace", "Sân thượng")
    f.fixture("lounge", 96, 520, 200, 96, "Lounge ngoài trời")
    f.fixture("kitchen", 904, 520, 200, 90, "Quầy bar")
    f.round_tables((440, 540), (520, 540), (600, 540), (680, 540), (480, 620), (560, 620), (640, 620))
    f.plants((80, 712), (150, 712), (220, 712), (290, 712), (360, 712), (430, 712),
             (742, 712), (812, 712), (882, 712), (952, 712), (1022, 712), (1092, 712),
             (330, 520), (842, 520))
    return f


FLOORS = [b1f1, b1f2, b1f3, b2f1, b2f2, b2f3, b3f1, b3f2, b3f3]


# ═════════════════════════════ checks & SQL ═════════════════════════════

def check(f, layout):
    els = layout["elements"]
    ids = [e["id"] for e in els]
    assert len(ids) == len(set(ids)), f"{f.title}: duplicate element ids"
    for e in els:
        assert 0 <= e["x"] and 0 <= e["y"] and e["x"] + e["width"] <= 1200 and e["y"] + e["height"] <= 800, e["id"]
        assert e["width"] > 0 and e["height"] > 0, e["id"]
        if e["type"] in LINKABLE:
            assert e["workspaceId"], f"{e['id']}: bookable type without a workspace would be auto-created on save"
    linked = [e["workspaceId"] for e in els if e["workspaceId"]]
    assert len(linked) == len(set(linked)), f"{f.title}: workspace placed twice"
    return len(els), len(linked)


def element_line(e):
    return "    " + json.dumps(e, ensure_ascii=False, separators=(", ", ": ")).replace("{", "{ ", 1)[:-1] + " }"


def layout_sql(f, layout):
    body = ("{\n  \"version\": 1,\n"
            "  \"canvas\": { \"width\": 1200, \"height\": 800, \"gridSize\": 20, \"backgroundColor\": \"#f8fafc\" },\n"
            "  \"elements\": [\n" + ",\n".join(element_line(e) for e in layout["elements"]) + "\n  ]\n}")
    assert "'" not in body
    assert json.loads(body) == layout
    return (f"-- {f.title}\nUPDATE floors\nSET layout_json = '{body}'::jsonb,\n    updated_at = now()\n"
            f"WHERE id = '{f.floor_id}'::uuid;\n")


BRANCH_HEADERS = {
    "el-b1f1-": "-- BRANCH 1: CoSpace Nguyễn Huệ (Quận 1) — b1000000-0000-0000-0000-000000000001 — lõi thang phía Đông",
    "el-b2f1-": "-- BRANCH 2: CoSpace Nam Kỳ Khởi Nghĩa (Quận 3) — b2000000-0000-0000-0000-000000000002 — lõi thang phía Tây",
    "el-b3f1-": "-- BRANCH 3: CoSpace Cầu Giấy — b3000000-0000-0000-0000-000000000003 — lõi thang giữa phía Bắc",
}


def main():
    built = [fn() for fn in FLOORS]
    parts, summary = [], []
    for f in built:
        layout = f.layout()
        n, linked = check(f, layout)
        summary.append((f.title, n, linked))
        if f.prefix in BRANCH_HEADERS:
            parts.append("-- " + "=" * 77 + "\n" + BRANCH_HEADERS[f.prefix] + "\n-- " + "=" * 77 + "\n")
        parts.append(layout_sql(f, layout))
    placed = {ws_id for ws_id, _ in WS.values()}
    assert sum(s[2] for s in summary) == len(placed) == 29

    if "--check" in sys.argv:
        for title, n, linked in summary:
            print(f"{title:52} {n:3} phần tử, {linked} chỗ đặt")
        return

    floor_ids = ", ".join(f"'{f.floor_id}'::uuid" for f in built)
    sql = f"""-- =============================================================================
-- CoSpace: sơ đồ tầng (layout_json) cho 9 tầng / 3 chi nhánh demo
-- File này được sinh bởi database/tools/floor_layouts.py — sửa ở đó rồi chạy lại:
--     python3 database/tools/floor_layouts.py
--
-- Mỗi chi nhánh là một tòa nhà: vỏ, mặt kính và lõi thang (cầu thang bộ, 2 thang
-- máy, WC) giống nhau ở cả ba tầng. 29 chỗ đặt trong dữ liệu demo đều được đặt lên
-- sơ đồ; các phần tử khác là kết cấu / tiện ích nên lưu trong trình chỉnh sửa không
-- tự sinh thêm chỗ đặt.
--
-- Chạy được nhiều lần (chỉ ghi đè layout_json của 9 tầng này).
-- Supabase: SQL Editor -> dán toàn bộ file -> Run.
-- =============================================================================

BEGIN;

{chr(10).join(parts)}
COMMIT;

-- Kiểm tra 1: số phần tử và số chỗ đặt trên từng sơ đồ.
SELECT f.name,
       jsonb_array_length(f.layout_json->'elements') AS so_phan_tu,
       (SELECT count(*) FROM jsonb_array_elements(f.layout_json->'elements') e
         WHERE e->>'workspaceId' IS NOT NULL) AS so_cho_dat_tren_so_do
FROM floors f
WHERE f.id IN ({floor_ids})
ORDER BY f.branch_id, f.floor_no;

-- Kiểm tra 2: chỗ đặt của các tầng này nhưng không có trên sơ đồ (ví dụ chỗ tạo thêm
-- sau dữ liệu demo). Kết quả rỗng là đủ; nếu có dòng, mở trình chỉnh sửa sơ đồ của
-- tầng đó và gán chỗ cho một phần tử.
SELECT f.name AS tang, w.code, w.name
FROM workspaces w
JOIN floors f ON f.id = w.floor_id
WHERE f.id IN ({floor_ids})
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(f.layout_json->'elements') e
                  WHERE e->>'workspaceId' = w.id::text);
"""
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "seed_floor_layouts_json.sql")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(sql)
    for title, n, linked in summary:
        print(f"{title:52} {n:3} phần tử, {linked} chỗ đặt")
    print("->", os.path.normpath(out))


if __name__ == "__main__":
    main()
