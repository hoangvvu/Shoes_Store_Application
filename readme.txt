================================================================================
          HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH DỰ ÁN - SHOES STORE APP
       (Hệ Thống Quản Lý & Bán Giày Thể Thao Đa Nền Tảng Kết Hợp AI)
                           ĐỒ ÁN MÔN HỌC: CNPM
================================================================================

Tài liệu này dành cho tất cả các thành viên trong nhóm phát triển để thiết lập
môi trường, kết nối cơ sở dữ liệu và vận hành hệ thống một cách nhanh chóng nhất.

--------------------------------------------------------------------------------
1. YÊU CẦU MÔI TRƯỜNG TRƯỚC KHI CÀI ĐẶT (PREREQUISITES)
--------------------------------------------------------------------------------
Trước khi bắt đầu, máy tính của bạn cần cài đặt sẵn:
- Node.js: Phiên bản v18.x trở lên (Khuyên dùng v20.x hoặc v22.x/v24.x).
  Kiểm tra: node -v && npm -v
- Git: Dùng để clone mã nguồn và đồng bộ code nhóm.
- Visual Studio Code (hoặc IDE tương đương).
- Các Extensions VS Code KHUYÊN DÙNG để tăng tốc độ làm việc:
  + Prisma (Hỗ trợ highlight cú pháp schema.prisma)
  + REST Client (Hỗ trợ chạy trực tiếp file test/api_test.http không cần Postman)
  + Prettier - Code formatter

--------------------------------------------------------------------------------
2. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN BƯỚC-TỪNG-BƯỚC (QUICK START)
--------------------------------------------------------------------------------

BƯỚC 1: LẤY MÃ NGUỒN VỀ MÁY
Mở terminal và di chuyển vào thư mục dự án:
  git clone <link-repo-nhom-cua-ban>
  cd ShoesStoreApp

BƯỚC 2: CẤU HÌNH BIẾN MÔI TRƯỜNG CHO BACKEND (.env)
- Di chuyển vào thư mục backend:
  cd backend
- Kiểm tra xem đã có file ".env" chưa. Nếu chưa, hãy tạo file ".env" từ file
  ".env.example" có sẵn:
  copy .env.example .env   (trên Windows)
  cp .env.example .env     (trên Linux/macOS)
- Trong file ".env", dự án đã được tích hợp sẵn Cơ sở dữ liệu Cloud
  Serverless PostgreSQL (Neon.tech). Bạn KHÔNG CẦN phải cài đặt PostgreSQL
  hay Docker nặng máy:
  DATABASE_URL="postgresql://shoes_store_db_owner:npg_mVxnfeIo5Uj7@ep-quiet-math-b3zixfr5-pooler.c-4.ap-southeast-1.aws.neon.tech/shoes_store_db?channel_binding=require&sslmode=require"
  DIRECT_URL="postgresql://shoes_store_db_owner:npg_mVxnfeIo5Uj7@ep-quiet-math-b3zixfr5.c-4.ap-southeast-1.aws.neon.tech/shoes_store_db?channel_binding=require&sslmode=require"

BƯỚC 3: CÀI ĐẶT CÁC THƯ VIỆN PHỤ THUỘC (DEPENDENCIES)
Chạy lệnh sau tại thư mục backend:
  npm install

BƯỚC 4: SINH CLIENT & ĐỒNG BỘ CƠ SỞ DỮ LIỆU (PRISMA)
Chạy các lệnh sau để đảm bảo 25 bảng ERD và Prisma Client được đồng bộ:
  # 1. Sinh Prisma Client mã nguồn:
  npx prisma generate

  # 2. Đồng bộ lược đồ bảng lên cơ sở dữ liệu:
  npx prisma db push

  # 3. Nạp dữ liệu mẫu ban đầu (Tài khoản admin, giày mẫu, size 38-44):
  npm run prisma:seed
  (hoặc: node prisma/seeds/seed.js)

BƯỚC 5: XEM & QUẢN LÝ DỮ LIỆU BẰNG GIAO DIỆN ĐỒ HỌA (PRISMA STUDIO)
Chạy lệnh:
  npx prisma studio
Trình duyệt web sẽ tự động mở tại địa chỉ:
  👉 http://localhost:5555
Tại đây bạn có thể xem, thêm, sửa, xóa dữ liệu của toàn bộ 25 bảng trực quan!

--------------------------------------------------------------------------------
3. THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP MẪU TRÊN HỆ THỐNG
--------------------------------------------------------------------------------
Sau khi chạy seed, hệ thống đã có sẵn 3 tài khoản mặc định để kiểm thử:

1. QUẢN TRỊ VIÊN TỐI CAO (SUPER ADMIN):
   - Email    : admin@shoesstore.com
   - Mật khẩu : Admin@123456
   - Quyền hạn: Toàn quyền quản trị, phân quyền, cấu hình ma trận vai trò.

2. NHÂN VIÊN BÁN HÀNG (SALES STAFF):
   - Email    : staff@shoesstore.com
   - Mật khẩu : Admin@123456
   - Quyền hạn: Quản lý sản phẩm, duyệt đơn hàng, voucher, chăm sóc khách.

3. KHÁCH HÀNG (CUSTOMER):
   - Email    : customer@gmail.com
   - Mật khẩu : Customer@123456
   - Địa chỉ  : 123 Nguyễn Huệ, Quận 1, TP. HCM (Đã có sẵn địa chỉ nhận hàng).

