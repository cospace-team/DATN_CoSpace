# -*- coding: utf-8 -*-
"""5 so do hoat dong (swimlane) cua CoSpace, bam sat luong xu ly trong ma nguon Backend."""
from uml_grid import Grid

KHONG, CO = "Không", "Có"


def act(g, nid, text, col, row, lane, h=None, dashed=False):
    g.node(nid, "action", text, col, row, lane=lane, h=h or (66 if text.count("\n") >= 2 else 56), dashed=dashed)


def dec(g, nid, text, col, row, lane):
    g.node(nid, "decision", text, col, row, lane=lane)


def end(g, nid, col, row):
    g.node(nid, "end", "", col, row)


# ============================================================================ 1. dat cho + thanh toan truc tuyen
def act_booking_online():
    g = Grid("act1", "Sơ đồ hoạt động: đặt chỗ và thanh toán trực tuyến", colw=220, rowh=84)
    g.lane("Khách hàng", 0, 0, 0)
    g.lane("Hệ thống CoSpace", 1, 2, 1)
    g.lane("Cổng thanh toán\n(PayOS, MoMo)", 3, 3, 2)
    g.node("S", "start", "", 0, 0)
    act(g, "A1", "Chọn không gian, khung giờ,\nkhuyến mãi và dịch vụ thêm", 0, 1, 0)
    act(g, "A2", "Khóa tư vấn; kiểm tra tối đa 3 đơn\nchờ, chỗ trống và lịch bảo trì", 1, 2, 1)
    dec(g, "D1", "Hợp lệ?", 1, 3, 1)
    act(g, "E1", "Báo lỗi cho khách,\nkhông tạo đơn", 2, 3, 1)
    end(g, "X1", 2, 4)
    act(g, "A3", "Tính giá, tạo đơn PENDING_PAYMENT,\ngiữ chỗ 15 phút", 1, 4, 1)
    act(g, "A4", "Chọn PayOS VietQR\nhoặc MoMo", 0, 5, 0)
    act(g, "A5", "Tạo giao dịch INITIATED,\ngọi cổng lấy liên kết và mã QR", 1, 6, 1)
    act(g, "A6", "Hiển thị mã QR\nhoặc trang thanh toán", 3, 7, 2)
    act(g, "A7", "Quét mã và thanh toán\ntrong 15 phút", 0, 8, 0)
    dec(g, "D2", "Thanh toán\nthành công?", 3, 9, 2)
    act(g, "A8", "payment FAILED; hết 15 phút\nđơn EXPIRED, nhả chỗ", 2, 9, 1)
    end(g, "X2", 2, 10)
    act(g, "A9", "Gửi webhook\nkèm chữ ký", 3, 10, 2)
    act(g, "A10", "Xác minh chữ ký, bỏ qua nếu\nđã PAID, khóa dòng đơn", 1, 11, 1)
    dec(g, "D3", "Đơn còn\nPENDING_PAYMENT?", 1, 12, 1)
    act(g, "A11", "payment PAID, đơn CONFIRMED,\ngửi mã đặt chỗ", 1, 13, 1)
    act(g, "A12", "Tạo yêu cầu hoàn tiền\n(thanh toán về muộn)", 2, 12, 1)
    end(g, "X3", 2, 13)
    act(g, "A13", "Nhận mã đặt chỗ\nvà thông báo", 0, 13, 0)
    end(g, "X4", 0, 14)
    e = g.edge
    e("S", "A1"); e("A1", "A2"); e("A2", "D1")
    e("D1", "E1", KHONG); e("E1", "X1", sa="b", sb="t")
    e("D1", "A3", CO, sa="b", sb="t")
    e("A3", "A4"); e("A4", "A5"); e("A5", "A6"); e("A6", "A7"); e("A7", "D2")
    e("D2", "A8", KHONG, sa="l", sb="r"); e("A8", "X2", sa="b", sb="t")
    e("D2", "A9", CO, sa="b", sb="t")
    e("A9", "A10", sa="b", sb="r")
    e("A10", "D3", sa="b", sb="t")
    e("D3", "A11", CO, sa="b", sb="t")
    e("D3", "A12", KHONG, sa="r", sb="l"); e("A12", "X3", sa="b", sb="t")
    e("A11", "A13", sa="l", sb="r"); e("A13", "X4", sa="b", sb="t")
    return g


