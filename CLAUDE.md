# Chỉ dẫn dành cho Claude Code

## Mục tiêu sản phẩm

Đây là **Agency Performance OS** cho agency marketing 10–30 người. Mục tiêu là thao tác nhanh, ít nhập liệu, tự đo hiệu suất nhân sự và tiến độ dự án. Giao diện và nội dung người dùng là tiếng Việt.

Production hiện tại: https://agency-performance-os.ducanhne.chatgpt.site

## Đọc trước khi sửa

1. Đọc `HANDOFF.md` để hiểu yêu cầu và mức độ hoàn thiện.
2. Đọc `docs/ARCHITECTURE.md`, `docs/DATABASE.md` và `docs/SHEET_SYNC.md` nếu thay đổi phần liên quan.
3. Kiểm tra `git status` trước khi sửa; không ghi đè thay đổi chưa commit của người dùng.

## Stack bắt buộc giữ nguyên

- React 19 + TypeScript.
- Vinext/Vite, target Cloudflare Worker.
- Cloudflare D1 + Drizzle ORM.
- API route trong `app/api/**/route.ts`.
- Sites config trong `.openai/hosting.json` với D1 binding tên `DB`.

Không đổi sang Next.js/Vercel thuần, Supabase, Firebase hoặc framework khác nếu chưa được người dùng yêu cầu rõ.

## Khu vực chính

- `app/agency-app.tsx`: UI shell, các màn hình và hành vi phía client.
- `app/globals.css`: toàn bộ hệ thống style responsive.
- `app/api/tasks/route.ts`: đọc/tạo/cập nhật task và ghi trạng thái về Sheet.
- `app/api/employees/route.ts`: CRUD nhân sự hiện có.
- `app/api/integrations/sheets/route.ts`: nhập snapshot, kết nối bridge và đồng bộ.
- `app/data/duoc-si-giang-plan.json`: snapshot 120 task.
- `db/schema.ts`: schema Drizzle.
- `db/index.ts`: khởi tạo D1 và runtime self-heal cho schema cũ.
- `drizzle/`: migration đã phát hành.
- `worker/index.ts`: entry Cloudflare Worker.

## Quy tắc kỹ thuật

- Không commit token, cookie, OAuth secret, API key hoặc URL chứa credential. `.env*` đã bị ignore.
- Không xóa hoặc đổi tên `.openai/hosting.json`, `DB`, lockfile, scripts build/validate hay Sites Vite plugin.
- Mọi thay đổi database phải sửa `db/schema.ts`, chạy `npm run db:generate`, đọc lại SQL migration và giữ tương thích dữ liệu cũ.
- Nếu thêm cột cần chạy an toàn trên D1 đã tồn tại, cập nhật logic self-heal trong `db/index.ts` hoặc thiết kế migration tương thích.
- Không lấy trạng thái nhân sự, dự án hay KPI từ dữ liệu mẫu khi đã có API thật.
- Tránh optimistic update che giấu lỗi: nếu request thất bại, UI phải báo lỗi rõ và phục hồi trạng thái khi cần.
- Nút bấm phải có hành động thật, trạng thái loading/disabled và phản hồi thành công hoặc thất bại.
- Giữ responsive cho desktop và điện thoại; kiểm tra keyboard focus và nhãn `aria` cho control mới.
- Không đổi copy tiếng Việt sang tiếng Anh.

## Google Sheet Sync

- File nguồn ban đầu là XLSM trên Google Drive, không phải Google Sheets native.
- Snapshot 120 task dùng được ngay; đồng bộ hai chiều cần người dùng lưu bản XLSM thành Google Sheets native và triển khai Apps Script Web App.
- Bridge đọc tab `5. CHECKLIST CONTENT`, từ dòng 5, cột A:L.
- `sourceId` lấy từ cột A; trạng thái lấy/ghi ở cột L.
- Khi App đổi trạng thái và bridge khả dụng, API `/api/tasks` ghi ngược cột L.
- Không đưa token thật vào source. Template Apps Script phải giữ placeholder và inject token ở trình duyệt.

## Hiện trạng dữ liệu

- D1 thật: task, cấu hình Sheet integration, nhân sự.
- Frontend mẫu: danh sách dự án, dashboard KPI, bảng xếp hạng/thưởng và Content WIN.
- Quan hệ task–nhân sự hiện dựa trên chuỗi `assignee === employee.fullName`; đây là nợ kỹ thuật cần thay bằng khóa ngoại khi nâng cấp.

## Kiểm thử trước khi bàn giao

```bash
npm run lint
npm test
```

Nếu sửa schema:

```bash
npm run db:generate
```

Sau đó kiểm tra:

- Không có lỗi TypeScript/lint/build.
- Tạo task và chuyển đủ các trạng thái Kanban.
- Thêm/sửa/tạm ngưng nhân sự.
- Import snapshot không tạo task trùng.
- Sync bridge không làm mất trạng thái App mới hơn.
- Khi bridge lỗi, UI báo lỗi và dữ liệu app không bị mất.

## Cách trả kết quả

Mỗi lần hoàn thành, báo ngắn gọn:

1. Đã sửa gì.
2. File chính đã thay đổi.
3. Đã chạy test gì và kết quả.
4. Phần nào vẫn cần credential, OAuth hoặc thao tác thủ công của người dùng.

