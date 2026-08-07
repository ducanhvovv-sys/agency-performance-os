# Prompt bắt đầu cho Claude Code

Dán nguyên prompt sau vào Claude Code sau khi mở thư mục source:

```text
Hãy đọc toàn bộ CLAUDE.md, README.md, HANDOFF.md và các file trong docs trước khi sửa code.

Đây là Agency Performance OS cho agency marketing 10–30 người. Source này tương ứng production v3. Trước tiên hãy:
1) kiểm tra git status và cấu trúc repo;
2) chạy npm ci nếu dependencies chưa có;
3) chạy npm run lint và npm test để xác nhận baseline;
4) tóm tắt ngắn kiến trúc, phần đang dùng dữ liệu D1 thật và phần còn là dữ liệu mẫu;
5) đề xuất kế hoạch triển khai yêu cầu tiếp theo nhưng chưa sửa code cho đến khi tôi duyệt kế hoạch.

Luôn giữ Vinext/Vite + Cloudflare Worker + D1/Drizzle, không xóa .openai/hosting.json, không commit secret, và mọi nút mới phải có chức năng thật cùng trạng thái lỗi/loading rõ ràng. Giao diện tiếp tục dùng tiếng Việt và phải responsive trên điện thoại.
```

## Mở dự án trên macOS

```bash
unzip agency-performance-os-claude-code-2026-08-03.zip
cd agency-performance-os-claude-code-2026-08-03
npm ci
claude
```

## Yêu cầu tiếp theo nên giao

Ưu tiên hợp lý nhất là:

```text
Hãy triển khai P0 bước 1: đưa Projects vào D1 và thay toàn bộ dữ liệu dự án mẫu trên UI bằng API thật. Trước khi code, trình bày schema, migration, API, quyền truy cập, cách tính tiến độ từ task và kế hoạch giữ tương thích với dữ liệu hiện có. Sau khi tôi duyệt mới bắt đầu sửa.
```