# ============================================================================ 2. dat cho tai quay + tien mat
def act_booking_counter():
    g = Grid("act2", "Sơ đồ hoạt động: đặt chỗ tại quầy và thanh toán tiền mặt", colw=220, rowh=84)
    g.lane("Khách hàng", 0, 0, 0)
    g.lane("Nhân viên quầy", 1, 1, 1)
    g.lane("Hệ thống CoSpace", 2, 3, 2)
    g.node("S", "start", "", 0, 0)
    act(g, "A1", "Đến quầy,\nyêu cầu thuê chỗ", 0, 1, 0)
    act(g, "A2", "Chọn hoặc tạo khách vãng lai\n(họ tên, số điện thoại), chọn\nkhông gian và khung giờ", 1, 2, 1)
    act(g, "A3", "Kiểm tra trùng lịch và bảo trì,\ntính giá, tạo đơn PENDING_PAYMENT\n(nguồn counter)", 2, 3, 2)
    dec(g, "D1", "Hợp lệ?", 2, 4, 2)
    act(g, "E1", "Báo lỗi cho\nnhân viên", 3, 4, 2)
    end(g, "X1", 3, 5)
    act(g, "A4", "Báo số tiền, thu tiền\nmặt của khách", 1, 5, 1)
    act(g, "A5", "Đưa tiền mặt", 0, 6, 0)
    act(g, "A6", "Xác nhận đã thu tiền\ntrên hệ thống", 1, 7, 1)
    dec(g, "D2", "Đơn còn trong\nhạn giữ chỗ 15 phút?", 2, 8, 2)
    act(g, "E2", "Từ chối: đơn đã hết hạn,\ncần đặt lại", 3, 8, 2)
    end(g, "X2", 3, 9)
    act(g, "A7", "Ghi payment (cash, PAID), đơn\nCONFIRMED, sinh mã đặt chỗ", 2, 9, 2)
    act(g, "A8", "Đưa mã đặt chỗ\ncho khách", 1, 10, 1)
    act(g, "A9", "Nhận mã đặt chỗ", 0, 11, 0)
    end(g, "X3", 0, 12)
    e = g.edge
    e("S", "A1"); e("A1", "A2"); e("A2", "A3"); e("A3", "D1", sa="b", sb="t")
    e("D1", "E1", KHONG); e("E1", "X1", sa="b", sb="t")
    e("D1", "A4", CO, sa="l", sb="t")
    e("A4", "A5"); e("A5", "A6"); e("A6", "D2")
    e("D2", "E2", KHONG); e("E2", "X2", sa="b", sb="t")
    e("D2", "A7", CO, sa="b", sb="t")
    e("A7", "A8"); e("A8", "A9"); e("A9", "X3", sa="b", sb="t")
    return g


# ============================================================================ 3. check-in / check-out
def act_checkin():
    g = Grid("act3", "Sơ đồ hoạt động: check-in và check-out", colw=220, rowh=84)
    g.lane("Khách hàng", 0, 0, 0)
    g.lane("Nhân viên quầy", 1, 1, 1)
    g.lane("Hệ thống CoSpace", 2, 3, 2)
    g.node("S", "start", "", 0, 0)
    act(g, "A1", "Đến chi nhánh,\nđưa mã đặt chỗ", 0, 1, 0)
    act(g, "A2", "Nhập hoặc quét\nmã đặt chỗ", 1, 2, 1)
    act(g, "A3", "Khóa dòng đơn; kiểm tra chi nhánh,\ntrạng thái, lượt check-in mở, khung giờ\n(từ 30 phút trước giờ bắt đầu)", 2, 3, 2)
    dec(g, "D1", "Hợp lệ?", 2, 4, 2)
    act(g, "E1", "Từ chối,\nbáo lý do", 3, 4, 2)
    end(g, "X1", 3, 5)
    act(g, "A4", "Tạo lượt check-in,\nđơn CHECKED_IN", 2, 5, 2)
    act(g, "A5", "Sử dụng không gian,\ngọi thêm dịch vụ nếu cần", 0, 6, 0)
    act(g, "A6", "Ghi nhận dịch vụ gọi thêm\nvào đơn (chưa thu tiền)", 1, 7, 1)
    act(g, "A7", "Kết thúc,\nyêu cầu check-out", 0, 8, 0)
    act(g, "A8", "Thực hiện check-out", 1, 9, 1)
    dec(g, "D2", "Còn nợ dịch vụ\ngọi thêm?", 2, 10, 2)
    act(g, "A9", "Thu tiền dịch vụ\ntại quầy", 1, 10, 1)
    dec(g, "D3", "Gói nhiều ngày\ncòn hạn?", 2, 11, 2)
    act(g, "A10", "Đơn về CONFIRMED,\nchờ ngày kế tiếp", 3, 11, 2)
    end(g, "X2", 3, 12)
    act(g, "A11", "Đơn COMPLETED; check-out sớm\nthì giải phóng chỗ ngay", 2, 12, 2)
    end(g, "X3", 2, 13)
    g.node("N1", "note", "Quá giờ kết thúc mà chưa check-out: hệ thống tự check-out sau thời gian ân hạn "
           "(tác vụ chạy mỗi 5 phút).", 0, 11.6, dashed=True, fill="#fff2cc", stroke="#d6b656", h=84)
    g.gap_after(10, 0.4)         # D2, D3 lien tiep
    e = g.edge
    e("S", "A1"); e("A1", "A2"); e("A2", "A3"); e("A3", "D1", sa="b", sb="t")
    e("D1", "E1", KHONG); e("E1", "X1", sa="b", sb="t")
    e("D1", "A4", CO, sa="b", sb="t")
    e("A4", "A5"); e("A5", "A6"); e("A6", "A7"); e("A7", "A8"); e("A8", "D2")
    e("D2", "A9", CO, sa="l", sb="r")
    e("A9", "A8", "thu xong,\ncheck-out lại", sa="t", sb="b", dashed=True)
    e("D2", "D3", KHONG, sa="b", sb="t")
    e("D3", "A10", CO, sa="r", sb="l"); e("A10", "X2", sa="b", sb="t")
    e("D3", "A11", KHONG, sa="b", sb="t"); e("A11", "X3", sa="b", sb="t")
    return g


