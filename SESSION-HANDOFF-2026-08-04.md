# Biên bản phiên làm việc — Agency Performance OS (2026-08-04)

> Tài liệu bàn giao để **tiếp tục ở GPT / công cụ khác**. Tóm tắt đầy đủ những gì đã làm, đang làm dở, và việc còn lại.

---

## 0. Nguyên tắc bất di bất dịch (đọc trước tiên)

1. **Chỉ dùng DỮ LIỆU THẬT** — Cloudflare D1 + API thật. **Không bao giờ bịa số liệu.**
2. **Giao diện chỉ tiếng Việt.**
3. **Luôn verify bằng `lint` / `test` / `build` trước khi deploy.**
4. Người dùng muốn **đồng bộ tự động** (write-back), **không rành Apps Script** → phải làm hộ + hướng dẫn.
5. Người dùng muốn **hướng dẫn bằng TEXT/offline, KHÔNG xem màn hình** ("hướng dẫn offline thôi đừng xem màn hình bất tiện và lâu lắm").

---

## 1. Toạ độ hệ thống

| Thành phần | Giá trị |
|---|---|
| App URL (production) | `https://agency-performance-os.daisyle251203.workers.dev/` |
| Cloudflare Worker name | `agency-performance-os` |
| D1 database name | `agency-performance-os-db` |
| D1 database id | `5c94b612-00ef-4ead-af9a-7479a7a9a88a` |
| Thư mục dự án (local) | `/Users/ducanh/Downloads/agency-performance-os-claude-code-2026-08-03` |

**Scripts (package.json):**
- `build`: `bash scripts/build-verified.sh`
- `lint`: `bash scripts/sites-env.sh -- eslint . --ignore-pattern dist --ignore-pattern .next`
- `test`: `npm run build && node --test tests/rendered-html.test.mjs`

---

## 2. ✅ ĐÃ XONG & VERIFY — Cầu nối Apps Script (đồng bộ 2 chiều)

Đã dựng **Apps Script Web App gắn liền (container-bound)** trên Google Sheet gốc, cho phép app **đọc (doGet)** và **ghi ngược (doPost)**.

### URL /exec (GIỮ NGUYÊN VĂN — quan trọng)
```
https://script.google.com/macros/s/AKfycbwPUVkL2tYdTSPyMl-qK4GXlhDvN0Kzjcxl69iQxQYlnrDiLrbGoRQL1jN6PWkd-ZSH/exec
```

### Cấu hình deploy (đã set đúng)
- Execute as: **Tôi (ai@taki.vn)**
- Who has access: **Bất kỳ ai (Anyone)**
- Token bảo vệ: `agency-os-2026`

### Đã kiểm chứng
- **doGet (đọc):** trả về sheet **"PLAN DƯỢC SĨ GIANG"** (id `1yaBihGqZcZbdopsCwdfQQQl6jlTZfvdUy5vYkDdyIyw`), 13 tab.
- **doPost (ghi):**
  ```json
  {"token":"agency-os-2026","tab":"5. CHECKLIST CONTENT","rowNumber":5,"writes":[{"col":12,"value":"Chưa viết"}]}
  ```
  → `{"ok":true,"row":5,"written":1}`

### Bẫy kỹ thuật khi test bằng curl
POST tới `/exec` trả **302** → redirect `script.googleusercontent.com/macros/echo?...`.
`curl -L` sẽ **re-POST** vào echo URL và fail. Cách đúng: **POST → lấy header `location:` → GET URL đó** để lấy JSON. (doPost vẫn chạy ngay lần POST đầu.)

### ✅ Đã kết nối vào app
Qua **BridgeModal (chế độ "Cầu nối")**, tab **"5. CHECKLIST CONTENT"**, token `agency-os-2026`. Đã import task.

---

## 3. Sheet đang đồng bộ: "5. CHECKLIST CONTENT"

- **Header dòng 4**, dữ liệu từ **dòng 5**.
- Cột: STT(1), Ngày đăng(2), Content pillar(3), Des Type(4), Title(5), Nội dung chi tiết(6), Ấn phẩm(7), Link đăng bài(8), Cap màn(9), Feedback(10), Note(11), **Trạng thái(12)**.
- Giá trị trạng thái: "Chưa viết" / v.v. Mã dòng: V01, V02, A01...

**Định dạng sourceId của task:** `${fileId}::${tab}::${rawId}`
Ví dụ: `1yaBih...::5. CHECKLIST CONTENT::V33`
> `upsertRows` dedupe theo `sourceId` → **khác fileId = tạo bản TRÙNG.**

---

## 4. 🔧 ĐANG SỬA — Vấn đề "199 task"

Người dùng phản ánh bảng việc hiện **199 task**:
1. Quá nhiều / rối.
2. Không phân biệt được task thuộc sheet nào.
3. Ngày tháng chỉ mang tính tượng trưng.

**Chẩn đoán:** Dữ liệu **mẫu bundle cũ (LEGACY)** trùng với dữ liệu cầu nối thật.
- LEGACY fileId `1YUpAQlbNHy_tKmmkeqiaSHQ3JRHYKcC8` (34 ký tự = fileId file mẫu upload, từ `import "../../../data/duoc-si-giang-plan.json"`).
- Dữ liệu thật fileId `1yaBihGqZcZbdopsCwdfQQQl6jlTZfvdUy5vYkDdyIyw` (44 ký tự = sheet gốc native).

### Các sửa code đã thực hiện (⚠️ ĐÃ EDIT — CHƯA lint/build/deploy)

**File `app/api/integrations/sheets/route.ts`**

EDIT 1 — dòng 1, thêm `like` vào import drizzle:
```ts
import { and, desc, eq, like } from "drizzle-orm";
```

