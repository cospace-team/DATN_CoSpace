# API Documentation — Cộng đồng & Bảng tin (Community Feed)

**Base URL:** `http://localhost:8080`

Thành viên viết bài về việc mình đang làm hoặc đang tìm cộng sự. Mỗi bài được gắn nhãn từ **cùng bộ từ vựng `tags`** với kỹ năng/lĩnh vực trong hồ sơ — đây là cơ chế biến một bài viết thành tín hiệu kết nối: bảng tin được xếp hạng theo mức phù hợp với người đọc, và [matching.md](matching.md) cộng thêm nhãn từ bài viết vào điểm gợi ý đối tác.

**Auth:** Tất cả endpoint yêu cầu JWT (`Authorization: Bearer <token>`).

---

## 1. API: Lấy bảng tin cộng đồng

- **Endpoint:** GET `/api/community/posts`
- **Description:** Trả về danh sách bài viết đã publish, kèm điểm phù hợp với người đọc.
- **Query params:**
  - `sort`: `relevant` (mặc định) — xếp theo độ phù hợp, lấy thời gian đăng làm tiêu chí phụ; hoặc `recent` — mới nhất trước.
  - `tagId`: (optional) lọc theo một nhãn.
  - `type`: (optional) `sharing` | `seeking_partner` | `question` | `event`.

- **Response Body (JSON) — 200 OK:**

```json
{
  "data": [
    {
      "id": "7ccbfa72-d1ed-4413-969a-fbfb0d162f76",
      "title": "Tìm người đồng hành cho sản phẩm chấm bài tự động",
      "content": "Mình đang xây dựng ...",
      "postType": "seeking_partner",
      "branchId": null,
      "branchName": null,
      "createdAt": "2026-09-10T04:29:25.523958500Z",
      "authorId": "70d2971d-575a-4d7a-a032-51346c176abc",
      "authorName": "Nguyễn Văn A",
      "authorAvatar": "https://...",
      "authorProfession": "Data Engineer",
      "authorCompany": "CoSpace Community",
      "tags": ["Backend Dev", "AI / Machine Learning", "EdTech"],
      "relevanceScore": 60,
      "matchedTags": ["Backend Dev", "AI / Machine Learning"],
      "mine": false
    }
  ]
}
```

- **Cách tính `relevanceScore` (0–100):**
  - Tập nhãn của người đọc = kỹ năng + lĩnh vực quan tâm trong hồ sơ + nhãn trên các bài họ đã viết.
  - `ratio = |nhãn chung| / min(|nhãn bài viết|, |nhãn người đọc|)`
  - Cùng chi nhánh: `+0.15`. Kết quả giới hạn ở 100.
  - `matchedTags` là phần giao — chính là lý do bài viết xuất hiện với người đọc.

---

## 2. API: Đăng bài viết mới

- **Endpoint:** POST `/api/community/posts`
- **Description:** Tạo bài viết. **Nhãn được AI (Gemini) tự đọc nội dung và gán**, nên tác giả không bắt buộc phải tự chọn nhãn.
- **Request Body (JSON):**

```json
{
  "title": "Tìm người đồng hành cho sản phẩm chấm bài tự động",
  "content": "Mình đang xây dựng một sản phẩm dùng mô hình ngôn ngữ lớn ...",
  "postType": "seeking_partner",
  "tagIds": []
}
```

- **Validation:**
  - `title`: bắt buộc, tối đa 200 ký tự.
  - `content`: bắt buộc.
  - `postType`: mặc định `sharing`; giá trị lạ sẽ được quy về `sharing`.
  - `tagIds`: optional. Nhãn tác giả tự chọn (`source = 'manual'`); phần còn thiếu do AI bổ sung (`source = 'ai'`), tổng tối đa **5 nhãn**.
  - `branchId`: optional; nếu bỏ trống, lấy chi nhánh chính trong hồ sơ, sau đó tới `users.branch_id`.

- **Gán nhãn bằng AI:** Gemini chỉ được chọn trong danh sách `tags` đang active, tối đa 5 nhãn. Nếu `GEMINI_API_KEY` chưa cấu hình hoặc gọi lỗi, hệ thống **tự động fallback** sang so khớp tên nhãn xuất hiện trong tiêu đề/nội dung — việc đăng bài không bao giờ bị chặn vì AI.

- **Response — 201 Created:** một object `PostDto` giống phần tử trong mục 1.

---

## 3. API: Xóa bài viết

- **Endpoint:** DELETE `/api/community/posts/{postId}`
- **Description:** Chỉ tác giả mới xóa được bài của mình.
- **Response — 200 OK:** `{ "success": true }`
- **Lỗi — 400:** `{ "message": "Bạn chỉ có thể xóa bài viết của chính mình." }`

---

## 4. API: Danh sách nhãn

- **Endpoint:** GET `/api/community/tags`
- **Description:** Bộ từ vựng nhãn dùng chung cho bài viết và hồ sơ (dùng cho chip lọc và gán nhãn thủ công).
- **Response — 200 OK:**

```json
[
  { "id": "11111111-1111-1111-1111-111111111005", "name": "AI / Machine Learning", "category": "skill", "active": true }
]
```

---

## Database

Migration: `database/migrations/20260910000000_community_posts.sql`

| Bảng | Cột chính |
|---|---|
| `posts` | `id`, `author_user_id → users`, `title`, `content`, `post_type`, `branch_id → branches`, `status`, `created_at`, `updated_at` |
| `post_tags` | `post_id → posts`, `tag_id → tags`, `source` (`ai` \| `manual`), PK `(post_id, tag_id)` |

Index: `idx_posts_feed (status, created_at DESC)`, `idx_posts_author`, `idx_post_tags_tag`.
