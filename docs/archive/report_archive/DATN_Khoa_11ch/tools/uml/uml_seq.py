# -*- coding: utf-8 -*-
"""Doc cac file .mmd (tap con cua Mermaid sequenceDiagram) va ve lai thanh .drawio
gon, de doc khi in A4: lifeline sat nhau, chu 11px, nhan tu xuong dong,
khung alt/opt/loop chi bao cac lifeline lien quan.

Dung:  python uml_seq.py <thu_muc_mmd> <file_ra.drawio> <ten1=tieu_de1> ...
"""
import html
import io
import os
import re
import sys

FONT = 12          # co chu nhan thong diep
CH = 6.35          # do rong trung binh mot ky tu o co chu 12px
LINE_H = 14        # chieu cao mot dong chu
GAP = 176          # khoang cach toi thieu giua hai lifeline (tam-tam)
MARGIN = 20
LIFE_TOP = 92      # y bat dau cua lifeline

C_FILL = "#dae8fc"
C_STROKE = "#6c8ebf"
C_TEXT = "#1f1f1f"


def esc(s):
    return html.escape(s, quote=True)


# --------------------------------------------------------------------------- parse
class Frag:
    def __init__(self, kind, cond):
        self.kind = kind
        self.branches = [[cond, []]]


def parse(text):
    parts, idx = [], {}
    root = []
    stack = [root]          # danh sach item hien tai
    fstack = []             # cac Frag dang mo
    auto = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("%%") or line == "sequenceDiagram":
            continue
        if line == "autonumber":
            auto = True
            continue
        m = re.match(r"^(actor|participant)\s+(\w+)\s+as\s+(.+)$", line)
        if m:
            idx[m.group(2)] = len(parts)
            parts.append({"id": m.group(2), "label": m.group(3), "actor": m.group(1) == "actor"})
            continue
        m = re.match(r"^(alt|opt|loop)\s+(.*)$", line)
        if m:
            fr = Frag(m.group(1), m.group(2))
            stack[-1].append(fr)
            fstack.append(fr)
            stack.append(fr.branches[-1][1])
            continue
        m = re.match(r"^else\s*(.*)$", line)
        if m:
            fr = fstack[-1]
            fr.branches.append([m.group(1), []])
            stack[-1] = fr.branches[-1][1]
            continue
        if line == "end":
            fstack.pop()
            stack.pop()
            continue
        m = re.match(r"^Note\s+(over|right of|left of)\s+([\w,]+)\s*:\s*(.*)$", line)
        if m:
            stack[-1].append({"t": "note", "pos": m.group(1),
                              "who": [idx[w] for w in m.group(2).split(",")], "text": m.group(3)})
            continue
        m = re.match(r"^(\w+)\s*(-->>|->>)\s*(\w+)\s*:\s*(.*)$", line)
        if m:
            stack[-1].append({"t": "msg", "a": idx[m.group(1)], "b": idx[m.group(3)],
                              "ret": m.group(2) == "-->>", "text": m.group(4)})
            continue
        raise ValueError("Khong hieu dong: " + line)
    return parts, root, auto


# --------------------------------------------------------------------------- layout
def wrap(text, width_px):
    """Tach thanh cac dong, ton trong <br/> thu cong. Tra ve list dong (chua escape)."""
    out = []
    maxc = max(8, int(width_px / CH))
    for seg in re.split(r"<br\s*/?>", text):
        cur = ""
        for w in seg.split(" "):
            if not cur:
                cur = w
            elif len(cur) + 1 + len(w) <= maxc:
                cur += " " + w
            else:
                out.append(cur)
                cur = w
        out.append(cur)
    return out


def involved(items):
    s = set()
    for it in items:
        if isinstance(it, Frag):
            for _, sub in it.branches:
                s |= involved(sub)
        elif it["t"] == "msg":
            s.add(it["a"])
            s.add(it["b"])
        else:
            s.update(it["who"])
    return s


