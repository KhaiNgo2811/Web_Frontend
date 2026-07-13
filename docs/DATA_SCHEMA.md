# AntGo Data Schema & Mock Data Blueprint

> **Version:** 1.0  
> **Date:** 2026-07-12  
> **Purpose:** Brainstorm tổng thể schema và quan hệ giữa các entity, đảm bảo mock data liên kết chặt chẽ.

---

## 1. Entity Relationship Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │◄────┤   Post      │     │   Region    │
│  (14 rows)  │     │  (12 rows)  │     │  (4 rows)   │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │ Application │
       │            │  (18 rows)  │
       │            └──────┬──────┘
       │                   │
       │            ┌──────┴──────┐     ┌─────────────┐
       │            │    Order    │◄────┤   Review    │
       │            │  (9 rows)   │     │  (6 rows)   │
       │            └──────┬──────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │ Conversation│
       │            │  (8 rows)   │
       │            └──────┬──────┘
       │                   │
       │            ┌──────┴──────┐
       │            │   Message   │
       │            │  (28 rows)  │
       │            └─────────────┘
       │
       │     ┌─────────────────────────────────────────┐
       │     │         Notification (18 rows)          │
       │     └─────────────────────────────────────────┘
       │
┌──────┴──────────────────────────────────────────────────────┐
│                      Admin Domain                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ModerationReport│  │  Complaint   │  │AdminAccountActivity│  │
│  │  (6 rows)    │  │  (5 rows)    │  │   (8 rows)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   AuditEvent │  │  ExportJob   │  │  BusinessConfig  │  │
│  │  (12 rows)   │  │  (2 rows)    │  │   (1 row)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Chi Tiết Từng Entity

### 2.1 User
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `user-*` hoặc `admin-*` |
| phone | string | SĐT đăng ký |
| email | string? | Email liên kết |
| displayName | string | Tên hiển thị |
| avatarUrl | string? | Ảnh đại diện |
| location | UserLocation | {building, room?, regionId, label?} |
| role | UserRole | `user` / `super_admin` / `complaint_reviewer` / `support_agent` / `moderator` |
| status | UserStatus | `active` / `locked` |
| isVerified | boolean | Đã xác thực CCCD? |
| reputationScore | number\|null | 1–5, null nếu chưa có đánh giá |
| completedCount | number | Số đơn hoàn thành |
| completionRate | number | 0–1 |
| reviewParticipationRate | number | 0–1 |
| tokenBalance | number | Số token dư |
| createdAt | IsoDateString | Ngày tạo tài khoản |

**Quan hệ:**
- 1 User → N Post (authorId)
- 1 User → N Application (applicantId)
- 1 User → N Order (customerId / providerId)
- 1 User → N Review (raterId / rateeId)
- 1 User → N Message (senderId)
- 1 User → N Notification (userId)
- 1 User → N Complaint (complainantId / respondentId)
- 1 User → N ModerationReport (reporterId)

---

### 2.2 AuthAccount
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| userId | string | FK → User.id |
| identifiers | string[] | SĐT, email, hoặc `google:email` |
| password | string | Hash hoặc plain (mock) |
| provider | string | `password` / `google` |

---

### 2.3 Post
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `post-*` |
| type | PostType | `request` / `service` |
| authorId | string | FK → User.id |
| title | string | Tiêu đề |
| description | string | Mô tả chi tiết |
| category | ServiceCategory | `food` / `laundry` / `goods` / `repair` / `support` / `other` |
| price | number | Giá đề xuất |
| expectedTime | string? | Thời gian mong muốn |
| images | string[] | Ảnh đính kèm |
| status | PostStatus | `open` / `connected` / `closed` / `expired` |
| urgency | PostUrgency | `normal` / `urgent` |
| likedBy | string[] | FK[] → User.id (người thích) |
| isPriority | boolean | Ưu tiên hiển thị |
| hidden | boolean | Bị ẩn bởi admin |
| priorityUntil | IsoDateString? | Hết hạn ưu tiên |
| regionId | string | FK → Region.id |
| expiresAt | IsoDateString | Hết hạn bài đăng |
| createdAt | IsoDateString | Ngày tạo |
| updatedAt | IsoDateString | Cập nhật gần nhất |

**Quy tắc liên kết:**
- `status = 'connected'` → tồn tại ít nhất 1 Application với `status = 'selected'` và 1 Order tương ứng.
- `status = 'closed'` → đã hoàn thành hoặc bị hủy.
- `status = 'expired'` → quá `expiresAt`.

---

