# Agency Performance OS

Ứng dụng quản trị công việc, tiến độ dự án, nhân sự và hiệu suất cho agency marketing 10–30 người.

Phiên bản trong gói này là source của production v3, chốt ngày **03/08/2026**. Ứng dụng đang chạy tại:

- https://agency-performance-os.ducanhne.chatgpt.site

## Chạy nhanh

Yêu cầu Node.js `>=22.13.0` và npm.

```bash
npm ci
npm run dev
```

Mở địa chỉ do Vite in ra trong terminal. Với thay đổi hoàn chỉnh, chạy:

```bash
npm run lint
npm test
```

`npm test` đã bao gồm build và kiểm tra artifact.

## Claude Code

Claude Code phải đọc [CLAUDE.md](./CLAUDE.md) trước khi sửa source. Prompt khởi động có sẵn tại [PROMPT_BAT_DAU.md](./PROMPT_BAT_DAU.md).

## Chức năng đã có

- Dashboard tổng quan agency.
- Kanban task: tạo, duyệt, bắt đầu, gửi duyệt, hoàn thành, gắn người phụ trách.
- Nhập 120 task thật từ plan Dược Sĩ Giang.
- Đồng bộ Google Sheets hai chiều qua Apps Script Web App.
- Đối soát trạng thái App ↔ Sheet ↔ link Page/kênh.
- Quản lý nhân sự: thêm, sửa, kích hoạt/tạm ngưng, bộ phận, vai trò, quản lý, công suất và KPI mục tiêu.
- Màn hình dự án, KPI, thưởng, Content WIN và thiết lập.
- Giao diện web responsive cho máy tính và điện thoại.

## Tài liệu

- [Bàn giao sản phẩm](./HANDOFF.md)
- [Kiến trúc](./docs/ARCHITECTURE.md)
- [Database](./docs/DATABASE.md)
- [Google Sheet Sync](./docs/SHEET_SYNC.md)

## Lưu ý quan trọng

- `tasks`, `integrations`, `employees` đã dùng Cloudflare D1.
- Dự án, bảng KPI và dữ liệu Content WIN hiện vẫn là dữ liệu mẫu ở frontend; xem `HANDOFF.md`.
- Gói source không chứa dữ liệu production trong D1, token Apps Script hay thông tin đăng nhập.
- Không xóa `.openai/hosting.json`; file này giữ cấu hình binding D1 `DB` cho Sites.

