ĐỌC THẬT KĨ PHẢI DOCX

CÁCH CÀI NGROK ĐỂ SỬ DỤNG TUNNEL

Bước 1:
Kiểm tra phiên bản Ngrok: Kiểm tra công cụ. Đảm bảo máy tính đã cài đặt ngrok phiên bản mới nhất (từ 3.20.0 trở lên). 

Chạy lệnh: PowerShell ngrok --version

Cách kiểm tra: Terminal trả về số phiên bản ngrok từ 3.20.0 trở lên (nếu cũ hơn, hãy tải bản mới tại ngrok.com/download)


Bước 2:
Lấy và cấu hình Ngrok Authtoken:Lấy mã xác thực.

Truy cập vào trang chủ ngrok.com và đăng nhập vào tài khoản ngrok.

Tại trang Dashboard chính, tìm mục Your Authtoken và copy chuỗi mã dài (ví dụ: 3KV9Smoo...).

Mở cửa sổ Terminal (PowerShell hoặc CMD) trên máy của bạn và chạy lệnh sau để lưu token:

PowerShellngrok config add-authtoken <DÁN_TOKEN_VỪA_COPY_VÀO_ĐÂY>


Bước 3: 

Dán tên miền tĩnh vào file .env: Cấu hình API Mobile.

Mở thư mục dự án mobile, tìm file tên là .env (nếu chưa có thì tạo file .env ở thư mục gốc của mobile).

Dán đường dẫn tên miền tĩnh chung của nhóm vào biến EXPO_PUBLIC_API_URL:envEXPO_PUBLIC_API_URL=https://MA_NGROK/api/v1

Bước 4: 
Khởi động Backend, Ngrok và Mobile App:Chạy dự án.

Bật Backend & SQL Server: Mở terminal tại thư mục backend, đảm bảo server đang chạy ở cổng 5000.

Bật Ngrok Tunnel: Vẫn tại thư mục backend, chạy câu lệnh rút gọn để bật đường hầm:Bash npm run ngrok

Bật Mobile App: Mở terminal tại thư mục mobile, chạy lệnh sau để khởi động Expo kèm chế độ tunnel:Bashnpx expo start -c --tunnel

Cách kiểm tra: Dùng điện thoại ngắt Wi-Fi nhà chuyển sang 4G/5G, mở app qua Expo Go, quét mã QR và thao tác gọi dữ liệu thành công (đồng thời màn hình backend hiện log request).

CÁCH TẢI VÀ CHẠY PROJECT

Tải như cũ vẫn là npm install

Ở cd database
Chạy .sql dán kết nối theo chuẩn file. .env.example
npm run migrate
npm run seed

Ở cd backend
Sau khi npm install -> npm start
mở 1 terminal khác cd backend luôn và chạy npm run ngrok

Ở cd admin 
npm run dev

Ở cd mobile (Tải expo go)
npm install
npx expo run --tunnel