### 2.4 Application
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `application-*` |
| postId | string | FK → Post.id |
| applicantId | string | FK → User.id |
| message | string | Lời nhắn đề xuất |
| proposedPrice | number? | Giá đề xuất (nếu khác giá post) |
| status | ApplicationStatus | `pending` / `selected` / `withdrawn` / `rejected` |
| createdAt | IsoDateString | Ngày gửi |
| updatedAt | IsoDateString | Cập nhật gần nhất |

**Quy tắc liên kết:**
- 1 Post có N Application (1-N).
- Mỗi Post chỉ có tối đa 1 Application `selected`.
- Application `selected` → sinh ra 1 Order.

---

### 2.5 Order
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `order-*` |
| code | string | Mã hiển thị: `AG-XXXXXX` |
| postId | string | FK → Post.id |
| applicationId | string | FK → Application.id |
| customerId | string | FK → User.id (người đặt) |
| providerId | string | FK → User.id (người làm) |
| status | OrderStatus | `pending` / `in_progress` / `completed` / `cancelled` |
| statusHistory | StatusEntry[] | Lịch sử chuyển trạng thái |
| cancelReason | string? | Lý do hủy |
| providerReportedDoneAt | IsoDateString? | Tasker báo hoàn thành |
| customerConfirmedAt | IsoDateString? | Khách xác nhận hoàn thành |
| autoCompleteDeadline | IsoDateString? | Hạn tự động hoàn thành |
| escrowState | EscrowState | `none` / `held` / `released` / `disputed` |
| escrowFeePct | number? | Phí escrow (%) |
| heldAmount | number? | Số tiền giữ lại |
| createdAt | IsoDateString | Ngày tạo |
| updatedAt | IsoDateString | Cập nhật gần nhất |

**Quy tắc liên kết:**
- `status = 'completed'` → tồn tại ít nhất 1 Review (thường là 2: customer review provider + provider review customer).
- `status = 'completed'` → `escrowState = 'released'`.
- `status = 'in_progress'` → `escrowState` thường là `held` hoặc `none`.
- `status = 'cancelled'` → có `cancelReason`.

**Quy tắc customer/provider:**
- Nếu Post.type = `request`: customer = Post.authorId, provider = Application.applicantId.
- Nếu Post.type = `service`: customer = Application.applicantId, provider = Post.authorId.

---

### 2.6 Review
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `review-*` |
| orderId | string | FK → Order.id |
| raterId | string | FK → User.id (người đánh giá) |
| rateeId | string | FK → User.id (người bị đánh giá) |
| stars | number | 1–5 |
| comment | string? | Nội dung |
| hidden | boolean | Bị ẩn bởi admin |
| createdAt | IsoDateString | Ngày đánh giá |

**Quy tắc liên kết:**
- 1 Order → 0–2 Review (mỗi bên đánh giá 1 lần).
- `raterId` và `rateeId` phải là 2 participant trong Order.

---

### 2.7 Conversation
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `conversation-*` |
| postId | string | FK → Post.id |
| orderId | string? | FK → Order.id |
| participantIds | [string, string] | FK[] → User.id (đúng 2 người) |
| createdAt | IsoDateString | Ngày tạo |
| updatedAt | IsoDateString | Cập nhật gần nhất (từ message mới nhất) |

**Quy tắc liên kết:**
- 1 Conversation → N Message.
- `participantIds` phải trùng với `customerId` và `providerId` của Order (nếu có orderId).

---

### 2.8 Message
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `message-*` |
| conversationId | string | FK → Conversation.id |
| orderId | string? | FK → Order.id |
| senderId | string | FK → User.id (phải trong participantIds) |
| kind | MessageKind | `text` / `image` / `qr` |
| content | string | Nội dung |
| hidden | boolean | Bị ẩn bởi moderation |
| attachment | MessageAttachment? | File đính kèm |
| createdAt | IsoDateString | Ngày gửi |

---

### 2.9 Notification
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `notification-*` |
| userId | string | FK → User.id (người nhận) |
| type | NotificationType | `application_received` / `application_selected` / `order_started` / `work_reported_done` / `order_completed` / `order_cancelled` / `message_received` / `review_received` |
| title | string | Tiêu đề |
| body | string | Nội dung |
| route | string? | Route điều hướng |
| orderId | string? | FK → Order.id |
| read | boolean | Đã đọc? |
| createdAt | IsoDateString | Ngày tạo |

---

### 2.10 Region
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| name | string | Tên hiển thị |
| city | string | Thành phố |
| status | string | `active` / `paused` |

---

### 2.11 BusinessConfig
Singleton. Cấu hình toàn hệ thống.

