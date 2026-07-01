# Use Case Specifications — Partner Matching Module

> **Module**: Partner Matching (Sprint 6)
> **Tham chiếu**: [SYSTEM_SPEC.md §3.8](file:///d:/DA/docs/SYSTEM_SPEC.md), [GOAL_decisions.md L6 & L7](file:///d:/DA/docs/business/GOAL_decisions.md)
> **Ngày**: 2026-06-30

---

## UC-MAT-01: Quản Lý Danh Mục Tags (Admin)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | System Admin |
| **Trigger** | Admin muốn thêm/sửa bộ Tag chuẩn của hệ thống |
| **Postcondition** | Record `tags` được cập nhật |

### Luồng Chính
```
1. Admin vào "Quản lý Tags"
2. Admin thêm tag mới:
   - name: "Frontend Development"
   - category: "skill" (hoặc 'interest', 'industry')
   - is_active: true
3. Hệ thống validate: name không trùng lặp (UNIQUE constraint).
4. Hệ thống lưu record vào `tags`.
```
> **Karpathy Guideline**: Simplicity First - KHÔNG cho User tự gõ free-text tag. Mọi tag đều map ID từ bảng này. Khỏi phải xử lý Natural Language Processing (NLP) ở MVP.

---

## UC-MAT-02: Cập Nhật Hồ Sơ Ghép Nối (Customer)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Customer |
| **Trigger** | Customer vào tab "Networking Profile" |
| **Postcondition** | Cập nhật `profiles`, `profile_skills`, `profile_interests` |

### Luồng Chính
```
1. Customer cập nhật profile cơ bản (bio, company, title).
2. Customer CHỌN danh sách Skills từ Dropdown (chỉ hiện tag có category=skill & is_active=true).
   - Chọn level (1-5) cho từng skill (Tùy chọn).
3. Customer CHỌN danh sách Interests từ Dropdown (category=interest).
   - Chọn priority (1-5) (Tùy chọn).
4. Customer bật toggle `contact_public = true` (Cho phép người khác thấy thông tin liên hệ).
5. Hệ thống lưu/UPSERT các records `profile_skills` và `profile_interests`.
```

---

## UC-MAT-03: Tìm Kiếm & Gợi Ý Đối Tác (Matching)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Customer |
| **Trigger** | Customer bấm nút "Tìm đối tác" |
| **Precondition** | Customer đã có ít nhất 1 skill hoặc interest |

### Luồng Chính (On-demand hoặc Pre-computed)
```
1. Customer gọi API lấy danh sách gợi ý.
2. Hệ thống (Job hoặc Query DB trực tiếp) tính điểm cho các user khác:
   - score = (skill_overlap_ratio * 0.6) + (interest_overlap_ratio * 0.25) + (same_branch_bonus)
   * same_branch_bonus = 0.15 nếu `matched_user.primary_branch_id == customer.primary_branch_id`, ngược lại = 0.
3. Lọc bỏ: 
   - Chính User đó.
   - Những User có `score == 0`.
4. Sắp xếp giảm dần theo `score`. Lấy Top 20.
5. Trả về danh sách profile cho Customer.
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Customer chưa điền profile | Yêu cầu điền profile trước khi sử dụng tính năng Matching. |

---

## UC-MAT-04: AI-Powered Matching (V2+)

> **Lưu ý**: Đây là Use Case nâng cao (V2+). Áp dụng Embedding để match.

### Luồng Tính AI Matching
```
1. Khi Customer save Profile, Hệ thống lấy Bio + Skills + Interests gộp thành 1 chuỗi text.
2. Gọi OpenAI/Gemini API: `createEmbedding(text)` -> vector[1536].
3. Lưu vector này vào DB bằng pgvector (`profiles.embedding`).
4. Khi Customer tìm đối tác: Hệ thống gọi query pgvector `ORDER BY embedding <=> user_embedding LIMIT 20` (Cosine Similarity).
```
> Việc chuyển từ Tag Match (MVP) sang AI Match (V2) sẽ không ảnh hưởng schema cũ, chỉ thêm cột `embedding`. Rất an toàn (Surgical Changes).
