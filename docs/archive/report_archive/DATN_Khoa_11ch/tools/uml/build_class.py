# -*- coding: utf-8 -*-
"""Dung 11 class diagram -> Images/Chuong6/cospace-class.drawio + cd-*.png

    python build_class.py            # dung tat ca
    python build_class.py cd03 cd09  # chi dung mot vai trang (de thu)
"""
import os
import shutil
import sys
import tempfile

import uml_env
from make_class import ORDER

USE = "«use»"


def build_one(key, fn, tmp):
    dg = fn()
    dg.grid(4)
    # so do tang nghiep vu dan tu trai sang phai; bo nhan <<use>> lap lai (mui ten net dut da du y nghia)
    direction = "RIGHT" if key >= "cd07" else "DOWN"
    for e in dg.edges:
        if e.label == USE:
            e.label = ""
    plain = os.path.join(tmp, key + "_plain.drawio")
    laid = os.path.join(tmp, key + "_laid.drawio")
    final = os.path.join(tmp, key + ".drawio")
    dg.save_plain(plain)
    uml_env.elk_layout(plain, laid, direction)
    dg.finalize(laid, final)
    return final


def main(only):
    dest = os.path.join(uml_env.IMAGES, "Chuong6")
    os.makedirs(dest, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="cospace_cd_")
    pages, titles = [], []
    for key, fn, name, title in ORDER:
        if only and key not in only:
            continue
        final = build_one(key, fn, tmp)
        w, h = uml_env.export_png(final, os.path.join(dest, name + ".png"))
        print("%-22s %5d x %5d" % (name, w // 2, h // 2))
        pages.append(final)
        titles.append(title)
    if not only:
        uml_env.merge_pages(pages, titles, os.path.join(dest, "cospace-class.drawio"))
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main(set(sys.argv[1:]))