--------------------------------------------------------------------------------
4. CÁC LỆNH THƯỜNG DÙNG TRONG THƯ MỤC BACKEND
--------------------------------------------------------------------------------
- npm run dev           : Khởi chạy Backend Server ở chế độ Live-reload.
- npm run test:api      : [MỚI] Chạy script kiểm thử tự động toàn bộ 28 ca kiểm thử API.
- npx prisma studio     : Mở trang Web quản lý dữ liệu Database trực quan.
- npm run prisma:seed   : Nạp lại toàn bộ dữ liệu mẫu khởi tạo.
- npx prisma db push    : Cập nhật schema.prisma mới lên cơ sở dữ liệu.

--------------------------------------------------------------------------------
5. CÁCH KIỂM THỬ API HỆ THỐNG
--------------------------------------------------------------------------------
CÁCH 1: CHẠY SCRIPT KIỂM THỬ TỰ ĐỘNG (KHUYÊN DÙNG)
Chạy trực tiếp lệnh tại thư mục backend:
  npm run test:api
Script sẽ tự động khởi chạy máy chủ test, gửi request kiểm tra:
  + Đăng nhập Admin, Khách hàng & chặn sai mật khẩu.
  + RBAC: Danh sách vai trò & quyền hạn chi tiết.
  + Sản phẩm: Lấy danh sách, chi tiết size 38-44, Thêm mới, Sửa (chuẩn hóa mô tả), Khóa & Mở khóa.
  + Chặn khách hàng không có quyền tạo sản phẩm (HTTP 403).
  + Nhà cung cấp: Thêm mới, Sửa, Ràng buộc chống trùng lặp Tên/Email/SĐT (HTTP 409),
    Ràng buộc toàn vẹn chặn xóa NCC đang có sản phẩm liên kết (HTTP 400), Xóa thành công.
  + Voucher: Thêm mới, Sửa, Khóa, Mở khóa & chặn áp dụng mã đã bị khóa (HTTP 400).
  + Lịch sử đơn hàng của khách.
Xuất bảng tổng kết 28/28 [PASS/FAIL] có màu sắc trực quan!

CÁCH 2: KIỂM THỬ BẰNG REST CLIENT TRONG VS CODE
1. Cài Extension "REST Client" (tác giả Huachao Mao) trên VS Code.
2. Mở tập tin: backend/test/api_test.http
3. Bấm chữ "Send Request" hiển thị ngay trên từng dòng endpoint (Login, CRUD Giày,
   Khóa/Mở khóa sản phẩm, CRUD Nhà cung cấp, CRUD Voucher, Đơn hàng...) để xem kết quả.



--------------------------------------------------------------------------------
6. SAO LƯU VÀ PHỤC HỒI CƠ SỞ DỮ LIỆU (DÀNH CHO BÁO CÁO ĐỒ ÁN)
--------------------------------------------------------------------------------
Trong thư mục backend/backup/ có sẵn 2 script PowerShell phục vụ demo đồ án:
- Sao lưu dữ liệu : powershell -File backup/backup.ps1
- Phục hồi dữ liệu: powershell -File backup/restore.ps1 -BackupFile <duong-dan-file.sql>

--------------------------------------------------------------------------------
7. CẤU TRÚC THƯ MỤC TOÀN BỘ DỰ ÁN
--------------------------------------------------------------------------------
ShoesStoreApp/
├── .gitignore                # Danh mục các tệp bảo mật & rác bị ẩn khi đẩy lên Git
├── readme.txt                # Hướng dẫn cài đặt và sử dụng (Tệp này)
├── PROJECT_STRUCTURE.md      # Tài liệu kiến trúc và kế hoạch phân chia module chi tiết
├── neon.ts                   # Cấu hình chính sách hạ tầng Cloud Neon
├── backend/                  # Mã nguồn Backend API Core (Express, Prisma, PostgreSQL)
│   ├── .env                  # Tệp lưu trữ chuỗi kết nối bí mật (ĐÃ BỊ CHẶN BỞI .gitignore)
│   ├── .env.example          # Tệp mẫu cấu hình không chứa mật khẩu thực tế
│   ├── prisma/
│   │   ├── schema.prisma     # Thiết kế 25 bảng ERD chuẩn hóa
│   │   └── seeds/seed.js     # Script nạp dữ liệu mẫu
│   ├── backup/               # Script sao lưu / phục hồi dữ liệu
│   └── test/api_test.http    # Kiểm thử API tiện lợi
├── diagrams/                 # Sơ đồ ERD độ nét 8K và tài liệu thiết kế CSDL
│   ├── erd_diagram.png       # Ảnh sơ đồ quan hệ thực thể 25 bảng
│   ├── erd_spec.md           # Đặc tả chi tiết từng trường dữ liệu
│   └── erd_viewer.html       # Web tương tác phóng to/thu nhỏ sơ đồ ERD
└── docs/                     # Tài liệu phục vụ nộp báo cáo đồ án
    └── database/
        └── data-dictionary.md# Từ điển dữ liệu 25 bảng (Độ dài, kiểu dữ liệu, PK/FK)

--------------------------------------------------------------------------------
8. QUY ƯỚC PHÁT TRIỂN & BẢO MẬT TRONG NHÓM
--------------------------------------------------------------------------------
- Tập tin ".gitignore" đã được thiết lập để tự động bỏ qua:
  + Tất cả các file ".env", ".env.local" chứa mật khẩu Database.
  + Thư mục "node_modules/", file tạm và bản dump sao lưu cơ sở dữ liệu.
- Khi sửa đổi cấu trúc bảng: Luôn cập nhật trong "backend/prisma/schema.prisma",
  sau đó chạy "npx prisma generate" và thông báo cho cả nhóm.
- Đọc kỹ tài liệu "PROJECT_STRUCTURE.md" để nắm rõ trách nhiệm của từng phân hệ
  trước khi viết code.

Chúc nhóm hoàn thành xuất sắc đồ án môn học!
================================================================================
