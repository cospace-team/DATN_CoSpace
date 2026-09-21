# -*- coding: utf-8 -*-
"""Sinh ERD tu lược do that: BE/src/main/resources/db/migration/V1__baseline.sql (+ ALTER TABLE).

Bang, cot, khoa chinh, khoa ngoai (kem NOT NULL va ON DELETE) duoc doc truc tiep tu SQL, nen khi
lược do doi chi can chay lai `python build_erd.py`.
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import uml_class  # noqa: E402
from uml_class import Cls, Diagram  # noqa: E402

SQL_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                       "..", "..", "..", "..", "BE", "src", "main", "resources", "db", "migration"))

HIDE_COLS = {"created_at", "updated_at"}

# ---- mau theo module
MODULES = {
    "identity": ("Định danh và hồ sơ", "#dae8fc", "#6c8ebf"),
    "matching": ("Gợi ý đối tác", "#e1d5e7", "#9673a6"),
    "space": ("Không gian", "#d5e8d4", "#82b366"),
    "pricing": ("Giá, khuyến mãi, hạng", "#f8cecc", "#b85450"),
    "booking": ("Đặt chỗ", "#fff2cc", "#d6b656"),
    "payment": ("Thanh toán và hoàn tiền", "#ffe6cc", "#d79b00"),
    "community": ("Cộng đồng, thông báo, kiểm toán", "#dae8fc", "#5a7fa8"),
}
MODULE_OF = {
    "users": "identity", "auth_accounts": "identity", "profiles": "identity",
    "tags": "matching", "profile_skills": "matching", "profile_interests": "matching",
    "profile_match_scores": "matching",
    "branches": "space", "floors": "space", "workspace_types": "space", "amenities": "space",
    "workspace_type_amenities": "space", "workspaces": "space", "workspace_maintenance": "space",
    "price_policies": "pricing", "extra_services": "pricing", "cancellation_policies": "pricing",
    "membership_tiers": "pricing", "promotions": "pricing",
    "bookings": "booking", "booking_services": "booking", "checkin_logs": "booking",
    "booking_cancellations": "booking",
    "payments": "payment", "payment_events": "payment", "refunds": "payment",
    "posts": "community", "post_tags": "community", "notifications": "community", "audit_logs": "community",
}

for _k, (_n, _f, _s) in MODULES.items():
    uml_class.FILL["t_" + _k] = _f
    uml_class.STROKE["t_" + _k] = _s

# canh ER: chan cha o dau nguon, chan con o dau dich
_ER = "startFill=0;endFill=0;startSize=11;endSize=11;"
uml_class.ESTYLE.update({
    "er_mand": "startArrow=ERmandOne;endArrow=ERzeroToMany;" + _ER,     # FK NOT NULL: moi dong con co dung 1 cha
    "er_opt": "startArrow=ERzeroToOne;endArrow=ERzeroToMany;" + _ER,    # FK cho phep NULL
    "er_one": "startArrow=ERmandOne;endArrow=ERzeroToOne;" + _ER,       # quan he 1-1 (FK dong thoi la khoa chinh)
})


# ======================================================================= phan tich SQL
def strip_comments(sql):
    return re.sub(r"--[^\n]*", "", sql)


def match_paren(text, open_idx):
    depth = 0
    for i in range(open_idx, len(text)):
        c = text[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
    raise ValueError("thieu dau dong ngoac")


def split_top(body):
    parts, depth, cur = [], 0, []
    in_q = False
    for c in body:
        if c == "'":
            in_q = not in_q
        if not in_q:
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            elif c == "," and depth == 0:
                parts.append("".join(cur).strip())
                cur = []
                continue
        cur.append(c)
    if "".join(cur).strip():
        parts.append("".join(cur).strip())
    return parts


class Table:
    def __init__(self, name):
        self.name = name
        self.cols = []          # danh sach ten cot theo thu tu
        self.type = {}
        self.notnull = {}
        self.pk = []
        self.uq = set()
        self.fks = []           # (col, ref_table, ref_col, on_delete)
        self.notes = []

    def add_col(self, name, typ, rest):
        rest_u = rest.upper()
        if name not in self.type:
            self.cols.append(name)
        self.type[name] = typ
        self.notnull[name] = "NOT NULL" in rest_u or "PRIMARY KEY" in rest_u
        if "PRIMARY KEY" in rest_u and name not in self.pk:
            self.pk.append(name)
        if re.search(r"\bUNIQUE\b", rest_u):
            self.uq.add(name)
        m = re.search(r"REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)(?:\s+ON DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?",
                      rest, re.I)
        if m:
            self.add_fk(name, m.group(1), m.group(2), (m.group(3) or "NO ACTION").upper())

    def add_fk(self, col, ref_t, ref_c, on_delete):
        if not any(f[0] == col and f[1] == ref_t for f in self.fks):
            self.fks.append((col, ref_t, ref_c, on_delete))


COL_RE = re.compile(r"^(\w+)\s+(\w+(?:\s*\([^)]*\))?(?:\[\])?)(.*)$", re.S)
CONSTRAINT_START = ("CONSTRAINT", "PRIMARY", "UNIQUE", "CHECK", "FOREIGN", "EXCLUDE")


def parse_schema(files):
    sql = strip_comments("\n".join(io.open(f, encoding="utf-8").read() for f in files))
    tables = {}
    # 1. CREATE TABLE (chi lay lan dau: lan lap lai la IF NOT EXISTS nen khong chay)
    for m in re.finditer(r"CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(", sql):
        name = m.group(1)
        if name in tables:
            continue
        end = match_paren(sql, m.end() - 1)
        body = sql[m.end():end]
        t = Table(name)
        for item in split_top(body):
            first = item.split()[0].upper() if item.split() else ""
            if first in CONSTRAINT_START:
                mm = re.search(r"PRIMARY KEY\s*\(([^)]*)\)", item, re.I)
                if mm and first in ("PRIMARY", "CONSTRAINT"):
                    t.pk = [c.strip() for c in mm.group(1).split(",")]
                mm = re.search(r"FOREIGN KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)"
                               r"(?:\s+ON DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?", item, re.I)
                if mm:
                    t.add_fk(mm.group(1), mm.group(2), mm.group(3), (mm.group(4) or "NO ACTION").upper())
                mm = re.search(r"UNIQUE\s*\(\s*(\w+)\s*\)", item, re.I)
                if mm:
                    t.uq.add(mm.group(1))
                continue
            cm = COL_RE.match(item)
            if cm:
                t.add_col(cm.group(1), cm.group(2).replace(" ", ""), cm.group(3))
        for c in t.pk:
            t.notnull[c] = True
        tables[name] = t
    # 2. ALTER TABLE ... ADD COLUMN / ALTER COLUMN TYPE / ADD CONSTRAINT FOREIGN KEY
    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+ADD COLUMN IF NOT EXISTS\s+(\w+)\s+([^;]+);", sql, re.I):
        t = tables.get(m.group(1))
        if not t:
            continue
        cm = COL_RE.match(m.group(2) + " " + m.group(3))
        if cm:
            t.add_col(cm.group(1), cm.group(2).replace(" ", "").lower(), cm.group(3))
    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+ALTER COLUMN\s+(\w+)\s+TYPE\s+(\w+(?:\s*\([^)]*\))?)", sql, re.I):
        t = tables.get(m.group(1))
        if t and m.group(2) in t.type:
            t.type[m.group(2)] = m.group(3).replace(" ", "").lower()
    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+[^;]*?FOREIGN KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)"
                         r"(?:\s+ON DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?", sql, re.I):
        t = tables.get(m.group(1))
        if t:
            t.add_fk(m.group(2), m.group(3), m.group(4), (m.group(5) or "NO ACTION").upper())
    # 3. ghi chu cho cac rang buoc loai tru (EXCLUDE USING gist)
    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+ADD CONSTRAINT\s+\w+\s+EXCLUDE USING gist\s*\((.*?)\)\s*WHERE\s*\((.*?)\);",
                         sql, re.I | re.S):
        t = tables.get(m.group(1))
        if t and "EXCLUDE" not in " ".join(t.notes):
            t.notes.append("EXCLUDE: workspace_id trùng và khoảng thời gian chồng lấn")
    return tables


# ======================================================================= dung so do
def col_row(t, c):
    tags = []
    if c in t.pk:
        tags.append("PK")
    if any(f[0] == c for f in t.fks):
        tags.append("FK")
    if c in t.uq:
        tags.append("UQ")
    typ = t.type.get(c, "").lower()      # CREATE viet thuong, ALTER viet hoa: thong nhat ve chu thuong
    s = "%s : %s" % (c, typ)
    if tags:
        s += " «%s»" % ", ".join(tags)
    return s


def table_cls(t, cid=None, compact=False):
    kind = "t_" + MODULE_OF[t.name]
    if compact:
        return Cls(cid or t.name, t.name, [], kind=kind, minw=120)
    attrs = [col_row(t, c) for c in t.cols if c not in HIDE_COLS]
    note = t.notes[0] if t.notes else None
    return Cls(cid or t.name, t.name, attrs, kind=kind, note=note, minw=170)


def ref_cls(t, cols):
    rows = [col_row(t, c) for c in cols]
    return Cls(t.name, t.name, rows, kind="ref", minw=150)


def edge_kind(child, col):
    if child.pk == [col]:
        return "er_one"
    return "er_mand" if child.notnull.get(col) else "er_opt"


def build_page(key, title, tables, names, compact=False, refs=True, show_label=True, skip_parents=()):
    """names: cac bang thuoc trang. Cac bang cha nam ngoai trang duoc ve o dang tham chieu (chi ghi khoa).

    skip_parents: bang trung tam (users, branches) khong ve canh toi, thay vao do ghi so quan he bi an len hop.
    """
    d = Diagram(key, title)
    on_page = set(names)
    hidden = {p: 0 for p in skip_parents}
    for n in names:
        for _col, rt, _rc, _od in tables[n].fks:
            if rt in hidden:
                hidden[rt] += 1
    for n in names:
        c = table_cls(tables[n], compact=compact)
        if n in hidden and hidden[n]:
            c.note = "%d quan hệ tới bảng này không vẽ" % hidden[n]
        d.add(c)
    ext = {}
    for n in names:
        for col, rt, rc, _od in tables[n].fks:
            if rt not in on_page:
                ext.setdefault(rt, set()).add(rc)
    if refs:
        for rt, cols in sorted(ext.items()):
            d.add(ref_cls(tables[rt], sorted(cols)))
    have = on_page | (set(ext) if refs else set())
    for n in names:
        child = tables[n]
        for col, rt, rc, _od in child.fks:
            if rt in have and rt not in skip_parents:
                d.link(rt, n, edge_kind(child, col), label="" if (compact or not show_label) else col)
    return d


# ======================================================================= cac trang
PAGES = [
    ("erd00", "erd-00-tongquan", "ERD tổng quan: các module dữ liệu", None, "overview"),
    ("erd01", "erd-01-dinhdanh", "ERD: định danh, hồ sơ và gợi ý đối tác",
     ["users", "auth_accounts", "profiles", "tags", "profile_skills", "profile_interests",
      "profile_match_scores"], None),
    ("erd02", "erd-02-khonggian", "ERD: không gian làm việc",
     ["branches", "floors", "workspace_types", "amenities", "workspace_type_amenities", "workspaces",
      "workspace_maintenance"], None),
    ("erd03", "erd-03-gia", "ERD: bảng giá, dịch vụ, chính sách hủy, khuyến mãi và hạng thành viên",
     ["price_policies", "extra_services", "cancellation_policies", "promotions", "membership_tiers"], None),
    ("erd04", "erd-04-datcho", "ERD: đặt chỗ, dịch vụ gọi thêm, check-in và hủy",
     ["bookings", "booking_services", "checkin_logs", "booking_cancellations"], None),
    ("erd05", "erd-05-thanhtoan", "ERD: thanh toán và hoàn tiền",
     ["payments", "payment_events", "refunds"], None),
    ("erd06", "erd-06-congdong", "ERD: bảng tin, thông báo và nhật ký kiểm toán",
     ["posts", "post_tags", "notifications", "audit_logs"], None),
]


def load():
    files = [os.path.join(SQL_DIR, f) for f in ("V1__baseline.sql",)]
    tables = parse_schema(files)
    missing = set(MODULE_OF) - set(tables)
    extra = set(tables) - set(MODULE_OF)
    if missing or extra:
        raise SystemExit("Lech giua MODULE_OF va SQL: thieu %s, thua %s" % (sorted(missing), sorted(extra)))
    return tables


if __name__ == "__main__":
    tabs = load()
    fk_total = sum(len(t.fks) for t in tabs.values())
    print("so bang:", len(tabs), " so khoa ngoai:", fk_total, " so cot:", sum(len(t.cols) for t in tabs.values()))
    for n in ("users", "bookings", "payments", "workspace_maintenance"):
        t = tabs[n]
        print(n, "cot=%d" % len(t.cols), "pk=%s" % t.pk, "fk=%s" % [(f[0], f[1], f[3]) for f in t.fks], t.notes)
