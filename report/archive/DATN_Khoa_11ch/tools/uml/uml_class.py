# -*- coding: utf-8 -*-
"""Sinh class diagram (UML) dang .drawio: moi lop la MOT o HTML, canh noi giua cac lop
co boi so o hai dau.

Quy trinh (vi draw.io do kich thuoc o theo do dai chuoi nhan HTML nen ELK lam phinh o):
  1. save_plain()  : nhan chi la ten lop  -> ELK dan trang theo dung kich thuoc hinh hoc
  2. drawio --layout ...                  : ELK sap xep va dinh tuyen canh vuong goc
  3. finalize()    : gan lai nhan HTML day du (thuoc tinh, phuong thuc) va nhan boi so
"""
import html
import io
import re

LINE = 15          # chieu cao moi dong thuoc tinh / phuong thuc
HEAD = 30          # tieu de lop
HEAD_ST = 46       # tieu de lop co stereotype
PAD = 10
CHW = 6.1          # do rong trung binh mot ky tu o co chu 11px

FILL = {"class": "#dae8fc", "enum": "#fff2cc", "ref": "#f5f5f5", "svc": "#d5e8d4", "util": "#e1d5e7"}
STROKE = {"class": "#6c8ebf", "enum": "#d6b656", "ref": "#8a8a8a", "svc": "#82b366", "util": "#9673a6"}


def esc(s):
    return html.escape(s, quote=True)


class Cls:
    def __init__(self, cid, name, attrs=(), methods=(), kind="class", stereo=None, note=None, minw=150):
        self.cid, self.name, self.kind = cid, name, kind
        self.attrs, self.methods, self.stereo, self.note = list(attrs), list(methods), stereo, note
        self.minw = minw
        self.x = 0
        self.y = 0

    def size(self):
        rows = list(self.attrs) + list(self.methods) + ([self.note] if self.note else [])
        widest = max([len(self.name) * 7.4 + 8] + [len(r) * CHW + 8 for r in rows] +
                     ([len(self.stereo) * CHW + 8] if self.stereo else []))
        w = max(self.minw, widest + 2 * PAD)
        head = HEAD_ST if self.stereo else HEAD
        h = head + PAD - 2
        if self.attrs:
            h += len(self.attrs) * LINE
        if self.methods:
            h += 10 + len(self.methods) * LINE
        if self.note:
            h += 8 + LINE
        if not self.attrs and not self.methods and not self.note:
            h += 4
        return round(w), round(h)

    def label(self):
        st = ""
        if self.stereo:
            st = '<div style="text-align:center;font-size:10px;line-height:13px;">«%s»</div>' % esc(self.stereo)
        title = "<b>%s</b>" % esc(self.name)
        if self.kind == "ref":
            title = "<i>%s</i>" % title
        out = '<div style="text-align:center;line-height:16px;margin-top:4px;">%s%s</div>' % (st, title)

        def body(rows):
            return ('<div style="text-align:left;line-height:%dpx;margin-left:6px;">%s</div>'
                    % (LINE, "<br>".join(esc(r) for r in rows)))

        if self.attrs:
            out += '<hr size="1" style="border-style:solid;margin:3px 0 2px 0;"/>' + body(self.attrs)
        if self.methods:
            out += '<hr size="1" style="border-style:solid;margin:3px 0 2px 0;"/>' + body(self.methods)
        if self.note:
            out += ('<hr size="1" style="border-style:dashed;margin:3px 0 2px 0;"/>'
                    '<div style="text-align:left;line-height:%dpx;margin-left:6px;font-style:italic;">%s</div>'
                    % (LINE, esc(self.note)))
        return out


class Edge:
    def __init__(self, src, dst, kind="assoc", m_src="", m_dst="", label=""):
        self.src, self.dst, self.kind = src, dst, kind
        self.m_src, self.m_dst, self.label = m_src, m_dst, label


ESTYLE = {
    "assoc": "endArrow=none;startArrow=none;",
    "dep": "endArrow=open;endFill=0;endSize=8;dashed=1;dashPattern=6 4;",
    "agg": "startArrow=diamondThin;startFill=0;startSize=12;endArrow=none;",
    "comp": "startArrow=diamondThin;startFill=1;startSize=12;endArrow=none;",
    "inherit": "endArrow=block;endFill=0;endSize=12;",
    "realize": "endArrow=block;endFill=0;endSize=12;dashed=1;dashPattern=6 4;",
}


