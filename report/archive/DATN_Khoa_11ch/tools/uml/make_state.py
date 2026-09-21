# -*- coding: utf-8 -*-
"""2 so do trang thai: don dat cho (BookingStateMachine) va giao dich thanh toan (PaymentStatus).

Cac chuyen trang thai lay tu BookingStateMachine.ALLOWED va cac cho gan PaymentStatus trong service.
"""
from uml_grid import Grid

TERMINAL = dict(thick=True, fill="#f5f5f5", stroke="#333333", bold=True)
ACTIVE = dict(fill="#dae8fc", stroke="#6c8ebf", bold=True)
LEGACY = dict(fill="#f5f5f5", stroke="#999999", dashed=True, bold=True)


def st(g, nid, text, col, row, **kw):
    g.node(nid, "state", text, col, row, h=58, **kw)


# ============================================================================ trang thai don dat cho
def state_booking():
    g = Grid("st1", "Sơ đồ trạng thái của đơn đặt chỗ", colw=230, rowh=112)
    g.node("S", "start", "", 1, 0)
    st(g, "PEND", "PENDING_PAYMENT\nChờ thanh toán", 1, 1, **ACTIVE)
    st(g, "CONF", "CONFIRMED\nĐã xác nhận", 1, 2.5, **ACTIVE)
    st(g, "CHKI", "CHECKED_IN\nĐang sử dụng", 1, 4.0, **ACTIVE)
    st(g, "COMP", "COMPLETED\nHoàn tất", 1, 5.5, **TERMINAL)
    st(g, "EXPI", "EXPIRED\nHết hạn giữ chỗ", 2.85, 1.0, **TERMINAL)
    st(g, "CANC", "CANCELLED\nĐã hủy", 2.85, 2.0, **TERMINAL)
    st(g, "NOSH", "NO_SHOW\nKhông đến", 2.85, 3.05, **TERMINAL)
    st(g, "CHKO", "CHECKED_OUT\n(trạng thái cũ)", 2.85, 5.5, **LEGACY)
    g.node("N1", "note", "Trạng thái cuối (viền đậm): COMPLETED, CANCELLED, EXPIRED, NO_SHOW.\n"
           "Mọi lần đổi trạng thái đều đi qua BookingStateMachine; chuyển trái quy tắc bị chặn.",
           2.85, 4.2, dashed=True, fill="#fff2cc", stroke="#d6b656", h=84, w=230)
    e = g.edge
    e("S", "PEND", "tạo đơn", sa="b", sb="t")
    e("PEND", "CONF", "thanh toán thành công\nhoặc tổng tiền bằng 0", sa="b@0.3", sb="t@0.3")
    e("PEND", "EXPI", "quá hạn giữ chỗ\n15 phút", sa="r", sb="l")
    e("PEND", "CANC", "khách hủy trước\nkhi thanh toán", sa="b@0.85", sb="l")
    e("CONF", "CHKI", "check-in", sa="b@0.3", sb="t@0.3")
    e("CHKI", "CONF", "check-out giữa kỳ\n(gói nhiều ngày)", sa="t@0.72", sb="b@0.72")
    e("CHKI", "COMP", "check-out; tự check-out quá hạn;\nbảo trì phủ hết đơn", sa="b", sb="t")
    e("CONF", "COMP", "gói nhiều ngày đã dùng,\nhết hạn", sa="l", sb="l", points=[(-0.15, 2.5), (-0.15, 5.5)])
    e("CONF", "CANC", "khách hoặc nhân viên hủy;\nbảo trì phủ hết đơn", sa="r@0.25", sb="b")
    e("CONF", "NOSH", "hết giờ mà chưa\ntừng check-in", sa="r@0.75", sb="l")
    e("CHKO", "COMP", "đóng đơn (cũ)", sa="l", sb="r", dashed=True)
    return g


# ============================================================================ trang thai giao dich thanh toan
def state_payment():
    g = Grid("st2", "Sơ đồ trạng thái của giao dịch thanh toán", colw=210, rowh=112)
    g.zone("ZP", "Chưa hoàn tất", 2, 1, 2, 2.4, fill="#fff2cc", stroke="#d6b656",
           opacity=45, font=11)
    g.node("S1", "start", "", 2, 0.05)
    g.node("S2", "start", "", 3.9, 4.0)
    st(g, "INIT", "INITIATED\nMới tạo", 2, 1.15, **ACTIVE)
    st(g, "PEND", "PENDING\nĐã có liên kết thanh toán", 2, 2.3, **ACTIVE)
    st(g, "PAID", "PAID\nĐã thanh toán", 2, 4.0, fill="#d5e8d4", stroke="#82b366", bold=True)
    st(g, "REFU", "REFUNDED\nĐã hoàn tiền", 2, 5.5, **TERMINAL)
    st(g, "EXPI", "EXPIRED\nHết hạn", 0.05, 1.3, **TERMINAL)
    st(g, "CANC", "CANCELLED\nĐã hủy", 0.05, 2.4, **TERMINAL)
    st(g, "FAIL", "FAILED\nThất bại", 3.9, 1.7, **TERMINAL)
    g.node("N1", "note", "Khung vàng: đơn còn giữ chỗ, tối đa 15 phút. AUTHORIZED có trong kiểu liệt kê nhưng mã hiện chưa gán ở đâu.\n"
           "Hoàn tiền một phần: giao dịch vẫn PAID, chỉ ghi thời điểm hoàn.",
           3.9, 5.5, dashed=True, fill="#fff2cc", stroke="#d6b656", h=132, w=230)
    e = g.edge
    e("S1", "INIT", "tạo giao dịch trực tuyến\n(PayOS, MoMo)", sa="b", sb="t")
    e("INIT", "PEND", "tạo liên kết\nthanh toán thành công", sa="b", sb="t")
    e("INIT", "FAIL", "tạo liên kết lỗi\n(MoMo)", sa="r", sb="l")
    e("PEND", "FAIL", "webhook hoặc trang trả về\nbáo lỗi", sa="r", sb="b")
    e("PEND", "PAID", "webhook (mã 00) hoặc trang trả\nvề xác nhận thành công", sa="b", sb="t")
    e("ZP", "EXPI", "đơn hết hạn giữ chỗ", sa="l@0.25", sb="r")
    e("ZP", "CANC", "đơn bị hủy", sa="l@0.7", sb="r")
    e("S2", "PAID", "thu tiền mặt tại quầy\n(tạo sẵn ở PAID)", sa="b", sb="r")
    e("PAID", "REFU", "hoàn tiền được xác nhận\n(số hoàn ≥ số đã thu)", sa="b", sb="t")
    return g


STATE = [
    (state_booking, "st-1-dondatcho", "Trạng thái của đơn đặt chỗ"),
    (state_payment, "st-2-thanhtoan", "Trạng thái của giao dịch thanh toán"),
]
