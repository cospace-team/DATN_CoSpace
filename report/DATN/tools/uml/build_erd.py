# -*- coding: utf-8 -*-
"""Dung ERD tu lược do that -> Images/Chuong6/cospace-erd.drawio + erd-*.png

    python build_erd.py            # dung tat ca (1 ban do module + 6 trang chi tiet)
    python build_erd.py erd04      # chi dung mot trang
"""
import os
import shutil
import sys
import tempfile

import erd_overview
import make_erd
import uml_env


def main(only):
    tables = make_erd.load()
    dest = os.path.join(uml_env.IMAGES, "Chuong6")
    os.makedirs(dest, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="cospace_erd_")
    pages, titles = [], []
    for key, name, title, names, mode in make_erd.PAGES:
        if only and key not in only:
            continue
        if mode == "overview":
            d = erd_overview.overview_modules(key, title, tables)
            node_gap, layer_gap = 60, 110
        else:
            d = make_erd.build_page(key, title, tables, names)
            node_gap, layer_gap = 50, 85
        d.grid(4)
        plain = os.path.join(tmp, key + "_plain.drawio")
        laid = os.path.join(tmp, key + "_laid.drawio")
        final = os.path.join(tmp, key + ".drawio")
        d.save_plain(plain)
        uml_env.elk_layout(plain, laid, "DOWN", node_gap, layer_gap)
        d.finalize(laid, final)
        w, h = uml_env.export_png(final, os.path.join(dest, name + ".png"))
        print("%-22s %5d x %5d   (%d hop, %d canh)" % (name, w // 2, h // 2, len(d.classes), len(d.edges)))
        pages.append(final)
        titles.append(title)
    if not only:
        uml_env.merge_pages(pages, titles, os.path.join(dest, "cospace-erd.drawio"))
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main(set(sys.argv[1:]))
