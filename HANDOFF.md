# Bàn giao Agency Performance OS

## 1. Bối cảnh kinh doanh

Agency có 10–30 nhân sự thuộc Content, Video, Design, Ads/Performance và Account. Công việc kết hợp theo phòng ban, dự án và khách hàng. App được định hướng thay Google Sheets, tối ưu cho web và điện thoại.

Hiệu suất nhân sự cần đo theo bốn nhóm:

1. Khối lượng công việc, quy đổi tự động từ loại task/độ khó.
2. Đúng deadline.
3. Chất lượng đầu ra do trưởng bộ phận và quản lý chung duyệt.
4. Kết quả marketing, tính chung cho team dự án.

Chu kỳ KPI/thưởng chốt hàng tháng, bảng điểm công khai trong công ty và có bước quản lý xác nhận trước khi khóa thưởng.

## 2. Nguồn công việc và loại dự án

- Hợp đồng dịch vụ theo tháng.
- Việc phát sinh gấp.
- Công việc nội bộ.
- Dự án sản xuất theo sản phẩm.
- Chiến dịch có ngày bắt đầu và kết thúc.

Nhân viên có thể tạo task nhưng task cần duyệt. Luồng cập nhật ưu tiên tích trạng thái, cập nhật theo dự án và tự lấy dữ liệu để giảm nhập tay.

## 3. Tình trạng production v3

| Phân hệ | Tình trạng | Nguồn dữ liệu |
|---|---|---|
| Task Kanban | Hoạt động | D1 |
| Import plan Dược Sĩ Giang | Hoạt động, 120 task | Snapshot JSON |
| Sheet Sync hai chiều | Hoạt động khi có Apps Script bridge | D1 + Google Sheets |
| Đối soát link Page/kênh | Gắn link và đánh dấu đã tìm thấy | D1, chưa gọi API kênh |
| Nhân sự | Thêm/sửa/kích hoạt/tạm ngưng | D1 |
| Dự án | UI mẫu | Hằng số frontend |
| Dashboard/KPI/thưởng | UI mẫu | Hằng số frontend |
| Content WIN | UI mẫu | Hằng số frontend |
| Facebook/TikTok Organic | Chưa có OAuth/API thật | Chưa tích hợp |
| Phân quyền nội bộ | Dựa trên access policy của Sites | Chưa có RBAC trong app |

## 4. Quyết định sản phẩm đã chốt

- Dùng đủ cho tất cả bộ phận ngay từ đầu.
- KPI dự án kết hợp mẫu có sẵn và bước phê duyệt.
- Marketing outcome tính chung cho team dự án.
- WIN content dựa trên top nội dung của dự án, điểm view–retention–tương tác, so với trung bình kênh và ngưỡng view cố định.
- Phân tích mong muốn: hiệu quả từng bài, format, độ dài, CTA, hook, chủ đề, nhân vật và gợi ý nhân bản.
- Quản lý khoảng 31–60 kênh Facebook/TikTok.
- Ưu tiên đầu tiên cho Organic Facebook/TikTok và số lượng bài đăng.

## 5. Việc nên làm tiếp theo

### P0 — biến demo thành hệ thống dùng thật

1. Đưa `projects` vào D1, có CRUD dự án, thành viên, deadline, loại hợp đồng và KPI dự án.
2. Thay quan hệ assignee dạng tên bằng `employee_id`; vẫn giữ tên hiển thị và migration dữ liệu cũ.
3. Đưa đánh giá chất lượng, deadline và điểm task vào D1; tính KPI theo kỳ tháng.
4. Bỏ số dashboard/KPI/thưởng mẫu; tất cả phải tính từ task, dự án và đánh giá thật.
5. Thêm RBAC: Giám đốc, quản lý chung, trưởng bộ phận, nhân viên.
6. Thêm audit log cho thay đổi task, duyệt chất lượng, chốt KPI và thưởng.

### P1 — Sheet và vận hành

1. Hỗ trợ cấu hình nhiều spreadsheet/project thay vì một integration cố định.
2. Cho phép mapping tab/cột từ UI và preview trước khi import.
3. Thêm lịch sync tự động, retry có kiểm soát và nhật ký lỗi.
4. Thêm webhook/trigger để Sheet cập nhật App mà không cần bấm “Đồng bộ”.
5. Thêm export, backup và khôi phục dữ liệu.

### P2 — Organic Intelligence

1. Kết nối OAuth Meta/Facebook và TikTok với quyền tối thiểu cần thiết.
2. Lưu kênh, bài đăng, metric snapshots và mapping task–post.
3. Tính WIN score theo baseline riêng của từng kênh và từng dự án.
4. Phân tích hook, topic, format, duration, CTA và talent.
5. Tạo task nhân bản từ content WIN và theo dõi hiệu quả các biến thể.

## 6. Giới hạn cần nói rõ với người dùng

- Gói này không chứa record D1 production.
- Dữ liệu Facebook/TikTok trong UI hiện là mô phỏng; chưa được đồng bộ API.
- File Drive ban đầu là XLSM. Muốn ghi hai chiều phải chuyển sang Google Sheets native.
- Apps Script bridge là giải pháp triển khai nhanh; production quy mô lớn nên dùng OAuth/Google Sheets API, quản lý secret phía server và hàng đợi sync.
- Các nút ở khu vực dự án/KPI/Content WIN có một số hành vi UI nhưng chưa đại diện cho workflow backend hoàn chỉnh.

## 7. Phiên bản source

- Production version: 3
- Git commit: `768924540de28c742233f509b08d8d33029896c1`
- Commit message: `Fix Sheet sync and add workforce management`
- Snapshot date: 03/08/2026

