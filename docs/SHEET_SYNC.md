# Google Sheet Sync

## Hiện trạng nguồn

Nguồn gốc là file `PLAN_CONTENT_DUOC_SI_GIANG_V4_GIONG_NOI_THAT_30_NGAY.xlsm` lưu trên Google Drive. Vì đây là XLSM, app không thể ghi hai chiều như Google Sheets native chỉ bằng URL Drive.

App cung cấp hai chế độ:

1. **Snapshot**: nhập 120 task từ JSON đã trích xuất, dùng ngay nhưng không ghi ngược file XLSM.
2. **Live bridge**: bản Google Sheets native + Apps Script Web App, đọc/ghi trạng thái hai chiều.

## Mapping hiện tại

| Cột Sheet | Ý nghĩa | Trường app |
|---|---|---|
| A | STT/mã task | `sourceId` |
| B | Ngày đăng | `dueDate` |
| C | Content pillar | `contentPillar` |
| D | Des Type | `contentType`, department, weight |
| E | Title | `title` |
| G | Asset type | `assetType` |
| L | Trạng thái | `sheetStatus`, `status` |

Bridge đọc từ dòng 5. Tab mặc định phải tên chính xác `5. CHECKLIST CONTENT`.

## Thiết lập live bridge

1. Mở file XLSM và chọn **File → Save as Google Sheets**.
2. Trong bản Google Sheets mới, chọn **Extensions → Apps Script**.
3. Trên app, mở **Đồng bộ Sheet → Bật đồng bộ hai chiều**.
4. Giữ token app tạo sẵn, bấm **Sao chép mã đã cấu hình**, dán thay toàn bộ Apps Script.
5. Trong Apps Script chọn **Deploy → New deployment → Web app**.
6. Chọn **Execute as: Me** và **Who has access: Anyone**.
7. Dán URL kết thúc bằng `/exec` vào app và chạy thử kết nối.

Không gửi token qua chat, ticket hoặc commit. Nếu token bị lộ, đổi token và deploy Apps Script lại.

## API contract của bridge

### Read

`GET <bridgeUrl>?action=read&tab=...&token=...`

Response tối thiểu:

```json
{
  "meta": {
    "spreadsheetId": "...",
    "spreadsheetUrl": "...",
    "spreadsheetName": "...",
    "tab": "5. CHECKLIST CONTENT"
  },
  "rows": [
    {
      "sourceId": "V01",
      "sourceRow": 5,
      "dueDate": "2026-08-03",
      "pillar": "...",
      "contentType": "VIDEO",
      "publishTime": "20:00",
      "title": "...",
      "assetType": "...",
      "sheetStatus": "Chưa viết"
    }
  ]
}
```

### Write status

`POST <bridgeUrl>` với JSON:

```json
{
  "action": "update_status",
  "token": "...",
  "tab": "5. CHECKLIST CONTENT",
  "sourceId": "V01",
  "sourceRow": 5,
  "status": "Đã đăng bài"
}
```

## Quy tắc xung đột

- Sheet → App dùng upsert theo `(source_type, source_id)`.
- Nếu task đang có `sync_state = app_newer` và trạng thái Sheet khác, giữ trạng thái App.
- Khi writeback thành công, đặt `sync_state = synced`, cập nhật `sheet_status` và `last_synced_at`.
- Khi bridge lỗi, task trên App vẫn được cập nhật và chờ đồng bộ lại.

## Hạn chế

- Chỉ hỗ trợ một integration và một tab cố định.
- Chỉ ghi ngược cột trạng thái L.
- Chưa có push trigger từ Sheet về App; hiện phải bấm đồng bộ.
- Chưa có OAuth Google Sheets API hoặc secret manager.
- Apps Script `Anyone` cần token đủ mạnh, rotation và log/audit tốt hơn trước khi dùng ở quy mô lớn.