# ============================================================================ 4. huy + hoan tien
def act_cancel():
    g = Grid("act4", "Sơ đồ hoạt động: hủy đặt chỗ và hoàn tiền", colw=220, rowh=84)
    g.lane("Khách hàng", 0, 0, 0)
    g.lane("Hệ thống CoSpace", 1, 2, 1)
    g.lane("Quản lý chi nhánh\nhoặc quản trị viên", 3, 3, 3)
    g.node("S", "start", "", 0, 0)
    act(g, "A1", "Gửi yêu cầu hủy,\nnhập lý do", 0, 1, 0)
    act(g, "A2", "Khóa dòng đơn; kiểm tra chủ đơn,\ntrạng thái và chưa hủy trước đó", 1, 2, 1)
    dec(g, "D1", "Được phép hủy?\n(chưa đến giờ bắt đầu)", 1, 3, 1)
    act(g, "E1", "Nhận thông báo từ chối,\nliên hệ quầy", 0, 3, 0)
    end(g, "X1", 0, 4)
    dec(g, "D2", "Đơn đã\nthanh toán?", 1, 4, 1)
    act(g, "A3", "Tra chính sách hủy: chi nhánh\ntrước, toàn cục sau, khớp theo phút", 1, 5, 1)
    act(g, "B3", "Chưa thanh toán:\nkhông có tiền hoàn", 2, 4, 1)
    act(g, "A4", "refund = min(tiền thuê × %\n+ dịch vụ đã trả, số đã thu);\nphạt = tổng − hoàn", 1, 6, 1)
    act(g, "A5", "Đơn CANCELLED; hủy giao dịch\nđang chờ; ghi bản ghi hủy", 1, 7, 1)
    dec(g, "D3", "Số tiền hoàn\nlớn hơn 0?", 1, 8, 1)
    act(g, "A6", "Nhận thông báo\nhủy thành công", 0, 8, 0)
    end(g, "X2", 0, 9)
    act(g, "A7", "Tạo yêu cầu hoàn tiền (pending),\nthông báo cho khách", 1, 9, 1)
    act(g, "A8", "Hoàn tiền trực tiếp cho khách,\nmở danh sách hoàn tiền", 3, 10, 3)
    dec(g, "D4", "Chấp nhận\nhoàn tiền?", 3, 11, 3)
    act(g, "A9", "refund PROCESSED, payment\nREFUNDED, thông báo khách", 2, 12, 1)
    act(g, "A10", "refund REJECTED (bắt buộc\nghi lý do), thông báo khách", 1, 12, 1)
    act(g, "A11", "Nhận thông báo\nkết quả hoàn tiền", 0, 13, 0)
    end(g, "X3", 0, 14)
    g.node("N1", "note", "Nhân viên quầy có thể hủy thay khách (bắt buộc lý do, có thể miễn phí phạt) và mọi lần hủy "
           "đều ghi nhật ký kiểm toán.", 3, 3, dashed=True, fill="#fff2cc", stroke="#d6b656", h=96)
    g.gap_after(3, 0.4)          # hai hinh thoi D1, D2 lien tiep: chua cho cho nhan "Co"
    e = g.edge
    e("S", "A1"); e("A1", "A2"); e("A2", "D1", sa="b", sb="t")
    e("D1", "E1", KHONG, sa="l", sb="r"); e("E1", "X1", sa="b", sb="t")
    e("D1", "D2", CO, sa="b", sb="t")
    e("D2", "A3", CO, sa="b", sb="t")
    e("D2", "B3", KHONG, sa="r", sb="l")
    e("A3", "A4", sa="b", sb="t")
    e("B3", "A5", sa="b", sb="r")
    e("A4", "A5", sa="b", sb="t")
    e("A5", "D3", sa="b", sb="t")
    e("D3", "A6", KHONG, sa="l", sb="r"); e("A6", "X2", sa="b", sb="t")
    e("D3", "A7", CO, sa="b", sb="t")
    e("A7", "A8", sa="r", sb="t")
    e("A8", "D4", sa="b", sb="t")
    e("D4", "A9", CO, sa="b", sb="r")
    e("D4", "A10", KHONG, sa="l", sb="t")
    e("A9", "A11", sa="b", sb="r")
    e("A10", "A11", sa="l", sb="t")
    e("A11", "X3", sa="b", sb="t")
    return g


