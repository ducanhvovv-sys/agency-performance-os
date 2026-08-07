# Hướng dẫn chuyển Agency Performance OS sang TÀI KHOẢN CÁ NHÂN

> Mục tiêu: bạn **tự sở hữu 100%** hosting, database và cầu nối Google — không phụ thuộc ChatGPT Sites hay tài khoản công ty `ai@taki.vn`.
> Hướng chọn: **Hosting/Database → Cloudflare cá nhân** | **Cầu nối Sheet → Gmail cá nhân**.
> Ngày: 2026-08-07.

---

## Bức tranh tổng thể — đang ở đâu, sẽ về đâu

| Thành phần | HIỆN TẠI (rủi ro) | SAU KHI CHUYỂN (bạn sở hữu) |
|---|---|---|
| Hosting | ChatGPT Sites `ducanhne.chatgpt.site` | Cloudflare Worker của bạn `*.workers.dev` |
| Database | Cloudflare D1 do Sites quản lý | Cloudflare D1 trong tài khoản Cloudflare của bạn |
| Cầu nối Sheet | Apps Script dưới `ai@taki.vn` | Apps Script dưới Gmail cá nhân của bạn |
| Source code | Chỉ có trên máy, chưa backup | ✅ Đã tạo git backup cục bộ + đẩy lên GitHub riêng |

**Thời gian ước tính:** 60–90 phút. Làm lần lượt Phần A → B → C → D.

**Yêu cầu chuẩn bị:**
- Node.js ≥ 22.13 (đã có, vì đang chạy được).
- 1 tài khoản **Cloudflare** cá nhân (miễn phí) — đăng ký ở https://dash.cloudflare.com/sign-up
- 1 **Gmail cá nhân**.
- (Khuyến nghị) 1 tài khoản **GitHub** cá nhân để backup code online.

---

## PHẦN 0 — Backup source code (ĐÃ LÀM HỘ BẠN ✅)

Tôi đã khởi tạo git và commit toàn bộ source (81 file, không chứa secret) ngay trong thư mục dự án.
Việc còn lại của bạn: **đẩy lên GitHub riêng** để có bản online.

```bash
cd "/Users/ducanh/Downloads/agency-performance-os-claude-code-2026-08-03"
# Tạo repo PRIVATE trên github.com trước (ví dụ: agency-performance-os), rồi:
git remote add origin https://github.com/<TÊN_GITHUB_CỦA_BẠN>/agency-performance-os.git
git branch -M main
git push -u origin main
```
> Đặt repo ở chế độ **Private**. Code không chứa token/secret nên an toàn, nhưng để private cho chắc.

---

## PHẦN A — Chuyển HOSTING + DATABASE sang Cloudflare cá nhân

### A1. Đăng nhập Cloudflare bằng wrangler
```bash
cd "/Users/ducanh/Downloads/agency-performance-os-claude-code-2026-08-03"
npx wrangler login
```
→ Trình duyệt mở ra, đăng nhập **tài khoản Cloudflare cá nhân** của bạn và bấm **Allow**.
Kiểm tra đúng tài khoản:
```bash
npx wrangler whoami
```

### A2. Tạo D1 database MỚI trong tài khoản của bạn
```bash
npx wrangler d1 create agency-performance-os-db
```
→ Lệnh in ra một khối cấu hình, trong đó có dòng:
```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
**COPY cái `database_id` mới này** — sẽ dùng ở bước A3.

### A3. Gắn database_id mới vào cấu hình build
Mở file `vite.config.ts`, tìm dòng:
```ts
const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "5c94b612-00ef-4ead-af9a-7479a7a9a88a";
```
Thay chuỗi id cũ bằng **database_id mới** bạn vừa copy ở A2. Lưu file.

### A4. Tạo bảng (chạy migration) trên D1 mới
Chạy lần lượt 6 file migration vào database **remote** (thật) của bạn:
```bash
for f in drizzle/0000_*.sql drizzle/0001_*.sql drizzle/0002_*.sql drizzle/0003_*.sql drizzle/0004_*.sql drizzle/0005_*.sql; do
  npx wrangler d1 execute agency-performance-os-db --remote --file="$f" --yes
done
```
Kiểm tra bảng đã tạo:
```bash
npx wrangler d1 execute agency-performance-os-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```
→ Phải thấy các bảng: `tasks`, `employees`, `integrations`, ...

### A5. Build và deploy Worker lên tài khoản của bạn
```bash
npm run build
cd dist/server
npx wrangler deploy
cd ../..
```
→ Kết thúc sẽ in ra URL dạng `https://agency-performance-os.<tài-khoản-của-bạn>.workers.dev`.
**Đây là app MỚI của riêng bạn.** Mở thử trên trình duyệt.

> Nếu `wrangler deploy` báo thiếu D1 binding: mở `dist/server/wrangler.json`, kiểm tra khối `d1_databases` đã có `database_id` mới (khớp A2). Nếu vẫn là id cũ, nghĩa là A3 chưa lưu — sửa lại rồi `npm run build` và deploy lại.

---

## PHẦN B — Chuyển DỮ LIỆU sang app mới

App mới lúc này có schema nhưng **chưa có dữ liệu**. Có 2 loại dữ liệu:

- **Task** (việc): phần lớn đến từ Google Sheet → sẽ **tự nạp lại** khi kết nối cầu nối ở Phần C. Không cần chép tay.
- **Nhân sự** (employees): nhập tay → cần mang sang.

