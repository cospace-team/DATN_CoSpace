# -*- coding: utf-8 -*-
"""Bo dung so do dang luoi: so do hoat dong (co lan), so do trang thai, so do kien truc.

Moi o dat theo (cot, hang) tren luoi; canh vuong goc noi cac o, huong roi/vao chon theo cac canh cua o
(t=tren, b=duoi, l=trai, r=phai; 'r@0.3' = diem 30% doc theo canh). draw.io tu ve duong di vuong goc,
nen bo tri phai de cac hang/cot ma canh di qua con trong.
"""
import html
import io

LANE_FILL = ["#dae8fc", "#d5e8d4", "#ffe6cc", "#e1d5e7", "#fff2cc", "#f8cecc"]
LANE_STROKE = ["#6c8ebf", "#82b366", "#d79b00", "#9673a6", "#d6b656", "#b85450"]

SIDES = {"t": (0.5, 0.0), "b": (0.5, 1.0), "l": (0.0, 0.5), "r": (1.0, 0.5)}

DEFAULTS = {
    "start": (24, 24, "ellipse;html=1;shape=startState;fillColor=#000000;strokeColor=#000000;"),
    "end": (30, 30, "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;"),
    "action": (176, 56, "rounded=1;whiteSpace=wrap;html=1;arcSize=22;"),
    "decision": (168, 86, "rhombus;whiteSpace=wrap;html=1;"),
    "state": (176, 54, "rounded=1;whiteSpace=wrap;html=1;arcSize=32;fontStyle=1;"),
    "note": (196, 66, "shape=note;size=10;whiteSpace=wrap;html=1;align=left;spacingLeft=6;"),
    "box": (200, 70, "rounded=1;whiteSpace=wrap;html=1;arcSize=8;"),
    "db": (150, 96, "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=14;"),
    "text": (200, 30, "text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;"),
}


def esc(s):
    return html.escape(s, quote=True)


def label_html(text):
    """Xuong dong bang \\n; noi dung duoc thoat ky tu HTML roi thoat ky tu XML cho thuoc tinh."""
    inner = "<br>".join(html.escape(line, quote=False) for line in text.split("\n"))
    return esc(inner)


def parse_side(spec):
    if spec is None:
        return None
    base, _, frac = spec.partition("@")
    x, y = SIDES[base]
    if frac:
        f = float(frac)
        if base in ("t", "b"):
            x = f
        else:
            y = f
    return x, y