class Diagram:
    def __init__(self, key, title):
        self.key, self.title = key, title
        self.classes, self.edges = [], []

    def add(self, cls):
        self.classes.append(cls)
        return cls

    def link(self, *a, **k):
        self.edges.append(Edge(*a, **k))

    def grid(self, cols, gap_x=110, gap_y=90, x0=30, y0=30):
        """Xep so bo theo luoi lam diem xuat phat cho ELK."""
        col_h = [y0] * cols
        for i, c in enumerate(self.classes):
            col = i % cols
            w, h = c.size()
            c.x = x0 + col * (260 + gap_x)
            c.y = col_h[col]
            col_h[col] += h + gap_y

    def _eid(self, i):
        return "%s_e%d" % (self.key, i)

    def xml(self, plain=False):
        out = []
        for c in self.classes:
            w, h = c.size()
            extra = "dashed=1;" if c.kind == "ref" else ""
            style = ("html=1;whiteSpace=wrap;overflow=fill;verticalAlign=top;align=left;fontSize=11;"
                     "fontColor=#1f1f1f;fillColor=%s;strokeColor=%s;strokeWidth=1.2;%s"
                     % (FILL[c.kind], STROKE[c.kind], extra))
            val = c.name if plain else c.label()
            out.append('        <mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">\n'
                       '          <mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry" />\n'
                       '        </mxCell>' % (c.cid, esc(val), style, c.x, c.y, w, h))
        for i, e in enumerate(self.edges):
            style = ("edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;html=1;strokeColor=#333333;"
                     "strokeWidth=1.2;jettySize=auto;" + ESTYLE[e.kind])
            out.append('        <mxCell id="%s" value="" style="%s" edge="1" parent="1" source="%s" target="%s">\n'
                       '          <mxGeometry relative="1" as="geometry" />\n'
                       '        </mxCell>' % (self._eid(i), style, e.src, e.dst))
        if not plain:
            out.append(self.edge_labels())
        return "\n".join(out)

    def edge_labels(self):
        out = []
        lab = ("edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontSize=11;"
               "labelBackgroundColor=#ffffff;fontColor=#1f1f1f;")
        seen = {}
        for i, e in enumerate(self.edges):
            eid = self._eid(i)
            # hai canh song song giua cung mot cap hop: le nhan giua theo chieu doc de khong de len nhau
            k = seen.get((e.src, e.dst), 0)
            seen[(e.src, e.dst)] = k + 1
            # (nhan, vi tri doc canh, lech x, lech y): lech ra khoi duong noi de khong de len hinh thoi
            for tag, text, pos, ox, oy, extra in (("s", e.m_src, -0.9, 13, -9, ""), ("d", e.m_dst, 0.9, -13, -9, ""),
                                                  ("m", e.label, 0, 0, k * 16, "fontStyle=2;fontSize=10;")):
                if not text:
                    continue
                out.append('        <mxCell id="%s_%s" value="%s" style="%s%s" vertex="1" connectable="0" parent="%s">\n'
                           '          <mxGeometry x="%s" relative="1" as="geometry">\n'
                           '            <mxPoint x="%d" y="%d" as="offset" />\n'
                           '          </mxGeometry>\n'
                           '        </mxCell>' % (eid, tag, esc(text), lab, extra, eid, pos, ox, oy))
        return "\n".join(out)

    def _wrap(self, body):
        return ('<mxfile host="Claude" type="device">\n'
                '  <diagram id="%s" name="%s">\n'
                '    <mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" '
                'arrows="1" fold="1" page="0" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0" '
                'adaptiveColors="auto">\n      <root>\n'
                '        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n%s\n'
                '      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n'
                % (self.key, esc(self.title), body))

    def save_plain(self, path):
        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(self._wrap(self.xml(plain=True)))

    def save(self, path):
        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(self._wrap(self.xml()))

    def finalize(self, laid_out_path, out_path):
        """Nhan ket qua ELK (chi co ten lop), gan lai nhan HTML day du va nhan boi so."""
        text = io.open(laid_out_path, encoding="utf-8").read()
        for c in self.classes:
            # draw.io ghi lai thuoc tinh theo thu tu chu cai (id, parent, style, value...)
            pat = re.compile(r'(<mxCell id="%s"[^>]*?\svalue=")[^"]*(")' % re.escape(c.cid))
            text, n = pat.subn(lambda m: m.group(1) + esc(c.label()) + m.group(2), text, count=1)
            if n != 1:
                raise RuntimeError("khong tim thay o lop " + c.cid)
        text = text.replace("</root>", self.edge_labels() + "\n      </root>", 1)
        io.open(out_path, "w", encoding="utf-8").write(text)