### B1. Lấy dữ liệu nhân sự từ app CŨ (đang đăng nhập trên trình duyệt)
1. Mở app CŨ `https://agency-performance-os.ducanhne.chatgpt.site` (đang đăng nhập giám đốc).
2. Trên trình duyệt, mở tab mới tới: `https://agency-performance-os.ducanhne.chatgpt.site/api/employees`
3. Trang trả về JSON danh sách nhân sự → bấm chuột phải → **Lưu (Save As)** thành file `employees.json` vào thư mục dự án.

### B2. Nạp nhân sự vào app MỚI
Sau khi có `employees.json`, báo tôi — tôi sẽ viết script `POST` từng nhân sự vào app mới của bạn (dùng đúng API `/api/employees`). Hoặc nếu số nhân sự ít (10–30), bạn có thể nhập tay lại trong màn hình **Nhân sự** cũng nhanh.

> Task không cần chép: sau Phần C, bấm "Đồng bộ" là toàn bộ việc từ Sheet tự về, với ngày tháng thật.

---

## PHẦN C — Chuyển CẦU NỐI Google Sheet sang Gmail cá nhân

Cầu nối hiện chạy dưới `ai@taki.vn`. Để bạn tự sở hữu:

### C1. Đưa Sheet về Drive cá nhân
Có 2 cách:
- **Cách nhanh (khuyến nghị):** Mở Sheet gốc → **File → Tạo bản sao (Make a copy)** → lưu vào Drive của **Gmail cá nhân**. Bạn thành chủ sở hữu bản sao.
- **Cách chuyển quyền:** Chia sẻ Sheet → chuyển quyền sở hữu (chỉ được nếu cùng tổ chức Workspace; thường không áp dụng cho Gmail cá nhân → dùng cách sao chép).

> Lưu ý: bản sao có **fileId mới**. Không sao — vì Phần B task sẽ nạp lại từ đầu trên D1 mới.

### C2. Cài Apps Script trên bản sao (đăng nhập Gmail cá nhân)
1. Mở Sheet bản sao → menu **Tiện ích mở rộng (Extensions) → Apps Script**.
2. Xoá code mẫu, **dán lại nguyên code cầu nối cũ** (doGet/doPost). Nếu bạn không giữ code, báo tôi — tôi gửi lại đầy đủ.
3. Đặt token bảo vệ trong code: giữ `agency-os-2026` hoặc đổi token mới cho an toàn.
4. Bấm **Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment) → chọn "Ứng dụng web" (Web app)**.
5. Cấu hình đúng:
   - **Execute as (Thực thi với tư cách):** `Tôi (Gmail cá nhân của bạn)`
   - **Who has access (Ai có quyền truy cập):** `Bất kỳ ai (Anyone)`
6. Bấm **Triển khai**, cấp quyền, rồi **COPY URL `/exec` mới**.

### C3. Kết nối cầu nối mới vào app MỚI
1. Mở app MỚI (URL `*.workers.dev` ở bước A5), đăng nhập giám đốc.
2. Vào **Đồng bộ Sheet → Kết nối sheet mới → chế độ "Cầu nối"**.
3. Dán **URL /exec mới**, nhập **token** (agency-os-2026 hoặc token mới), chọn tab **"5. CHECKLIST CONTENT"**.
4. Bấm kết nối → task tự nạp về với ngày thật.

---

## PHẦN D — Kiểm tra & dọn dẹp

### D1. Nghiệm thu app mới
- [ ] App mở được ở URL `*.workers.dev` của bạn.
- [ ] Task hiển thị, có ngày tháng thật, phân loại đúng theo sheet.
- [ ] Nhân sự đầy đủ.
- [ ] Đổi trạng thái 1 task → mở Sheet kiểm tra cột "Trạng thái" (cột 12) được ghi ngược đúng.

### D2. Ngưng phụ thuộc hệ thống cũ (chỉ làm khi app mới đã chạy ổn)
- App cũ ChatGPT Sites: có thể để nguyên vài ngày làm dự phòng, sau đó gỡ/ẩn.
- Apps Script cũ dưới `ai@taki.vn`: vào Apps Script → **Quản lý triển khai → Lưu trữ (Archive)** để vô hiệu hoá URL /exec cũ.
- Sheet gốc của `ai@taki.vn`: giữ hay bỏ tùy bạn (bản sao cá nhân đã là nguồn chính).

---

## Việc tôi có thể làm hộ ngay (báo tôi khi bạn tới bước tương ứng)

1. **A3** — sửa `database_id` mới vào `vite.config.ts` (chỉ cần bạn gửi id từ lệnh A2).
2. **A4/A5** — chạy migration + build hộ (bạn chỉ cần đã `wrangler login` xong).
3. **B2** — viết script nạp `employees.json` vào app mới.
4. **C2** — gửi lại toàn bộ code Apps Script cầu nối nếu bạn không còn giữ.

## Việc BẮT BUỘC bạn tự làm (cần đăng nhập cá nhân, tôi không thay được)
- `npx wrangler login` (đăng nhập Cloudflare của bạn).
- Đăng ký/đăng nhập Gmail cá nhân, tạo bản sao Sheet, bấm Deploy Apps Script.
- Tạo repo GitHub và `git push`.

---

## Ghi chú an toàn
- **Không** đưa token, URL `/exec`, hay database_id vào GitHub public. Repo để **Private**.
- Token cầu nối nên đổi mới khi chuyển sang Gmail cá nhân (đừng dùng lại token đã lộ trong quá trình test).
- Sau khi chuyển xong, đổi mật khẩu/thu hồi quyền của các tài khoản cũ nếu cần.