EDIT 2 — action `remove`: xoá cascade task khi gỡ integration:
```ts
await db.delete(integrations).where(eq(integrations.id, payload.integrationId));
// Gỡ kết nối thì xoá luôn task đã nạp từ nguồn đó (tránh dữ liệu mồ côi/trùng lặp).
let purged = 0;
if (target.sourceFileId && target.sourceTab) {
  const res = await db.delete(tasks).where(and(
    eq(tasks.sourceType, "google_sheet"),
    like(tasks.sourceId, `${target.sourceFileId}::${target.sourceTab}::%`)
  ));
  purged = (res as { meta?: { changes?: number } }).meta?.changes ?? 0;
}
return Response.json({ ok: true, removed: target.name, purged });
```

**File `app/agency-app.tsx` (TaskCard, ~dòng 422)**

EDIT 3 — hiện mã ngắn thay vì sourceId dài xấu:
```tsx
{task.project}{task.sourceId ? ` · ${task.sourceId.split("::").pop()}` : ""}
```

EDIT 4 — chip nguồn hiện tên tab sheet để phân loại:
```tsx
{task.sourceType === "google_sheet" && (
  <span className="source-chip">
    {task.sourceSheet ? (task.sourceSheet.split("·").pop() || "Sheet").trim() : "Sheet"}
  </span>
)}
```

### DEFAULT_MAPPING cho CHECKLIST CONTENT (đã có sẵn, đã chuẩn — dòng ~141-148)
```ts
{ startRow: 5, statusCol: 12, idCol: 1,
  columns: { sourceId: 1, dueDate: 2, pillar: 3, contentType: 4, title: 5, assetType: 7, sheetStatus: 12 },
  statusMap: DEFAULT_STATUS_MAP, project: "Dược sĩ Giang" }
```
> `normalizedRows` set `dueDate: row.dueDate || "Chưa có hạn"`, với `row.dueDate` = cột 2 (Ngày đăng) = ngày THẬT cho dữ liệu cầu nối.

---

## 5. 📋 VIỆC CÒN LẠI (TODO — làm tiếp từ đây)

1. **Verify:** `npm run lint && npm run build` cho 3 edit ở mục 4.
2. **Deploy** lên Cloudflare (chỉ khi build pass — theo nguyên tắc).
3. Hướng dẫn người dùng (**TEXT, không xem màn hình**) vào trang **"Đồng bộ Sheet"**, bấm **"Gỡ"** trên thẻ LEGACY **"Snapshot một chiều"** (tên `PLAN CONTENT DƯỢC SĨ GIANG - 30 ngày`, fileId `1YUpAQ`). Nhờ cascade-delete (EDIT 2), thao tác này sẽ xoá luôn task trùng → còn lại dữ liệu cầu nối thật với ngày thật.
4. Xác nhận đã fix cả 3 phàn nàn: số task giảm, thấy tên sheet trên thẻ, ngày thật.
5. (Tùy chọn) Thêm Link 2 "VIỆC ĐỊNH KỲ" (xem mục 6).

---

## 6. Hai link sheet người dùng hỏi thêm

**Link 2 — DÙNG ĐƯỢC (cần mapping riêng):**
- id `1LC8GxLLsK46TnUnfC3XWvdVFC5a08KJQyakswP6-Lk0`, gid `1273746473`
- Sheet "VIỆC ĐỊNH KỲ", bảng sạch, header dòng 4, data từ dòng 5 (~5 dòng).
- Cột: Mã, Danh mục, Công việc định kỳ, Người phụ trách, Tần suất, Ngày/Thứ, Giờ bắt đầu, Giờ kết thúc, Hạn kế tiếp, Trạng thái, Tiến độ, Tài liệu, Nhắc trước.
- Mapping đề xuất: `idCol 1, title 3, owner 4, dueDate 9, statusCol 10, startRow 5`,
  `statusMap { "Chưa làm"→todo, "Đang làm"→doing, "Hoàn thành"→done }`.

**Link 1 — CHƯA dùng được (bố cục dashboard, không phải bảng theo hàng):**
- id `1O3xBAcH8ayNxqxF9xwQ4hhIwe0ABsFPe2gIujWiuLs0`, gid `1548491598`
- "Phân công & Quản lí / Timeline View" — layout trực quan; cần 1 tab dữ liệu dạng bảng mới nạp được.

---

## 7. Hạn chế công cụ / môi trường (đã gặp)

- **Chrome MCP extension:** BỊ CHẶN trên `script.google.com` và `workers.dev` ("Navigation to this domain is not allowed"). Chạy được trên `docs.google.com`. Chỉ điều khiển tab trong tab-group của nó.
- **computer-use MCP:** Chrome ở tier **"read"** — screenshot thấy Chrome nhưng **click/gõ bị chặn**. `write_clipboard` dùng được (đã dùng để đưa giá trị cho người dùng tự dán).
- **Kết nối trong app cần đăng nhập director** (session cookie) → phải thao tác qua UI app (không curl được endpoint POST có auth).
- Google CSV export (chỉ đọc, cần share public):
  `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`
- ID sheet native ~44 ký tự; file upload ~34 ký tự (mẹo nhận biết legacy vs real).
- Thư mục dự án **KHÔNG phải git repo** (đừng chạy `git diff`).

---

## 8. Trạng thái hiện tại (một dòng)

> 3 edit code đã sửa xong nhưng **CHƯA** `lint/build/deploy`. Bước kế: verify → deploy → hướng dẫn người dùng bấm **"Gỡ"** thẻ snapshot cũ để dọn task trùng, còn lại dữ liệu thật với ngày thật.
