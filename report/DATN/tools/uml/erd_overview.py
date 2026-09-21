# -*- coding: utf-8 -*-
"""Ban do module cua CSDL: moi module la mot hop liet ke cac bang, canh noi la cac khoa ngoai
tong hop giua hai module (bo qua hai bang trung tam users va branches)."""
import make_erd
from uml_class import Cls, Diagram

HUBS = ("users", "branches")


def overview_modules(key, title, tables):
    d = Diagram(key, title)
    by_mod = {}
    for name, mod in make_erd.MODULE_OF.items():
        by_mod.setdefault(mod, []).append(name)
    hub_refs = {h: sum(1 for t in tables.values() for f in t.fks if f[1] == h) for h in HUBS}
    for mod, (label, _fill, _stroke) in make_erd.MODULES.items():
        names = sorted(by_mod[mod], key=lambda n: (n not in HUBS, n))
        rows = [n + ("  (bảng trung tâm)" if n in HUBS else "") for n in names]
        notes = ["%s: được %d khóa ngoại trỏ tới" % (h, hub_refs[h]) for h in HUBS if h in names]
        d.add(Cls(mod, "%s (%d bảng)" % (label, len(names)), rows, kind="t_" + mod,
                  note=notes[0] if notes else None, minw=250))
    # gop cac khoa ngoai giua hai module khac nhau (bo canh toi bang trung tam)
    agg = {}
    for child in tables.values():
        for col, rt, _rc, _od in child.fks:
            if rt in HUBS:
                continue
            pm, cm = make_erd.MODULE_OF[rt], make_erd.MODULE_OF[child.name]
            if pm != cm:
                agg.setdefault((pm, cm), set()).add(col)
    for (pm, cm), cols in sorted(agg.items()):
        d.link(pm, cm, "assoc", label=", ".join(sorted(cols)))
    return d