### 2.12 ModerationReport
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| targetType | ModerationTargetType | `post` / `review` / `message` |
| targetId | string | FK đến target tương ứng |
| reporterId | string | FK → User.id |
| reason | string | Lý do báo cáo |
| status | ModerationStatus | `pending` / `hidden` / `dismissed` |
| regionId | string | FK → Region.id |
| ... | ... | Các trường khác |

### 2.13 Complaint
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK. Prefix: `complaint-*` |
| code | string | Mã hiển thị: `CP-XXXXX` |
| orderId | string? | FK → Order.id |
| complainantId | string | FK → User.id |
| respondentId | string? | FK → User.id |
| stage | ComplaintStage | `received` → `verifying` → `collecting_evidence` → `evaluating` → `resolving` → `notified` → `resolved` |
| ... | ... | Các trường khác (SLA, evidence, assessment, remedy, timeline...) |

**Quy tắc liên kết:**
- `complainantId` và `respondentId` phải là 2 participant của Order.
- `stage` phải tuân theo timeline (không nhảy vượt bước).

### 2.14 AdminAccountActivity
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| userId | string | FK → User.id (tài khoản bị tác động) |
| adminId | string | FK → User.id (admin thực hiện) |
| action | string | `locked` / `unlocked` |
| reason | string? | Lý do |
| createdAt | IsoDateString | Ngày thực hiện |

### 2.15 AuditEvent
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| actorId | string | FK → User.id (admin thực hiện) |
| action | string | Hành động |
| targetType | AuditTargetType | `user` / `moderation_report` / `complaint` / `configuration` / `export` |
| targetId | string | ID của đối tượng |
| before | object? | Trạng thái trước |
| after | object? | Trạng thái sau |
| createdAt | IsoDateString | Ngày thực hiện |

### 2.16 ExportJob
| Field | Type | Mô tả |
|-------|------|-------|
| id | string | PK |
| requestedBy | string | FK → User.id |
| status | string | `queued` / `ready` / `failed` |
| format | string | `csv` |
| retentionUntil | IsoDateString | Hết hạn giữ file |

---

## 3. Mock Data Cardinality (Thực tế)

| Entity | Số lượng | Ghi chú |
|--------|----------|---------|
| User | 14 | 5 admin + 9 user |
| AuthAccount | 15 | 14 password + 1 google |
| Post | 12 | 7 open + 3 connected + 1 closed + 1 expired |
| Application | 18 | 1–2 application / open post, 1 / connected post |
| Order | 9 | 3 in_progress + 3 completed + 2 pending + 1 cancelled |
| Review | 6 | Gắn với 3 completed orders (2 reviews / order) |
| Conversation | 8 | Gắn với 8 orders có chat |
| Message | 28 | 3–4 message / conversation |
| Notification | 18 | Phủ đủ 8 loại notification |
| Region | 4 | `all` + Khu A + Khu B + Khu C |
| BusinessConfig | 1 | Singleton |
| ModerationReport | 6 | Mix targetType & status |
| Complaint | 5 | Các giai đoạn khác nhau |
| AdminAccountActivity | 8 | Lock/unlock accounts |
| AuditEvent | 12 | Các hành động admin |
| ExportJob | 2 | 1 ready + 1 queued |
| **Tổng** | **~140 rows** | |

---

## 4. Business Rules (Data Integrity)

1. **Post-Application-Order Pipeline:**
   - Post `open` → chỉ có Application `pending` (chưa chọn ai) hoặc 1 `selected`.
   - Post `connected` → có 1 Application `selected` + 1 Order tương ứng.
   - Post `closed` → Order đã `completed`.
   - Post `expired` → quá `expiresAt`, không có Order.

2. **Order-Review Pipeline:**
   - Order `completed` → có ít nhất 1 Review (thường 2).
   - Order `cancelled` → không có Review.
   - Order `pending` / `in_progress` → chưa có Review.

3. **Conversation-Message:**
   - Message.senderId phải nằm trong Conversation.participantIds.
   - Conversation có orderId → participantIds = [Order.customerId, Order.providerId].

4. **Complaint-Order:**
   - Complaint có orderId → complainantId và respondentId là 2 bên của Order.
   - Timeline stage phải tuần tự.

5. **ModerationReport:**
   - targetId phải tồn tại trong entity tương ứng (Post / Review / Message).
   - reporterId phải là User hợp lệ.
   - status = `hidden` → target bị ẩn (hidden = true).

6. **Notification:**
   - orderId có nghĩa → userId phải là participant của Order đó.
   - type phải phù hợp với context (ví dụ: `review_received` → có Review tồn tại).

---

## 5. Khu Vực (Regions)

