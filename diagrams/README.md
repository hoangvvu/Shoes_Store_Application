# TÀI LIỆU SƠ ĐỒ THỰC THỂ MỐI QUAN HỆ (ERD DIAGRAMS)

Thư mục này chứa đầy đủ tài liệu thiết kế Cơ sở dữ liệu và Sơ đồ Thực thể Mối quan hệ (ERD) cho đồ án **Shoes Store App**:

## 1. CÁC TẬP TIN TRONG THƯ MỤC
- 🖼️ **`erd_diagram.png`**: Ảnh sơ đồ ERD độ phân giải siêu nét (**8622 x 5202 px, chuẩn 8K+**), màu sắc trực quan, phân vùng theo domain nghiệp vụ. Bạn có thể chèn trực tiếp ảnh này vào Báo cáo Đồ án môn CNPM (Word, PowerPoint, PDF).
- 📝 **`erd_spec.md`**: Bản đặc tả chi tiết toàn bộ 25 bảng, các trường (Fields), kiểu dữ liệu (Data types), khóa chính (PK), khóa ngoại (FK), ràng buộc (UK) và cú pháp Mermaid code.
- 🌐 **`erd_viewer.html`**: Giao diện Web tương tác trực quan xem ảnh ERD với tính năng Zoom / Pan (phóng to, thu nhỏ, kéo thả xem chi tiết từng bảng).
- 🐍 **`generate_erd.py`**: Mã nguồn Python sử dụng `matplotlib` và `Pillow` để tự động vẽ và xuất ảnh ERD.

## 2. PHÂN VÙNG CÁC NHÓM THỰC THỂ (DOMAIN MODULES)
1. 🟣 **RBAC - Phân quyền & Quản lý vai trò (Indigo/Tím than)**:
   - **`ROLES`**: Quản lý danh mục các vai trò trong hệ thống (Super Admin, Quản lý kho, Nhân viên bán hàng, Kế toán, Chăm sóc khách hàng, Khách hàng). Có cờ `is_system` để bảo vệ vai trò gốc.
   - **`PERMISSIONS`**: Danh mục các quyền hạn chi tiết trong hệ thống theo mã code và module (VD: `PRODUCT_CREATE`, `ORDER_APPROVE`, `REVENUE_VIEW`, `REVIEW_MODERATE`...).
   - **`ROLE_PERMISSIONS`**: Bảng trung gian phân quyền — cho phép Quản trị viên tùy biến chỉnh sửa phân quyền cho từng vai trò linh hoạt.
2. 🔵 **Users & Authentication (Xanh dương)**: `USERS` (liên kết `role_id`), `USER_ADDRESSES`, `NOTIFICATIONS`, `WISHLISTS`.
3. 🟢 **Catalog & Products (Xanh lá cây)**: `CATEGORIES`, `BRANDS`, `SUPPLIERS`, `PRODUCTS`, `PRODUCT_IMAGES`.
4. 🟣 **Variants & Warehousing (Tím)**: `PRODUCT_VARIANTS` (Quản lý riêng từng Size 36-45 và Màu sắc), `INVENTORY_TRANSACTIONS`, `CART_ITEMS`, `VOUCHERS`, `BANNERS`.
5. 🟠 **Orders & Payments (Vàng cam)**: `ORDERS` (COD, MoMo, VietQR), `ORDER_ITEMS`, `USER_RECOMMENDATIONS` (Service AI Recommender).
6. 🔴 **Đánh giá sản phẩm đã mua (Reviews & Feedback - Đỏ hồng)**:
   - **`REVIEWS`**: Đánh giá 1-5 sao, nhận xét chi tiết, độ vừa vặn form giày (`fit_feedback`), phân tích cảm xúc AI NLP (`sentiment_label`, `sentiment_score`), ghim đánh giá hay (`is_pinned`), đếm lượt like (`helpful_count`).
   - **`REVIEW_IMAGES`**: Bộ sưu tập hình ảnh thực tế của người mua đính kèm.
   - **`REVIEW_REPLIES`**: Phản hồi chính thức từ Shop/Admin đối với đánh giá của khách.
   - **`REVIEW_HELPFUL_VOTES`**: Lưu lại người dùng đã bấm vote "Hữu ích" cho đánh giá.
7. 🔷 **Bình luận & Hỏi đáp cộng đồng (Comments & Q&A - Xanh dương nhạt)**:
   - **`PRODUCT_COMMENTS`**: Mọi khách hàng có thể đặt câu hỏi thắc mắc về size giày, bảo quản, chất liệu ngay tại trang sản phẩm.
   - Hỗ trợ thảo luận đa cấp theo luồng (`parent_id`), gắn cờ câu trả lời của Shop (`is_staff_reply`) và ghim câu hỏi phổ biến (`is_pinned`).
