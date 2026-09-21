# -*- coding: utf-8 -*-
"""Dung cac so do dang luoi -> Images/Chuong*/ (hoat dong, trang thai, kien truc).

    python build_grid.py                # dung tat ca
    python build_grid.py activity       # chi mot nhom: activity | state | arch
    python build_grid.py act-3          # chi cac so do co ten bat dau bang tien to nay
"""
import importlib
import os
import shutil
import sys
import tempfile

import uml_env

# (ten module, thu muc dich mac dinh, ten file .drawio gop, thuoc tinh danh sach, ten nhom)
GROUPS = [
    ("make_activity", "Chuong5", "cospace-activity.drawio", "ACTIVITY", "activity"),
    ("make_state", "Chuong5", "cospace-state.drawio", "STATE", "state"),
    ("make_arch", "Chuong6", "cospace-architecture.drawio", "ARCH", "arch"),
]


def build_group(modname, folder, merged, attr, prefix):
    try:
        mod = importlib.import_module(modname)
    except ModuleNotFoundError:
        return
    tmp = tempfile.mkdtemp(prefix="cospace_grid_")
    pages, titles = [], []
    for item in getattr(mod, attr):
        fn, name, title = item[0], item[1], item[2]
        target = item[3] if len(item) > 3 else folder      # mot so hinh nam o thu muc chuong khac
        if prefix and not name.startswith(prefix):
            continue
        path = os.path.join(tmp, name + ".drawio")
        fn().save(path)
        out_dir = os.path.join(uml_env.IMAGES, target)
        os.makedirs(out_dir, exist_ok=True)
        w, h = uml_env.export_png(path, os.path.join(out_dir, name + ".png"))
        print("%-26s %5d x %5d  -> %s" % (name, w // 2, h // 2, target))
        pages.append(path)
        titles.append(title)
    if pages and not prefix:
        dest = os.path.join(uml_env.IMAGES, folder)
        os.makedirs(dest, exist_ok=True)
        uml_env.merge_pages(pages, titles, os.path.join(dest, merged))
    shutil.rmtree(tmp, ignore_errors=True)


def main(args):
    want = args[0] if args else None
    names = {g[4] for g in GROUPS}
    only_group = want if want in names else None
    prefix = None if (want is None or want in names) else want
    for modname, folder, merged, attr, group in GROUPS:
        if only_group and group != only_group:
            continue
        build_group(modname, folder, merged, attr, prefix)


if __name__ == "__main__":
    main(sys.argv[1:])
