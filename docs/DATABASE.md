# Database

Database production là Cloudflare D1, binding `DB`, truy cập qua Drizzle ORM.

## `tasks`

Nhóm trường chính:

- Nhận diện: `id`, `title`, `project`, `department`, `assignee`.
- Kế hoạch: `due_date`, `priority`, `weight`, `status`, `created_by`.
- Sheet: `source_type`, `source_id`, `source_sheet`, `source_row`, `sheet_status`, `sync_state`, `last_synced_at`.
- Content/kênh: `content_type`, `content_pillar`, `asset_type`, `channel_status`, `post_url`.
- Vướng mắc: `blocked_reason`.

Unique index `(source_type, source_id)` giúp import/sync lặp lại không tạo task trùng.

## `integrations`

Hiện chỉ có một cấu hình `kind = google_sheets` vì `kind` là unique.

- Nguồn: `name`, `source_url`, `source_file_id`, `source_tab`, `source_format`.
- Trạng thái: `status`, `rows_imported`, `last_synced_at`.
- Bridge: `bridge_url`, `bridge_token`.

`bridge_token` hiện lưu trong D1. Không trả token này qua GET API. Khi nâng cấp production, nên mã hóa hoặc chuyển sang secret store.

## `employees`

- Hồ sơ: `full_name`, `email`, `phone`, `department`, `role`, `manager`, `start_date`.
- Vận hành: `status`, `capacity_percent`, `kpi_target`.
- `is_demo` đánh dấu dữ liệu mẫu khởi tạo.

Email có unique index. Nhiều nhân sự không email vẫn được phép vì SQLite cho phép nhiều giá trị `NULL` trong unique index.

## Migration

Sau khi sửa `db/schema.ts`:

```bash
npm run db:generate
```

Kiểm tra SQL sinh ra trước khi commit. Tránh drop/rename cột trực tiếp khi chưa có kế hoạch chuyển dữ liệu. Với D1 đã chạy production:

1. Thêm bảng/cột mới theo hướng backward-compatible.
2. Deploy code có thể đọc cả dữ liệu cũ và mới.
3. Backfill theo batch.
4. Chuyển read path sang schema mới.
5. Chỉ dọn cột cũ ở migration sau khi xác minh.

## Nợ kỹ thuật quan trọng

- `tasks.project` và `tasks.assignee` là chuỗi, chưa có foreign key.
- Chưa có bảng projects, project_members, KPI periods, reviews, rewards, posts, channels và audit_logs.
- Runtime self-heal trong `db/index.ts` là lớp bảo vệ triển khai, không thay cho migration có kiểm soát.

