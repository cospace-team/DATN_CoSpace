# -*- coding: utf-8 -*-
"""Sinh Outro/BangAPI.tex: danh muc diem cuoi API doc truc tiep tu cac controller.

    python gen_api_appendix.py

Moi dong = (phuong thuc HTTP, duong dan day du, ten phuong thuc Java). Duong dan day du = duong dan goc
cua lop (@RequestMapping) + duong dan cua phuong thuc. Khi them hoac doi controller chi can chay lai.
"""
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CONTROLLERS = os.path.join(ROOT, "BE", "src", "main", "java", "com", "cospace", "app", "controller")
OUT = os.path.abspath(os.path.join(HERE, "..", "Outro", "BangAPI.tex"))

VERBS = {"Get": "GET", "Post": "POST", "Put": "PUT", "Patch": "PATCH", "Delete": "DELETE"}
ANNOT = re.compile(r"@(Get|Post|Put|Patch|Delete)Mapping\b(\((?P<args>[^)]*)\))?")
CLASS_MAP = re.compile(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(?P<p>[^\"]*)\"")
STRING = re.compile(r"\"([^\"]*)\"")
METHOD = re.compile(r"(?:public|protected|private)?\s*[\w<>\[\],.? ]+\s+(\w+)\s*\(")


def esc(text):
    out = []
    for ch in text:
        if ch in "_#%&$":
            out.append("\\" + ch)
        elif ch in "{}":
            out.append("\\" + ch)
        elif ch == "/":
            out.append("/\\allowbreak ")
        else:
            out.append(ch)
    return "".join(out)


def parse(path):
    with io.open(path, encoding="utf-8") as fh:
        lines = fh.read().split("\n")
    text = "\n".join(lines)
    base = ""
    m = CLASS_MAP.search(text.split("public class")[0]) if "public class" in text else None
    if m:
        base = m.group("p")
    rows = []
    i = 0
    while i < len(lines):
        line = lines[i]
        a = ANNOT.search(line)
        if a and not line.strip().startswith("//") and not line.strip().startswith("*"):
            args = a.group("args") or ""
            s = STRING.search(args)
            sub = s.group(1) if s else ""
            # ten phuong thuc: dong ke tiep khong phai chu thich
            # (chu thich @Caching nhieu dong nam giua @...Mapping va chu ky phuong thuc nen phai tim toi khi gap "public")
            name = ""
            for j in range(i + 1, min(i + 40, len(lines))):
                nxt = lines[j].strip()
                if nxt.startswith("public "):
                    mm = METHOD.search(nxt)
                    if mm:
                        name = mm.group(1)
                    break
                if ANNOT.search(nxt):
                    break
            full = (base + sub).replace("//", "/") or "/"
            rows.append((VERBS[a.group(1)], full, name))
        i += 1
    return base, rows


def main():
    entries = []
    for fn in sorted(os.listdir(CONTROLLERS)):
        if not fn.endswith("Controller.java"):
            continue
        base, rows = parse(os.path.join(CONTROLLERS, fn))
        if rows:
            entries.append((fn[:-5], rows))
    total = sum(len(r) for _, r in entries)
    out = []
    out.append("% Sinh tu dong boi tools/gen_api_appendix.py - khong sua tay.")
    out.append("{\\footnotesize")
    out.append("\\begin{longtable}{|p{1.5cm}|p{7.3cm}|p{5.0cm}|}")
    out.append("\\caption{Danh mục %d điểm cuối API, nhóm theo lớp điều khiển}\\label{tab:pl_api}\\\\" % total)
    out.append("\\hline")
    out.append("\\textbf{Phương thức} & \\textbf{Đường dẫn} & \\textbf{Hàm xử lý} \\\\")
    out.append("\\hline")
    out.append("\\endfirsthead")
    out.append("\\hline")
    out.append("\\textbf{Phương thức} & \\textbf{Đường dẫn} & \\textbf{Hàm xử lý} \\\\")
    out.append("\\hline")
    out.append("\\endhead")
    for cname, rows in entries:
        out.append("\\multicolumn{3}{|l|}{\\textbf{\\texttt{%s} (%d)}} \\\\" % (esc(cname), len(rows)))
        out.append("\\hline")
        for verb, path, name in rows:
            out.append("%s & \\texttt{%s} & \\texttt{%s} \\\\" % (verb, esc(path), esc(name)))
            out.append("\\hline")
    out.append("\\end{longtable}")
    out.append("}")
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out) + "\n")
    print("%d controller, %d diem cuoi -> %s" % (len(entries), total, OUT))


if __name__ == "__main__":
    main()
