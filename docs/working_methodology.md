# Phương Pháp Làm Việc Nhóm Hybrid (Waterfall + Agile)

Tài liệu này hướng dẫn cách phối hợp hiệu quả nhất giữa hai nhà phát triển có phong cách làm việc theo **quán tính (momentum-based)**, kết hợp giữa tư duy **Waterfall (thiết kế tài liệu & database trước)** và **Agile (phát triển backend/frontend cuốn chiếu)**.

---

## 1. Tối Ưu Hiệu Suất Cá Nhân (Dành cho Lập trình viên Quán tính)

Những người làm việc theo quán tính có sức ỳ lớn lúc bắt đầu, nhưng hiệu suất cực cao khi đã vào guồng. Để kích hoạt trạng thái này:

* **Phương pháp "Brain Dump & AI Draft" (Bạn đang áp dụng - Rất tốt):** 
  * Khi bắt đầu một task mới, thay vì suy nghĩ viết code thế nào, hãy mở khung chat AI và viết một đoạn "xả não" lộn xộn mô tả ý tưởng. Để AI viết bản thảo (draft) đầu tiên, sau đó bạn chỉ cần đọc và sửa lại.
* **Cây cầu Hemingway (Hemingway Bridge):**
  * Vào cuối ngày làm việc, **đừng cố hoàn thành 100%** một việc nhỏ. Hãy cố tình để lại một task cực kỳ dễ hoặc một dòng code dở dang (ví dụ: `// TODO: Thêm cột description vào đây`). 
  * Ngày hôm sau, bạn sẽ có ngay một điểm bắt đầu siêu dễ dàng để vượt qua sức ỳ ban đầu.
* **Quy tắc 5 phút:**
  * Cam kết với bản thân chỉ làm việc trong 5 phút. Nếu sau 5 phút vẫn lười, bạn có thể nghỉ. Thực tế, 90% trường hợp sau 5 phút bạn đã vào guồng và muốn làm tiếp.

---

## 2. Quy Trình Phối Hợp Hybrid: API-First
Sự kết hợp hoàn hảo giữa sở thích **Waterfall (của bạn)** và **Agile (của bạn bạn)**:

```
[Bạn: Waterfall]                               [Bạn của bạn: Agile]
Thiết kế DB & viết Docs API   ───►  Lấy spec Docs API  ───►  Code Backend cuốn chiếu
(Xong toàn bộ cho 1 module)        (Đã rõ cấu trúc đầu ra)     (Không cần lo thiết kế lại)
```

### Cách vận hành:
1. **Bạn (Waterfall):** Thiết kế database và viết chi tiết tài liệu API (Request/Response JSON) cho một module (ví dụ: `spaces` hoặc `bookings`) trong thư mục `docs/api-contracts/`.
2. **Bạn của bạn (Agile):** Nhìn vào tài liệu API đã chốt đó để triển khai code BE và DB tương ứng cho từng API một cách cuốn chiếu (Agile Sprints).
3. **Lợi ích:** Bạn thỏa mãn được việc thiết kế hệ thống có cấu trúc và tầm nhìn dài hạn; bạn của bạn có spec rõ ràng để code nhanh mà không phải đoán mò cấu trúc dữ liệu.

---

## 3. Giao Tiếp Nhóm Hiệu Quả (2 Người)

Những người làm việc theo quán tính rất ghét bị ngắt quãng (distract) bởi các cuộc họp vô nghĩa. Do đó, hãy áp dụng giao tiếp **Bất đối xứng (Asynchronous Communication)**:

* **Daily Standup qua Chat (5 phút mỗi ngày):**
  * Không họp video/gặp mặt trực tiếp hàng ngày. Mỗi người chỉ cần nhắn tin qua Zalo/Discord theo mẫu 3 dòng:
    1. Hôm qua đã làm: ...
    2. Hôm nay sẽ làm: ...
    3. Điểm nghẽn (nếu có): ...
* **Quy tắc "Không làm phiền" (Focus Block):**
  * Thiết lập các khoảng thời gian (ví dụ: 14h - 17h) cả hai cùng tắt thông báo để tập trung cao độ đi vào trạng thái hyper-focus.
* **Review Pull Request (PR):**
  * Khi merge code vào nhánh `main`, người này tạo PR và tag người kia vào review chéo. Đây là lúc hai bạn thực sự giao tiếp về mặt kỹ thuật và chất lượng code.

---

## 4. Quản Lý Tiến Độ Trực Quan (`task.md`)

Tạo một file check-list đơn giản tại thư mục gốc của dự án để cả 2 cùng theo dõi:
* Dùng ký hiệu `[ ]` cho việc chưa làm, `[/]` cho việc đang làm (đang chạy quán tính), và `[x]` cho việc đã xong.
* Cập nhật file này trước mỗi buổi làm việc.