# ============================================================================ 5. bao tri
def act_maintenance():
    g = Grid("act5", "Sơ đồ hoạt động: bảo trì không gian và xử lý đơn bị ảnh hưởng", colw=220, rowh=84)
    g.lane("Nhân viên", 0, 0, 0)
    g.lane("Hệ thống CoSpace", 1, 2, 1)
    g.lane("Khách hàng", 3, 3, 2)
    g.node("S", "start", "", 0, 0)
    act(g, "A1", "Chọn không gian, thời gian\nvà lý do bảo trì", 0, 1, 0)
    act(g, "A2", "Kiểm tra thời gian: kết thúc\nsau bắt đầu, không ở quá khứ", 1, 2, 1)
    dec(g, "D1", "Hợp lệ?", 1, 3, 1)
    act(g, "E1", "Nhận thông báo lỗi", 0, 3, 0)
    end(g, "X1", 0, 4)
    act(g, "A3", "Khóa tư vấn theo không gian\n(chung khóa với đặt chỗ)", 1, 4, 1)
    dec(g, "D2", "Trùng lịch bảo trì\nkhác?", 1, 5, 1)
    act(g, "E2", "Từ chối yêu cầu", 2, 5, 1)
    end(g, "X2", 2, 6)
    act(g, "A4", "Tìm các đơn chồng lấn (PENDING_PAYMENT,\nCONFIRMED, CHECKED_IN)", 1, 6, 1)
    dec(g, "D3", "Với mỗi đơn: bảo trì\nphủ hết thời gian đơn?", 1, 7, 1)
    act(g, "A5", "Giữ đơn, hoàn phần\nthời gian bị mất", 2, 7, 1)
    dec(g, "D4", "Khách đang\nsử dụng?", 1, 8, 1)
    act(g, "A6", "Check-out sớm, hoàn\nphần chưa dùng", 2, 8, 1)
    act(g, "A7", "Hủy đơn,\nhoàn 100 phần trăm", 1, 9, 1)
    act(g, "A8", "Nhận thông báo về\nđơn bị ảnh hưởng", 3, 10, 2)
    act(g, "A9", "Lưu lịch bảo trì (scheduled nếu\nchưa đến giờ, ngược lại active)", 1, 10, 1)
    act(g, "A10", "Nhận kết quả: số đơn\nbị ảnh hưởng", 0, 11, 0)
    end(g, "X3", 0, 12)
    g.gap_after(7, 0.4)          # D3, D4 lien tiep
    e = g.edge
    e("S", "A1"); e("A1", "A2"); e("A2", "D1", sa="b", sb="t")
    e("D1", "E1", KHONG, sa="l", sb="r"); e("E1", "X1", sa="b", sb="t")
    e("D1", "A3", CO, sa="b", sb="t"); e("A3", "D2", sa="b", sb="t")
    e("D2", "E2", CO, sa="r", sb="l"); e("E2", "X2", sa="b", sb="t")
    e("D2", "A4", KHONG, sa="b", sb="t"); e("A4", "D3", sa="b", sb="t")
    e("D3", "A5", KHONG, sa="r", sb="l")
    e("D3", "D4", CO, sa="b", sb="t")
    e("D4", "A6", CO, sa="r", sb="l")
    e("D4", "A7", KHONG, sa="b", sb="t")
    e("A5", "A8", sa="r", sb="t"); e("A6", "A8", sa="r", sb="t"); e("A7", "A8", sa="r", sb="t")
    e("A8", "A9", "sau khi xử lý mọi đơn", sa="l", sb="r")
    e("A9", "A10"); e("A10", "X3", sa="b", sb="t")
    return g


ACTIVITY = [
    (act_booking_online, "act-1-datcho-online", "Đặt chỗ và thanh toán trực tuyến"),
    (act_booking_counter, "act-2-datcho-quay", "Đặt chỗ tại quầy và thanh toán tiền mặt"),
    (act_checkin, "act-3-checkin", "Check-in và check-out"),
    (act_cancel, "act-4-huy-hoantien", "Hủy đặt chỗ và hoàn tiền"),
    (act_maintenance, "act-5-baotri", "Bảo trì không gian và xử lý đơn bị ảnh hưởng"),
]
