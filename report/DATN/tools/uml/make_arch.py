# -*- coding: utf-8 -*-
"""4 so do kien truc: mo hinh phan tang (Chuong 3), kien truc tong the, trien khai, kien truc giao dien (Chuong 6).

Chi ve nhung thanh phan da kiem chung trong ma nguon: FE chi dung Supabase cho xac thuc (khong Storage,
khong WebSocket); SVG so do mat bang luu trong PostgreSQL; tro ly ao tra ve qua luong SSE.
"""
from uml_grid import Grid

BLUE = dict(fill="#dae8fc", stroke="#6c8ebf")
GREEN = dict(fill="#d5e8d4", stroke="#82b366")
ORANGE = dict(fill="#ffe6cc", stroke="#d79b00")
PURPLE = dict(fill="#e1d5e7", stroke="#9673a6")
RED = dict(fill="#f8cecc", stroke="#b85450")
GREY = dict(fill="#f5f5f5", stroke="#666666")
YELLOW = dict(fill="#fff2cc", stroke="#d6b656")


def box(g, nid, text, col, row, colors, w=190, h=64, **kw):
    g.node(nid, "box", text, col, row, w=w, h=h, **colors, **kw)


def note(g, nid, text, col, row, w=300, h=64):
    g.node(nid, "note", text, col, row, w=w, h=h, dashed=True, **YELLOW)


# ============================================================================ 1. mo hinh phan tang (Chuong 3)
def arch_layers():
    g = Grid("ar1", "Mô hình kiến trúc phân tầng của ứng dụng web", colw=270, rowh=104, x0=30, y0=36)
    g.node("PRES", "box", "Tầng trình bày\n(Presentation)", 1, 0, w=240, h=66, **BLUE, bold=True)
    g.node("CTRL", "box", "Tầng điều khiển\n(Controller)", 1, 1, w=240, h=66, **GREEN, bold=True)
    g.node("SERV", "box", "Tầng nghiệp vụ\n(Service)", 1, 2, w=240, h=66, **ORANGE, bold=True)
    g.node("REPO", "box", "Tầng truy cập dữ liệu\n(Repository)", 1, 3, w=240, h=66, **PURPLE, bold=True)
    g.node("DB", "db", "Cơ sở dữ liệu\nPostgreSQL", 1, 4.05, w=170, h=84, **GREY, bold=True)
    note(g, "N0", "Ứng dụng React 18 + TypeScript trên trình duyệt: hiển thị và thu thập dữ liệu, "
         "không chứa quy tắc nghiệp vụ.", 2.6, 0, w=380, h=76)
    note(g, "N1", "26 controller REST: nhận yêu cầu, kiểm tra quyền (PreAuthorize, BranchAccessGuard), "
         "đổi qua lại DTO.", 2.6, 1, w=380, h=76)
    note(g, "N2", "Quy tắc nghiệp vụ, ranh giới giao dịch, khóa tư vấn, máy trạng thái của đơn; "
         "tác vụ định kỳ cũng gọi vào tầng này.", 2.6, 2, w=380, h=76)
    note(g, "N3", "Spring Data JPA (29 repository), truy vấn khóa dòng FOR UPDATE và truy vấn chồng lấn.",
         2.6, 3, w=380, h=76)
    note(g, "N4", "PostgreSQL trên Supabase: 30 bảng, ràng buộc CHECK và EXCLUDE (chống chồng lịch).",
         2.6, 4.05, w=380, h=76)
    box(g, "SCH", "Tác vụ định kỳ\n(Scheduler)", -0.35, 2, GREY, w=170, h=44)
    box(g, "EXT", "Dịch vụ bên thứ ba\nPayOS, MoMo, Gemini,\nSupabase Auth", -0.35, 3.6, GREY, w=170, h=78)
    e = g.edge
    e("PRES", "CTRL", "HTTPS, JSON, JWT", sa="b", sb="t")
    e("CTRL", "SERV", "gọi phương thức", sa="b", sb="t")
    e("SERV", "REPO", "gọi phương thức", sa="b", sb="t")
    e("REPO", "DB", "JDBC, SQL", sa="b", sb="t")
    e("SCH", "SERV", "", sa="r", sb="l@0.5")
    e("SERV", "EXT", "HTTPS", sa="l@0.95", sb="t")
    return g