| ID | Tên | Thành phố | Trạng thái |
|----|-----|-----------|------------|
| all | Tất cả khu vực | Toàn hệ thống | active |
| khu-a | Khu A | TP. Hồ Chí Minh | active |
| khu-b | Khu B | TP. Hồ Chí Minh | active |
| khu-c | Khu C | TP. Hồ Chí Minh | active |

**Phân bổ User theo khu vực:**
- **Khu A**: user-demo, user-minh, user-lan (3 users)
- **Khu B**: user-huy, user-mai (2 users)
- **Khu C**: user-duc, user-linh, user-tuan, user-hang (4 users)
- **Admin**: Tất cả ở khu-a (hoặc toàn hệ thống)

**Phân bổ Post theo khu vực:**
- **Khu A**: post-groceries, post-aircon, post-laundry, post-plants, post-tutor (5)
- **Khu B**: post-delivery, post-cooking, post-moving, post-cleaning (4)
- **Khu C**: post-petcare, post-fixphone, post-shopping (3)

---

## 6. Danh sách ID Reference

### Users
| ID | Role | Tên | Khu vực |
|----|------|-----|---------|
| admin-seed | super_admin | AntGo Admin | khu-a |
| admin-main | super_admin | Bảo Long | khu-a |
| admin-reviewer | complaint_reviewer | AntGo Reviewer | khu-a |
| admin-support | support_agent | AntGo Support | khu-a |
| admin-moderator | moderator | AntGo Moderator | khu-a |
| user-demo | user | Nguyễn Hoàng An | khu-a |
| user-minh | user | Trần Quang Minh | khu-a |
| user-lan | user | Phạm Ngọc Lan | khu-a |
| user-huy | user | Lê Gia Huy | khu-b |
| user-mai | user | Vũ Thị Mai | khu-b |
| user-duc | user | Hoàng Văn Đức | khu-c |
| user-linh | user | Đỗ Thùy Linh | khu-c |
| user-tuan | user | Bùi Anh Tuấn | khu-c |
| user-hang | user | Ngô Thị Hằng | khu-c |

### Posts
| ID | Type | Author | Status | Khu vực |
|----|------|--------|--------|---------|
| post-groceries | request | user-lan | open | khu-a |
| post-aircon | request | user-demo | open | khu-a |
| post-laundry | service | user-minh | open | khu-a |
| post-delivery | service | user-huy | open | khu-b |
| post-cooking | service | user-duc | open | khu-b |
| post-petcare | service | user-tuan | open | khu-c |
| post-moving | service | user-minh | open | khu-b |
| post-plants | request | user-demo | connected | khu-a |
| post-tutor | service | user-demo | connected | khu-a |
| post-fixphone | request | user-hang | connected | khu-c |
| post-cleaning | request | user-mai | closed | khu-b |
| post-shopping | request | user-linh | expired | khu-c |

### Orders
| ID | Post | Application | Status | Customer | Provider |
|----|------|-------------|--------|----------|----------|
| order-plants | post-plants | application-plants-minh | in_progress | user-demo | user-minh |
| order-tutor | post-tutor | application-tutor-lan | completed | user-lan | user-demo |
| order-laundry | post-laundry | application-laundry-huy | in_progress | user-huy | user-minh |
| order-cooking | post-cooking | application-cooking-lan | in_progress | user-lan | user-duc |
| order-moving | post-moving | application-moving-demo | pending | user-demo | user-minh |
| order-fixphone | post-fixphone | application-fixphone-duc | pending | user-hang | user-duc |
| order-cleaning | post-cleaning | application-cleaning-demo | completed | user-mai | user-demo |
| order-groceries | post-groceries | application-groceries-demo | completed | user-lan | user-demo |
| order-aircon | post-aircon | application-aircon-minh | cancelled | user-demo | user-minh |

---

## 7. Các Files Mock Data

| File | Mô tả |
|------|-------|
| `demo-users.ts` | 14 Users + 15 AuthAccounts |
| `demo-posts.ts` | 12 Posts |
| `demo-orders.ts` | 18 Applications + 9 Orders + 6 Reviews |
| `demo-communications.ts` | 8 Conversations + 28 Messages + 18 Notifications |
| `demo-admin.ts` | 4 Regions + BusinessConfig + 6 ModerationReports + 5 Complaints + 8 AdminAccountActivities + 12 AuditEvents + 2 ExportJobs |
| `demo-seed.ts` | Assembly tất cả vào MockDatabaseData |
| `demo-policy.ts` | Nội dung chính sách (độc lập, không đổi) |

---

*End of Schema Document*