def subdepth(fr):
    d = 0
    for _, sub in fr.branches:
        for it in sub:
            if isinstance(it, Frag):
                d = max(d, 1 + subdepth(it))
    return d


def self_right(items, parts):
    """Mep phai xa nhat cua cac thong diep tu goi (nhan nam ben phai lifeline)."""
    r = 0
    for it in items:
        if isinstance(it, Frag):
            for _, sub in it.branches:
                r = max(r, self_right(sub, parts))
        elif it["t"] == "msg" and it["a"] == it["b"]:
            cx = parts[it["a"]]["cx"]
            lines = wrap(it["text"], 210 - 4 * CH)
            wpx = min(210, max(len(l) for l in lines) * CH + 4 * CH + 8)
            r = max(r, cx + 42 + wpx + 8)
    return r


class Renderer:
    def __init__(self, key, parts, root, auto, gap=GAP):
        self.key, self.parts, self.root, self.auto = key, parts, root, auto
        self.cells = []
        self.n = 0
        self.num = 0
        self.y = LIFE_TOP + 14
        self.gap = gap
        self._place()

    # ---- ids / cells
    def nid(self, p="c"):
        self.n += 1
        return "%s_%s%d" % (self.key, p, self.n)

    def vertex(self, value, style, x, y, w, h):
        self.cells.append(
            '        <mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">\n'
            '          <mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry" />\n'
            '        </mxCell>' % (self.nid(), esc(value), style, round(x), round(y), round(w), round(h)))

    def edge(self, style, src, dst, points=None):
        pts = ""
        if points:
            pts = ('            <Array as="points">\n' +
                   "".join('              <mxPoint x="%d" y="%d" />\n' % (round(px), round(py)) for px, py in points) +
                   '            </Array>\n')
        self.cells.append(
            '        <mxCell id="%s" value="" style="%s" edge="1" parent="1">\n'
            '          <mxGeometry relative="1" as="geometry">\n'
            '            <mxPoint x="%d" y="%d" as="sourcePoint" />\n'
            '            <mxPoint x="%d" y="%d" as="targetPoint" />\n%s'
            '          </mxGeometry>\n'
            '        </mxCell>' % (self.nid("e"), style, round(src[0]), round(src[1]), round(dst[0]), round(dst[1]), pts))

    # ---- participants
    def _place(self):
        ps = self.parts
        for p in ps:
            lines = re.split(r"<br\s*/?>", p["label"])
            p["w"] = max(max(len(l) for l in lines) * 7.0 + 16, 104)
        ps[0]["cx"] = MARGIN + ps[0]["w"] / 2
        for i in range(1, len(ps)):
            need = (ps[i - 1]["w"] + ps[i]["w"]) / 2 + 16
            ps[i]["cx"] = ps[i - 1]["cx"] + max(self.gap, need)

    def _draw_headers(self, y_end):
        for p in self.parts:
            cx, w = p["cx"], p["w"]
            label = p["label"]
            lines = re.split(r"<br\s*/?>", label)
            if p["actor"]:
                self.vertex(label.replace("<br/>", "<br>"),
                            "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;"
                            "outlineConnect=0;fontSize=12;fontStyle=1;fillColor=%s;strokeColor=#333333;"
                            "fontColor=%s" % (C_FILL, C_TEXT),
                            cx - 13, LIFE_TOP - 74, 26, 42)
            else:
                h = 34 if len(lines) == 1 else 46
                self.vertex(label.replace("<br/>", "<br>"),
                            "rounded=1;whiteSpace=wrap;html=1;fontSize=12;fontStyle=1;fillColor=%s;"
                            "strokeColor=%s;fontColor=%s;arcSize=12" % (C_FILL, C_STROKE, C_TEXT),
                            cx - w / 2, LIFE_TOP - h, w, h)
            self.edge("endArrow=none;dashed=1;dashPattern=5 4;html=1;strokeColor=#8a8a8a;strokeWidth=1",
                      (cx, LIFE_TOP), (cx, y_end))

    # ---- items
    def run(self):
        self._items(self.root, 0, None)
        y_end = self.y + 6
        body = self.cells
        self.cells = []
        self._draw_headers(y_end)
        # tieu de va lifeline phai nam duoi cung de nhan (nen trang) che duoc no
        self.cells = self.cells + body
        return y_end

    def _items(self, items, depth, bounds):
        for it in items:
            if isinstance(it, Frag):
                self._frag(it, depth, bounds)
            elif it["t"] == "msg":
                self._msg(it)
            else:
                self._note(it)

    def _prefix(self):
        if not self.auto:
            return "", 0
        self.num += 1
        return "%d. " % self.num, len("%d. " % self.num)

    def _msg(self, it):
        a, b = self.parts[it["a"]], self.parts[it["b"]]
        prefix, plen = self._prefix()
        style_line = "html=1;strokeColor=#2b2b2b;strokeWidth=1;"
        style_line += ("dashed=1;dashPattern=6 3;endArrow=open;endFill=0;endSize=7;" if it["ret"]
                       else "endArrow=block;endFill=1;endSize=7;")
        if it["a"] == it["b"]:
            lines = wrap(it["text"], 210 - plen * CH)
            hh = max(26, len(lines) * LINE_H)
            ya = self.y + 5
            self.edge(style_line, (a["cx"], ya), (a["cx"], ya + 18),
                      [(a["cx"] + 36, ya), (a["cx"] + 36, ya + 18)])
            self._label(prefix, lines, a["cx"] + 42, self.y + 5 + 9 - len(lines) * LINE_H / 2,
                        210, "left")
            self.y += hh + 14
            return
        x1, x2 = a["cx"], b["cx"]
        span = abs(x2 - x1)
        lines = wrap(it["text"], span - 14 - plen * CH)
        width = min(span - 8, max(len(l) for l in lines) * CH + 24 + plen * CH)
        lx = min(x1, x2) + (span - width) / 2
        self._label(prefix, lines, lx, self.y, width, "center")
        ya = self.y + len(lines) * LINE_H + 8
        self.edge(style_line, (x1, ya), (x2, ya))
        self.y = ya + 14

    def _label(self, prefix, lines, x, y, w, align):
        body = "<br>".join(esc(l) for l in lines)
        if prefix:
            body = "<b>%s</b>%s" % (esc(prefix), body)
        self.vertex(body,
                    "text;html=1;align=%s;verticalAlign=bottom;whiteSpace=nowrap;fontSize=%d;fillColor=#ffffff;"
                    "strokeColor=none;spacing=0;spacingLeft=2;spacingRight=2;spacingTop=0;spacingBottom=0;"
                    "fontColor=%s;overflow=visible" % (align, FONT, C_TEXT),
                    x, y, w, len(lines) * LINE_H + 2)

    def _note(self, it):
        ps = self.parts
        if it["pos"] == "over":
            xs = [ps[i]["cx"] for i in it["who"]]
            x1, x2 = min(xs), max(xs)
            w = max(x2 - x1 + 130, 200)
            x = (x1 + x2) / 2 - w / 2
        elif it["pos"] == "right of" and it["who"][0] != len(ps) - 1:
            x, w = ps[it["who"][0]]["cx"] + 12, 210
        else:
            w = 210
            x = ps[it["who"][0]]["cx"] - 12 - w
        lines = wrap(it["text"], w - 16)
        h = len(lines) * LINE_H + 10
        body = "<br>".join(esc(l) for l in lines)
        self.vertex(body,
                    "shape=note;size=8;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fontSize=10;"
                    "fillColor=#fff2cc;strokeColor=#d6b656;fontColor=%s;spacing=3" % C_TEXT,
                    x, self.y + 2, w, h)
        self.y += h + 10

    def _frag(self, fr, depth, bounds):
        ps = self.parts
        inv = involved([fr])
        xs = [ps[i]["cx"] for i in inv]
        pad = 24 + 12 * subdepth(fr)
        x1, x2 = min(xs) - pad, max(xs) + pad
        sr = self_right([fr], ps)
        if sr:
            x2 = max(x2, sr + 12 * subdepth(fr))
        if x2 - x1 < 260:
            mid = (x1 + x2) / 2
            x1, x2 = mid - 130, mid + 130
        if bounds:
            x1, x2 = max(x1, bounds[0] + 8), min(x2, bounds[1] - 8)
        w = x2 - x1
        y0 = self.y + 2
        tagw = len(fr.kind) * 8 + 16
        self.y = y0
        for bi, (cond, sub) in enumerate(fr.branches):
            cond_txt = ("[%s]" % cond) if cond else ""
            avail = w - (tagw + 14 if bi == 0 else 14)
            lines = wrap(cond_txt, avail) if cond_txt else []
            if bi > 0:
                self.y += 3
                self.edge("endArrow=none;dashed=1;dashPattern=6 4;html=1;strokeColor=#6b6b6b;strokeWidth=1",
                          (x1, self.y), (x2, self.y))
            head_h = max(18, len(lines) * LINE_H + 4) if (bi == 0 or lines) else 0
            if lines:
                self._cond_label(lines, x1 + (tagw + 6 if bi == 0 else 6), self.y + 2,
                                 avail, head_h)
            self.y += head_h + 4
            self._items(sub, depth + 1, (x1, x2))
            self.y += 2
        y1 = self.y + 4
        self.vertex("", "rounded=0;html=1;fillColor=none;strokeColor=#4a4a4a;strokeWidth=1.2;dashed=0",
                    x1, y0, w, y1 - y0)
        self.vertex(fr.kind, "shape=umlFrame;whiteSpace=wrap;html=1;fontSize=10;fontStyle=1;width=%d;height=16;"
                    "fillColor=#ececec;strokeColor=#4a4a4a;boundedLbl=1;" % tagw, x1, y0, tagw, 16)
        self.y = y1 + 8

    def _cond_label(self, lines, x, y, w, h):
        body = "<br>".join(esc(l) for l in lines)
        self.vertex(body,
                    "text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;fontSize=10;fontStyle=2;"
                    "fillColor=#ffffff;strokeColor=none;spacing=0;spacingLeft=2;fontColor=#3a3a3a",
                    x, y, w, h)


