# -*- coding: utf-8 -*-
"""Dung 14 sequence diagram tu cac file sd/*.mmd -> Images/Chuong6/cospace-sequence.drawio + sd-*.png

Nguon la tap con cua Mermaid sequenceDiagram (participant, actor, ->>, -->>, Note, alt/else/opt/loop).
    python build_sequence.py            # dung tat ca
    python build_sequence.py sd-06      # chi dung cac file co ten bat dau bang tien to nay
"""
import io
import os
import sys

import uml_env
import uml_seq

SD = [
    ("sd-01-dangnhap", "Đăng nhập và làm mới phiên"),
    ("sd-02-xacthuc-api", "Xác thực và phân quyền mỗi yêu cầu API"),
    ("sd-03-datcho-kiemtra", "Tạo đơn đặt chỗ (1/2) - kiểm tra và khóa"),
    ("sd-04-datcho-luu", "Tạo đơn đặt chỗ (2/2) - tính giá và lưu đơn"),
    ("sd-05-thanhtoan", "Khởi tạo thanh toán"),
    ("sd-06-webhook", "Xử lý webhook thanh toán PayOS"),
    ("sd-07-huy", "Hủy đặt chỗ và tính hoàn tiền"),
    ("sd-08-duyet-hoantien", "Duyệt hoặc từ chối hoàn tiền"),
    ("sd-09-checkin-checkout", "Check-in và check-out"),
    ("sd-10-hethan-giucho", "Tự động giải phóng chỗ giữ quá hạn"),
    ("sd-11-dong-don", "Tự động đóng đơn hết giờ"),
    ("sd-12-baotri", "Tạo lịch bảo trì và xử lý đơn bị ảnh hưởng"),
    ("sd-13-chatbot-hoithoai", "Trợ lý ảo - hội thoại và gọi công cụ"),
    ("sd-14-chatbot-xacnhan", "Trợ lý ảo - xác nhận và thực hiện hành động"),
]


def main(prefixes):
    src = os.path.join(uml_env.HERE, "sd")
    dest = os.path.join(uml_env.IMAGES, "Chuong6")
    os.makedirs(dest, exist_ok=True)
    pages = []
    for name, title in SD:
        with io.open(os.path.join(src, name + ".mmd"), encoding="utf-8") as fh:
            pages.append(uml_seq.render_page(name.replace("-", ""), title, fh.read()))
    full = os.path.join(dest, "cospace-sequence.drawio")
    uml_seq.write_drawio(pages, full)
    for i, (name, _title) in enumerate(SD, start=1):
        if prefixes and not any(name.startswith(p) for p in prefixes):
            continue
        w, h = uml_env.export_png(full, os.path.join(dest, name + ".png"), page=i)
        print("%-26s %5d x %5d" % (name, w // 2, h // 2))


def build_race():
    """Hinh tuong tranh cua Chuong 3: mot trang rieng, dat trong Images/Chuong3."""
    src = os.path.join(uml_env.HERE, "sd", "race-condition.mmd")
    dest = os.path.join(uml_env.IMAGES, "Chuong3")
    os.makedirs(dest, exist_ok=True)
    with io.open(src, encoding="utf-8") as fh:
        page = uml_seq.render_page("race", "Tương tranh khi hai người cùng đặt một không gian", fh.read())
    full = os.path.join(dest, "cospace-race.drawio")
    uml_seq.write_drawio([page], full)
    w, h = uml_env.export_png(full, os.path.join(dest, "race-condition.png"), page=1)
    print("%-26s %5d x %5d  -> Chuong3" % ("race-condition", w // 2, h // 2))


if __name__ == "__main__":
    if sys.argv[1:] == ["race"]:
        build_race()
    else:
        main(sys.argv[1:])