# ============================================================================ 2. kien truc tong the (Chuong 6)
def arch_overview():
    g = Grid("ar2", "Kiến trúc tổng thể của hệ thống CoSpace", colw=215, rowh=102, x0=120, y0=44)
    g.zone("ZS", "Spring Boot 3 (Docker, Render)", 0, 1.25, 3, 2.75, **YELLOW, opacity=35)
    box(g, "FE", "Ứng dụng web React (tải từ Vercel)\nTrang theo 4 vai trò · sơ đồ SVG · trợ lý ảo · quét QR",
        1, 0, BLUE, w=430, h=66)
    box(g, "SEC", "Bảo mật\nJwtDecoder kép, PreAuthorize,\nBranchAccessGuard", 0, 2, GREEN, w=186, h=68)
    box(g, "CTL", "Controller REST\n/api/... (26 controller)", 1, 2, GREEN, w=186, h=68)
    box(g, "SVC", "Service nghiệp vụ\nđặt chỗ, thanh toán, hoàn tiền,\ncheck-in, trợ lý ảo", 2, 2, ORANGE, w=186, h=68)
    box(g, "REP", "Repository\nSpring Data JPA", 3, 2, PURPLE, w=186, h=68)
    box(g, "SCH", "Tác vụ định kỳ\n30 giây, 5 phút", 2, 1.3, GREY, w=150, h=44)
    box(g, "CAC", "Bộ nhớ đệm Caffeine\n(@Cacheable)", 3, 1.3, GREY, w=150, h=48)
    box(g, "AUTH", "Supabase Auth\nGoogle SSO, JWT ECC P-256", 0, 4.3, RED, w=200, h=66)
    box(g, "EXT", "Dịch vụ bên thứ ba\nPayOS (VietQR) · MoMo · Google Gemini", 1.46, 4.3, RED, w=330, h=66)
    g.node("DB", "db", "PostgreSQL (Supabase)\n30 bảng, Flyway", 3, 4.3, w=170, h=92, **GREY, bold=True)
    e = g.edge
    e("FE", "CTL", "HTTPS, JSON,\nBearer JWT, SSE", sa="b", sb="t")
    e("FE", "AUTH", "OAuth Google\n(đăng nhập)", sa="l", sb="l", points=[(-0.62, 0), (-0.62, 4.3)])
    e("SEC", "AUTH", "JWKS: kiểm tra\ntoken Supabase", sa="b", sb="t")
    e("SEC", "CTL", "", sa="r", sb="l")
    e("CTL", "SVC", "", sa="r", sb="l")
    e("SVC", "REP", "", sa="r", sb="l")
    e("SCH", "SVC", "", sa="b", sb="t")
    e("SVC", "CAC", "", sa="t@0.9", sb="l", dashed=True)
    e("REP", "DB", "JDBC (HikariCP,\npooler SSL)", sa="b", sb="t")
    e("SVC", "EXT", "HTTPS: tạo thanh toán,\ngọi Gemini", sa="b", sb="t@0.853")
    e("EXT", "CTL", "webhook, IPN", sa="t@0.2", sb="b", dashed=True)
    return g


# ============================================================================ 3. trien khai (Chuong 6 / 10)
def arch_deploy():
    g = Grid("ar3", "Sơ đồ triển khai của hệ thống CoSpace", colw=290, rowh=132, x0=40, y0=36)
    box(g, "VER", "Vercel (CDN)\nTệp tĩnh của Vite build, mọi đường dẫn\nrewrite về index.html; header bảo mật:\nCSP, X-Frame-Options, Trusted Types",
        0, 0, GREY, w=250, h=100)
    box(g, "SPA", "Trình duyệt chạy\nứng dụng React (SPA)", 1, 0, BLUE, w=200, h=66)
    box(g, "USR", "Người dùng\n(khách hàng, nhân viên,\nquản lý, quản trị)", 2, 0, BLUE, w=200, h=72)
    box(g, "REN", "Render Web Service (Docker)\nSpring Boot 3.1, JRE 21 Alpine\nchạy không phải root, cổng $PORT",
        1, 1.55, ORANGE, w=260, h=92)
    note(g, "N1", "Dockerfile 2 giai đoạn: maven:3.9.9-temurin-21 dựng jar, "
         "eclipse-temurin:21-jre-alpine chạy; MaxRAMPercentage=70, SerialGC.", 0, 1.55, w=250, h=104)
    box(g, "GHA", "GitHub Actions (keep-alive)\nGET /api/health mỗi 10 phút,\nchống máy chủ ngủ khi rảnh", 2, 1.55, GREY, w=230, h=80)
    box(g, "AUTH", "Supabase Auth\nGoogle SSO (trình duyệt đăng nhập,\nmáy chủ kiểm tra token bằng JWKS)", 0, 3.2, RED, w=250, h=82)
    g.node("DB", "db", "PostgreSQL (Supabase)\nqua pooler cổng 6543, SSL", 1, 3.2, w=180, h=98, **GREY, bold=True)
    box(g, "EXT", "PayOS · MoMo · Google Gemini", 2, 3.2, RED, w=230, h=66)
    e = g.edge
    e("VER", "SPA", "tải tệp tĩnh", sa="r", sb="l")
    e("USR", "SPA", "HTTPS", sa="l", sb="r")
    e("SPA", "REN", "HTTPS: /api/... JSON,\nBearer JWT, luồng SSE", sa="b", sb="t")
    e("REN", "AUTH", "JWKS", sa="b@0.12", sb="t")
    e("REN", "DB", "JDBC (HikariCP)", sa="b", sb="t")
    e("REN", "EXT", "HTTPS; webhook, IPN\nquay lại", sa="b@0.88", sb="t", start_arrow="block")
    e("GHA", "REN", "", sa="l", sb="r")
    return g