def render_page(key, title, mmd_text, gap=GAP):
    parts, root, auto = parse(mmd_text)
    r = Renderer(key, parts, root, auto, gap)
    r.run()
    return title, "\n".join(r.cells)


def write_drawio(pages, path):
    out = io.StringIO()
    out.write('<mxfile host="Claude" type="device">\n')
    for i, (title, cells) in enumerate(pages, start=1):
        out.write('  <diagram id="sd%d" name="%s">\n' % (i, esc(title)))
        out.write('    <mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" '
                  'connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1169" pageHeight="827" '
                  'math="0" shadow="0" adaptiveColors="auto">\n      <root>\n'
                  '        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n')
        out.write(cells + "\n")
        out.write('      </root>\n    </mxGraphModel>\n  </diagram>\n')
    out.write('</mxfile>\n')
    with io.open(path, "w", encoding="utf-8") as fh:
        fh.write(out.getvalue())


if __name__ == "__main__":
    src_dir, out_path = sys.argv[1], sys.argv[2]
    specs = sys.argv[3:]
    pages = []
    for spec in specs:
        name, title = spec.split("=", 1)
        gap = GAP
        if ":" in name:
            name, g = name.split(":")
            gap = int(g)
        with io.open(os.path.join(src_dir, name + ".mmd"), encoding="utf-8") as fh:
            pages.append(render_page(name.replace("-", ""), title, fh.read(), gap))
    write_drawio(pages, out_path)
    print("ghi %s (%d trang)" % (out_path, len(pages)))
