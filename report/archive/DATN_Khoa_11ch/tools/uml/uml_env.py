# -*- coding: utf-8 -*-
"""Tien ich dung chung cho cac bo sinh so do: tim draw.io, chay ELK, xuat PNG, gop trang.

Dat bien moi truong DRAWIO_EXE neu draw.io khong nam o vi tri mac dinh.
"""
import io
import os
import re
import shutil
import struct
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.abspath(os.path.join(HERE, "..", ".."))          # report/DATN
IMAGES = os.path.join(REPORT, "Images")


def find_drawio():
    env = os.environ.get("DRAWIO_EXE")
    if env and os.path.exists(env):
        return env
    candidates = [
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "draw.io", "draw.io.exe"),
        "C:/Program Files/draw.io/draw.io.exe",
        "/Applications/draw.io.app/Contents/MacOS/draw.io",
        shutil.which("drawio") or "",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    raise SystemExit("Khong tim thay draw.io. Dat bien moi truong DRAWIO_EXE tro toi file thuc thi.")


DRAWIO = find_drawio()

# ELK dan trang theo lop, canh vuong goc
ELK = ('[{"layout":"elkLayered","config":{"elk.direction":"%s","elk.spacing.nodeNode":%d,'
       '"elk.layered.spacing.nodeNodeBetweenLayers":%d,"elk.spacing.edgeEdge":18,"elk.spacing.edgeNode":26,'
       '"elk.edgeRouting":"ORTHOGONAL","edgeStyle":"orthogonal"}}]')


def elk_layout(src, dst, direction="DOWN", node_gap=50, layer_gap=90):
    """Chay ELK tren file .drawio `src`, ghi ket qua ra `dst`."""
    subprocess.run([DRAWIO, "-x", "-f", "xml", "--layout", ELK % (direction, node_gap, layer_gap), "-o", dst, src],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120, check=False)
    if not os.path.exists(dst):
        raise RuntimeError("ELK khong tao duoc " + dst)


def export_png(drawio_file, png_file, page=None, scale=2, border=14):
    cmd = [DRAWIO, "-x", "-f", "png", "-e", "-b", str(border), "-s", str(scale)]
    if page:
        cmd += ["-p", str(page)]
    cmd += ["-o", png_file, drawio_file]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120, check=False)
    if not os.path.exists(png_file):
        raise RuntimeError("Khong xuat duoc " + png_file)
    return png_size(png_file)


def png_size(path):
    with open(path, "rb") as fh:
        fh.read(16)
        return struct.unpack(">II", fh.read(8))


def merge_pages(page_files, titles, out_path):
    """Gop nhieu file .drawio mot trang thanh mot file nhieu trang."""
    blocks = []
    for path, title in zip(page_files, titles):
        text = io.open(path, encoding="utf-8").read()
        m = re.search(r"<diagram\b.*?</diagram>", text, re.S)
        if not m:
            raise RuntimeError("khong co <diagram> trong " + path)
        block = re.sub(r'(<diagram\b[^>]*?\bname=")[^"]*(")',
                       lambda mm: mm.group(1) + title.replace("&", "&amp;").replace('"', "&quot;") + mm.group(2),
                       m.group(0), count=1)
        blocks.append(block)
    io.open(out_path, "w", encoding="utf-8").write(
        '<mxfile host="Claude" type="device">\n' + "\n".join(blocks) + "\n</mxfile>\n")