# ============================================================================ 4. kien truc giao dien (Chuong 6)
def arch_frontend():
    g = Grid("ar4", "Kiến trúc phía giao diện người dùng", colw=290, rowh=100, x0=30, y0=36)
    # cot 0.5 va 1.5 la tam cua hai hop hang 2; hop API rong 580 nen vach 25% va 75% trung tam hai hop do
    box(g, "ROUTE", "Định tuyến theo vai trò (App.tsx, React Router 7)\ncustomer · staff · branch_admin · super_admin\ntrang tải lười React.lazy",
        1, 0, BLUE, w=390, h=72)
    box(g, "PAGES", "Trang (pages) và bố cục\ncustomer · staff · branch-admin · admin,\nthanh điều hướng theo vai trò",
        1, 1, GREEN, w=390, h=72)
    box(g, "COMP", "Thành phần (components)\nui · floor-plan (xem, chỉnh SVG) · chatbot ·\nnotifications · staff · branch-admin", 0.5, 2, ORANGE, w=270, h=80)
    box(g, "HOOK", "Hooks và tiện ích\nuseFloorPlanEditor, useStableCallback,\nuseSEO, formatters, bookingPackage", 1.5, 2, ORANGE, w=270, h=80)
    box(g, "API", "Tầng truy cập API\nlib/: bookingApi, spaceApi, communityApi, chatbotApi, startPayment\napi/ (barrel index): addonApi, adminApi, loyaltyApi, refundApi, staffApi",
        1, 3, PURPLE, w=580, h=80)
    box(g, "CFG", "Cấu hình\nconfig/api.ts (VITE_API_BASE_URL)\ntrustedTypesPolicy (DOMPurify)", 0.5, 4, GREY, w=270, h=72)
    box(g, "SUPA", "lib/supabase.ts\nSupabase Auth (chỉ xác thực)", 1.5, 4, GREY, w=270, h=72)
    box(g, "CTX", "Ngữ cảnh (context)\nAuthContext: phiên và vai trò\nThemeProvider: giao diện sáng, tối", -0.6, 1, YELLOW, w=200, h=88)
    box(g, "BE", "Backend Spring Boot\nREST /api/... và luồng SSE", 2.75, 3, RED, w=190, h=66)
    box(g, "SAUTH", "Supabase Auth\n(Google SSO)", 2.75, 4, RED, w=190, h=62)
    e = g.edge
    e("ROUTE", "PAGES", "", sa="b", sb="t")
    e("PAGES", "COMP", "", sa="b@0.128", sb="t")
    e("PAGES", "HOOK", "", sa="b@0.872", sb="t")
    e("COMP", "API", "", sa="b", sb="t@0.25")
    e("HOOK", "API", "", sa="b", sb="t@0.75")
    e("API", "CFG", "", sa="b@0.25", sb="t")
    e("API", "SUPA", "", sa="b@0.75", sb="t")
    e("API", "BE", "HTTPS,\nBearer JWT", sa="r", sb="l")
    e("SUPA", "SAUTH", "OAuth", sa="r", sb="l")
    e("CTX", "PAGES", "", sa="r", sb="l", dashed=True)
    return g


ARCH = [
    (arch_layers, "arch-phantang", "Mô hình kiến trúc phân tầng", "Chuong3"),
    (arch_overview, "arch-tongthe", "Kiến trúc tổng thể", "Chuong6"),
    (arch_deploy, "arch-trienkhai", "Sơ đồ triển khai", "Chuong6"),
    (arch_frontend, "arch-frontend", "Kiến trúc phía giao diện", "Chuong6"),
]
