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
      "user": {
        "id": "uuid_2",
        "full_name": "Trần Văn B",
        "avatar_url": "https://..."
      },
      "profile": {
        "title": "Founder @ ABC Startup",
        "bio": "Đang tìm kiếm Co-founder tech",
        "contact_public": true,
        "email": "tranb@abc.com", 
        "phone": "0987654321"
      },
      "match_details": {
        "total_score": 0.85,
        "shared_skills": ["Frontend Dev", "React"],
        "shared_interests": ["Startup"],
        "is_same_branch": true
      }
    }
  ]
}
```
*(Lưu ý: email/phone của user_2 chỉ hiển thị nếu `contact_public == true`)*