class Grid:
    def __init__(self, key, title, colw=210, rowh=86, x0=24, y0=62):
        self.key, self.title = key, title
        self.colw, self.rowh, self.x0, self.y0 = colw, rowh, x0, y0
        self.lanes = []          # (tieu de, cot dau, cot cuoi, chi so mau)
        self.zones = []          # khung nen (kien truc, trang thai hop thanh)
        self.nodes = {}
        self.order = []
        self.edges = []
        self.max_row = 0
        self.max_col = 0

    # ---------------------------------------------------------------- toa do
    def px(self, col):
        return self.x0 + (col + 0.5) * self.colw

    def py(self, row):
        return self.y0 + (row + 0.5) * self.rowh

    # ---------------------------------------------------------------- them phan tu
    def lane(self, title, c0, c1=None, idx=None):
        self.lanes.append((title, c0, c0 if c1 is None else c1, len(self.lanes) if idx is None else idx))

    def zone(self, zid, title, c0, r0, c1, r1, fill="#ffffff", stroke="#7a7a7a", dashed=True, opacity=100,
             font=12, bold=True, valign="top"):
        """Khung nen phu (c0,r0)-(c1,r1) tinh theo tam o; c1, r1 la tam cua o cuoi cung."""
        self.zones.append(dict(id=zid, title=title, c0=c0, r0=r0, c1=c1, r1=r1, fill=fill, stroke=stroke,
                               dashed=dashed, opacity=opacity, font=font, bold=bold, valign=valign))
        self.nodes[zid] = dict(id=zid, kind="zone", col=(c0 + c1) / 2, row=(r0 + r1) / 2)
        self.max_row = max(self.max_row, r1)
        self.max_col = max(self.max_col, c1)

    def node(self, nid, kind, label, col, row, lane=None, w=None, h=None, fill=None, stroke=None,
             dashed=False, thick=False, font=11, bold=False, extra=""):
        dw, dh, style = DEFAULTS[kind]
        w, h = w or dw, h or dh
        if fill is None and lane is not None and kind in ("action", "decision"):
            fill = LANE_FILL[lane % len(LANE_FILL)]
        if stroke is None and lane is not None and kind in ("action", "decision"):
            stroke = LANE_STROKE[lane % len(LANE_STROKE)]
        parts = [style, "fontSize=%d;fontColor=#1f1f1f;" % font]
        if kind not in ("start", "end"):
            parts.append("fillColor=%s;strokeColor=%s;" % (fill or "#ffffff", stroke or "#4a4a4a"))
        if dashed:
            parts.append("dashed=1;")
        if thick:
            parts.append("strokeWidth=3;")
        elif kind not in ("start", "end", "text"):
            parts.append("strokeWidth=1.3;")
        if bold:
            parts.append("fontStyle=1;")
        parts.append(extra)
        self.nodes[nid] = dict(id=nid, kind=kind, label=label, col=col, row=row, w=w, h=h, style="".join(parts))
        self.order.append(nid)
        self.max_row = max(self.max_row, row)
        self.max_col = max(self.max_col, col)

    def edge(self, a, b, label="", sa=None, sb=None, dashed=False, points=(), color="#333333", width=1.3,
             arrow="block", start_arrow=None, font=10, lab_bg=True):
        self.edges.append(dict(a=a, b=b, label=label, sa=sa, sb=sb, dashed=dashed, points=list(points),
                               color=color, width=width, arrow=arrow, start_arrow=start_arrow, font=font,
                               lab_bg=lab_bg))

    def gap_after(self, row, delta):
        """Chen them khoang trong `delta` hang ngay sau `row` (dich moi o o phia duoi xuong), de hai hinh thoi
        lien tiep khong cham nhau va con cho cho nhan tren canh."""
        for nd in self.nodes.values():
            if nd["row"] > row:
                nd["row"] += delta
        for z in self.zones:
            if z["r0"] > row:
                z["r0"] += delta
            if z["r1"] > row:
                z["r1"] += delta
        self.max_row += delta

    # ---------------------------------------------------------------- xuat XML
    def _auto_sides(self, a, b):
        na, nb = self.nodes[a], self.nodes[b]
        dc, dr = nb["col"] - na["col"], nb["row"] - na["row"]
        if abs(dc) < 0.01:
            return ("b", "t") if dr > 0 else ("t", "b")
        if abs(dr) < 0.01:
            return ("r", "l") if dc > 0 else ("l", "r")
        return ("r" if dc > 0 else "l"), ("t" if dr > 0 else "b")

    def xml(self):
        cells = []
        n = [0]

        def cid(p):
            n[0] += 1
            return "%s_%s%d" % (self.key, p, n[0])

        total_rows = self.max_row
        bottom = self.y0 + (total_rows + 1) * self.rowh - 6
        # lan (nen)
        for title, c0, c1, idx in self.lanes:
            x = self.x0 + c0 * self.colw
            w = (c1 - c0 + 1) * self.colw
            cells.append(
                '        <mxCell id="%s" value="%s" style="rounded=0;whiteSpace=wrap;html=1;fillColor=%s;'
                'strokeColor=%s;strokeWidth=1.5;fillOpacity=28;verticalAlign=top;align=center;fontStyle=1;'
                'fontSize=13;fontColor=#1f1f1f;spacingTop=6;" vertex="1" parent="1">\n'
                '          <mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry" />\n'
                '        </mxCell>' % (cid("lane"), label_html(title), LANE_FILL[idx % 6], LANE_STROKE[idx % 6],
                                       x, 10, w, bottom - 10))
        # khung nen
        for z in self.zones:
            x = self.px(z["c0"]) - self.colw / 2 + 10
            y = self.py(z["r0"]) - self.rowh / 2 + 6
            w = (z["c1"] - z["c0"]) * self.colw + self.colw - 20
            h = (z["r1"] - z["r0"]) * self.rowh + self.rowh - 12
            cells.append(
                '        <mxCell id="%s" value="%s" style="rounded=1;arcSize=4;whiteSpace=wrap;html=1;fillColor=%s;'
                'strokeColor=%s;strokeWidth=1.5;%sfillOpacity=%d;verticalAlign=%s;align=left;spacingLeft=10;'
                'spacingTop=6;fontStyle=%d;fontSize=%d;fontColor=#1f1f1f;" vertex="1" parent="1">\n'
                '          <mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry" />\n'
                '        </mxCell>' % (z["id"], label_html(z["title"]), z["fill"], z["stroke"],
                                       "dashed=1;" if z["dashed"] else "", z["opacity"], z["valign"],
                                       1 if z["bold"] else 0, z["font"], x, y, w, h))
        # canh
        for e in self.edges:
            sa, sb = e["sa"], e["sb"]
            da, db = self._auto_sides(e["a"], e["b"])
            sa, sb = sa or da, sb or db
            ex, ey = parse_side(sa)
            nx, ny = parse_side(sb)
            style = ("edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;orthogonalLoop=1;jettySize=auto;"
                     "strokeColor=%s;strokeWidth=%s;endArrow=%s;endFill=%d;endSize=7;fontSize=%d;fontColor=#1f1f1f;"
                     "exitX=%s;exitY=%s;exitDx=0;exitDy=0;entryX=%s;entryY=%s;entryDx=0;entryDy=0;"
                     % (e["color"], e["width"], e["arrow"], 1 if e["arrow"] in ("block", "diamond") else 0,
                        e["font"], ex, ey, nx, ny))
            if e["start_arrow"]:
                style += "startArrow=%s;startFill=0;startSize=7;" % e["start_arrow"]
            if e["dashed"]:
                style += "dashed=1;dashPattern=6 4;"
            if e["label"] and e["lab_bg"]:
                style += "labelBackgroundColor=#ffffff;"
            pts = ""
            if e["points"]:
                pts = ('            <Array as="points">\n' +
                       "".join('              <mxPoint x="%d" y="%d" />\n' % (round(self.px(c)), round(self.py(r)))
                               for c, r in e["points"]) + '            </Array>\n')
            cells.append(
                '        <mxCell id="%s" value="%s" style="%s" edge="1" parent="1" source="%s" target="%s">\n'
                '          <mxGeometry relative="1" as="geometry">\n%s          </mxGeometry>\n'
                '        </mxCell>' % (cid("e"), label_html(e["label"]), style, e["a"], e["b"], pts))
        # o
        for nid in self.order:
            nd = self.nodes[nid]
            x = self.px(nd["col"]) - nd["w"] / 2
            y = self.py(nd["row"]) - nd["h"] / 2
            val = "" if nd["kind"] in ("start", "end") else label_html(nd["label"])
            cells.append(
                '        <mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">\n'
                '          <mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry" />\n'
                '        </mxCell>' % (nid, val, nd["style"], round(x), round(y), nd["w"], nd["h"]))
        return "\n".join(cells)

    def drawio(self):
        return ('<mxfile host="Claude" type="device">\n'
                '  <diagram id="%s" name="%s">\n'
                '    <mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" '
                'arrows="1" fold="1" page="0" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0" '
                'adaptiveColors="auto">\n      <root>\n'
                '        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n%s\n'
                '      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n'
                % (self.key, esc(self.title), self.xml()))

    def save(self, path):
        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(self.drawio())
