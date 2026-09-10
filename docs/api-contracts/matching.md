# API Contract — Partner Matching Module

> **Base URL**: `/api/matching` (Cho Suggestion) và `/api/profiles` (Cho Profile Update)
> **Auth**: Bearer JWT (Customer, Admin)
> **Tham chiếu**: [UC-MAT-01 → 03](file:///d:/DA/docs/business/use_cases/matching.md)
> **Ngày**: 2026-06-30

---

## 1. Lấy Danh Sách Tag Chuẩn (Master Data)

### `GET /api/tags`
**Roles**: Public (Cần token hợp lệ)

**Query**:
- `category`: `skill` | `interest` | `industry`

**Response — 200 OK**:
```json
{
  "data": [
    { "id": "uuid", "name": "Frontend Dev", "category": "skill" },
    { "id": "uuid", "name": "Backend Dev", "category": "skill" }
  ]
}
```

---

## 2. Cập Nhật Hồ Sơ (Customer)

### `PUT /api/profiles/me/networking`
**Roles**: `customer`

**Request**:
```json
{
  "bio": "Xin chào, tôi là Web Developer...",
  "company": "FPT Software",
  "title": "Senior Frontend",
  "contact_public": true,
  "skills": [
    { "tag_id": "uuid_frontend", "level": 4 },
    { "tag_id": "uuid_react", "level": 3 }
  ],
  "interests": [
    { "tag_id": "uuid_startup", "priority": 5 }
  ]
}
```

**Response — 200 OK**: Trả về chính cấu trúc trên sau khi lưu DB.

---

## 3. Lấy Danh Sách Đối Tác Đề Xuất

### `GET /api/matching/suggestions`
**Roles**: `customer`

**Response — 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid_2",
      "name": "Trần Văn B",
      "profession": "Backend Engineer",
      "company": "ABC Startup",
      "avatar": "https://...",
      "matchScore": 60,
      "commonTags": ["Backend Dev", "EdTech", "AI / Machine Learning"],
      "postTags": ["Backend Dev", "EdTech", "AI / Machine Learning"],
      "matchReason": "Kết nối để cùng trao đổi về Backend, EdTech và ứng dụng AI/Machine Learning.",
      "contactPublic": true,
      "email": "tranb@abc.com",
      "phone": "0987654321",
      "bio": "Đang tìm kiếm Co-founder tech",
      "linkedin": "https://...",
      "github": null,
      "isSameBranch": true
    }
  ]
}
```
*(Lưu ý: email/phone của user_2 chỉ hiển thị nếu `contactPublic == true`)*

**Cách tính `matchScore` (0–100)**

Ba tín hiệu, mỗi tín hiệu là độ trùng nhau giữa hai bên:

| Tín hiệu | Trọng số | Nguồn |
|---|---|---|
| Kỹ năng (skills) | 0.5 | `profile_skills` |
| Lĩnh vực quan tâm (interests) | 0.2 | `profile_interests` |
| Chủ đề đã viết bài | 0.2 | `post_tags` của các bài đã publish ([community.md](community.md)) |

- Điểm chỉ được **chuẩn hóa trên những tín hiệu mà cả hai bên thực sự có**. Nhờ vậy một thành viên chưa khai kỹ năng vẫn nhận được điểm có ý nghĩa từ nội dung họ đã viết, thay vì bị giới hạn ở 0.2.
- Cùng chi nhánh: `+0.15`. Kết quả giới hạn ở 1.0 và quy đổi thành phần trăm (sàn 10%).
- Ứng viên 0 điểm bị loại nếu người dùng có bất kỳ nhãn nào để so khớp.
- `postTags` là các chủ đề người đó đã viết mà trùng với mối quan tâm của người xem.

**`matchReason`** — một câu giải thích ngắn do Gemini viết cho vài gợi ý đầu bảng (một lần gọi cho cả danh sách). Nếu chưa cấu hình `GEMINI_API_KEY` hoặc gọi lỗi, hệ thống dùng câu sinh sẵn từ các nhãn chung, nên trường này **luôn có giá trị**.

> Bản ghi cache tại `profile_match_scores` chỉ được ghi khi **cả hai** phía đã có dòng trong `profiles` (do ràng buộc khóa ngoại); thiếu thì bỏ qua việc ghi cache chứ không làm hỏng request.
