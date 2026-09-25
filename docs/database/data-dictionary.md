# TỪ ĐIỂN DỮ LIỆU (DATA DICTIONARY) - SHOES STORE APP
*(Hệ thống Quản lý và Bán giày Thể thao Đa nền tảng)*

Tài liệu mô tả chi tiết toàn bộ **25 bảng cơ sở dữ liệu (PostgreSQL)**, các trường (Columns), kiểu dữ liệu (Data Types), khóa chính (PK), khóa ngoại (FK) và ý nghĩa nghiệp vụ theo chuẩn Prisma Schema.

---

## 1. NHÓM PHÂN QUYỀN (RBAC) & NGƯỜI DÙNG

### 1.1. Bảng `roles` (Vai trò)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default `uuid()` | Khóa chính vai trò |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Tên vai trò: `SUPER_ADMIN`, `SALES_STAFF`, `WAREHOUSE_STAFF`, `CUSTOMER` |
| `description` | VARCHAR(255) | NULL | Diễn giải chức năng vai trò |
| `is_system` | BOOLEAN | Default `false` | Cờ bảo vệ vai trò gốc (không cho phép xóa) |
| `created_at` | TIMESTAMP | Default `NOW()` | Ngày tạo |

### 1.2. Bảng `permissions` (Quyền hạn chi tiết)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default `uuid()` | Khóa chính quyền |
| `name` | VARCHAR(100) | NOT NULL | Tên quyền hiển thị (Quản lý sản phẩm, Duyệt đơn...) |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã định danh quyền (VD: `PRODUCT_MANAGE`, `ORDER_APPROVE`) |
| `module` | VARCHAR(50) | NOT NULL | Nhóm phân hệ (PRODUCT, ORDER, INVENTORY, USER, REVIEW, RBAC) |
| `description` | VARCHAR(255) | NULL | Diễn giải chi tiết quyền hạn |

### 1.3. Bảng `role_permissions` (Ma trận phân quyền)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default `uuid()` | Khóa chính bảng trung gian |
| `role_id` | UUID | FK -> `roles.id` | Vai trò được gán |
| `permission_id` | UUID | FK -> `permissions.id` | Quyền được trao |
| *Ràng buộc* | UNIQUE (`role_id`, `permission_id`) | | Mỗi quyền chỉ gán cho 1 vai trò 1 lần |

### 1.4. Bảng `users` (Tài khoản người dùng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default `uuid()` | Khóa chính người dùng |
| `role_id` | UUID | FK -> `roles.id` | Vai trò của tài khoản |
| `full_name` | VARCHAR(100) | NOT NULL | Họ và tên |
| `email` | VARCHAR(150) | UNIQUE, NOT NULL | Địa chỉ email đăng nhập |
| `password_hash`| VARCHAR(255) | NOT NULL | Mật khẩu mã hóa BCrypt |
| `phone` | VARCHAR(20) | NULL | Số điện thoại |
| `avatar_url` | TEXT | NULL | Đường dẫn ảnh đại diện |
| `is_active` | BOOLEAN | Default `true` | Trạng thái hoạt động (Khóa/Mở khóa) |
| `created_at` | TIMESTAMP | Default `NOW()` | Ngày tạo tài khoản |
| `updated_at` | TIMESTAMP | Auto update | Ngày cập nhật gần nhất |

### 1.5. Bảng `user_addresses` (Sổ địa chỉ nhận hàng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default `uuid()` | Khóa chính địa chỉ |
| `user_id` | UUID | FK -> `users.id` | Người sở hữu địa chỉ |
| `recipient_name` | VARCHAR(100) | NOT NULL | Tên người nhận hàng |
| `recipient_phone`| VARCHAR(20) | NOT NULL | SĐT người nhận |
| `street_address` | VARCHAR(255) | NOT NULL | Số nhà, tên đường |
| `ward` | VARCHAR(100) | NULL | Phường / Xã |
| `district` | VARCHAR(100) | NULL | Quận / Huyện |
| `province_city` | VARCHAR(100) | NOT NULL | Tỉnh / Thành phố |
| `is_default` | BOOLEAN | Default `false` | Đặt làm địa chỉ mặc định |

---

## 2. NHÓM DANH MỤC & SẢN PHẨM GIÀY

### 2.1. Bảng `categories` (Danh mục sản phẩm)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính danh mục |
| `name` | VARCHAR(100) | NOT NULL | Tên danh mục (Sneaker, Chạy bộ, Sandal...) |
| `slug` | VARCHAR(120) | UNIQUE, NOT NULL | Đường dẫn thân thiện SEO |
| `description` | TEXT | NULL | Mô tả danh mục |
| `image_url` | TEXT | NULL | Ảnh minh họa danh mục |
| `is_active` | BOOLEAN | Default `true` | Ẩn/Hiện danh mục |

### 2.2. Bảng `brands` (Thương hiệu)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính thương hiệu |
| `name` | VARCHAR(100) | NOT NULL | Tên thương hiệu (Nike, Adidas, Puma...) |
| `slug` | VARCHAR(120) | UNIQUE, NOT NULL | Slug thương hiệu |
| `logo_url` | TEXT | NULL | Ảnh logo thương hiệu |
| `description` | TEXT | NULL | Lịch sử / Mô tả thương hiệu |

### 2.3. Bảng `suppliers` (Nhà cung cấp)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính nhà cung cấp |
| `name` | VARCHAR(150) | NOT NULL | Tên nhà cung cấp nguồn hàng |
| `contact_email`| VARCHAR(150) | NULL | Email liên hệ |
| `phone` | VARCHAR(20) | NULL | SĐT liên hệ |
| `address` | VARCHAR(255) | NULL | Địa chỉ trụ sở |

### 2.4. Bảng `products` (Sản phẩm giày)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính sản phẩm |
| `category_id` | UUID | FK -> `categories.id` | Thuộc danh mục |
| `brand_id` | UUID | FK -> `brands.id` | Thuộc thương hiệu |
| `supplier_id` | UUID | FK -> `suppliers.id` | Thuộc nhà cung cấp (tùy chọn) |
| `name` | VARCHAR(200) | NOT NULL | Tên mẫu giày |
| `slug` | VARCHAR(250) | UNIQUE, NOT NULL | Slug sản phẩm |
| `description` | TEXT | NULL | Mô tả chi tiết chất liệu, công nghệ đế |
| `gender` | VARCHAR(20) | Default `'UNISEX'` | Phân loại giới tính: MEN, WOMEN, UNISEX, KIDS |
| `base_price` | DECIMAL(12,2)| NOT NULL | Giá cơ sở niêm yết (VND) |
| `size_guide_url`| TEXT | NULL | Link ảnh bảng quy đổi kích thước chân chuẩn |
| `is_active` | BOOLEAN | Default `true` | Đang mở bán hay tạm ngưng |
| `created_at` | TIMESTAMP | Default `NOW()` | Ngày thêm sản phẩm |

### 2.5. Bảng `product_variants` (Biến thể Size & Màu sắc ngành Giày)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính biến thể |
| `product_id` | UUID | FK -> `products.id` | Mẫu giày tương ứng |
| `sku` | VARCHAR(50) | UNIQUE, NOT NULL | Mã vạch SKU phân biệt (VD: `NIKE-AF1-WHT-42`) |
| `size` | VARCHAR(10) | NOT NULL | Kích thước giày: `38`, `39`, `40`, `41`, `42`, `43`, `44`... |
| `color` | VARCHAR(50) | NOT NULL | Tên màu sắc: Trắng, Đen, Xanh Navy... |
| `price` | DECIMAL(12,2)| NOT NULL | Giá bán thực tế của biến thể (VND) |
| `stock_quantity`| INT | Default `0` | Số lượng tồn kho hiện có của Size/Màu này |
| `image_url` | TEXT | NULL | Ảnh đặc trưng riêng theo màu |
| `is_active` | BOOLEAN | Default `true` | Trạng thái kinh doanh biến thể |

### 2.6. Bảng `product_images` (Bộ sưu tập ảnh sản phẩm)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính ảnh |
| `product_id` | UUID | FK -> `products.id` | Sản phẩm chứa ảnh |
| `image_url` | TEXT | NOT NULL | Đường dẫn ảnh CDN (Cloudinary / S3) |
| `is_thumbnail` | BOOLEAN | Default `false` | Ảnh đại diện chính |
| `sort_order` | INT | Default `0` | Thứ tự sắp xếp hiển thị |

---

## 3. NHÓM ĐƠN HÀNG, KHO & THANH TOÁN

### 3.1. Bảng `vouchers` (Mã giảm giá)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính voucher |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã nhập voucher (VD: `WELCOME10`) |
| `title` | VARCHAR(150) | NOT NULL | Tiêu đề chương trình giảm giá |
| `discount_type`| VARCHAR(20) | NOT NULL | Loại giảm: `PERCENT` (theo %) hoặc `FIXED_AMOUNT` (số tiền cố định) |
| `discount_value`| DECIMAL(12,2)| NOT NULL | Giá trị giảm (10% hoặc 50.000 đ) |
| `min_order_value`| DECIMAL(12,2)| Default `0` | Giá trị đơn tối thiểu để áp dụng |
| `max_discount_amount`| DECIMAL(12,2)| NULL | Mức giảm tối đa (với giảm %) |
| `usage_limit` | INT | Default `100` | Tổng lượt dùng tối đa |
| `used_count` | INT | Default `0` | Số lượt đã sử dụng |
| `start_date` | TIMESTAMP | NOT NULL | Ngày bắt đầu |
| `end_date` | TIMESTAMP | NOT NULL | Ngày hết hạn |
| `is_active` | BOOLEAN | Default `true` | Trạng thái kích hoạt |

### 3.2. Bảng `orders` (Đơn đặt hàng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính đơn hàng |
| `order_code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã đơn hàng (VD: `ORD-2026-0001`) |
| `user_id` | UUID | FK -> `users.id` | Khách hàng đặt mua |
| `voucher_id` | UUID | FK -> `vouchers.id` (NULL)| Voucher áp dụng nếu có |
| `recipient_name`| VARCHAR(100)| NOT NULL | Tên người nhận |
| `recipient_phone`| VARCHAR(20)| NOT NULL | SĐT người nhận |
| `shipping_address`| VARCHAR(255)| NOT NULL | Địa chỉ giao hàng đầy đủ |
| `payment_method`| VARCHAR(20)| Default `'COD'` | Phương thức: `COD`, `MOMO`, `VIETQR` |
| `payment_status`| VARCHAR(20)| Default `'UNPAID'` | Trạng thái: `UNPAID`, `PAID`, `REFUNDED` |
| `order_status` | VARCHAR(20)| Default `'PENDING'` | Tiến trình: `PENDING`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED` |
| `subtotal_amount`| DECIMAL(12,2)| NOT NULL | Tiền hàng ban đầu |
| `discount_amount`| DECIMAL(12,2)| Default `0` | Tiền giảm giá |
| `shipping_fee` | DECIMAL(12,2)| Default `0` | Phí vận chuyển |
| `total_amount` | DECIMAL(12,2)| NOT NULL | Tổng thanh toán cuối cùng |
| `notes` | TEXT | NULL | Ghi chú của khách khi đặt hàng |
| `created_at` | TIMESTAMP | Default `NOW()` | Ngày đặt hàng |

### 3.3. Bảng `order_items` (Chi tiết mặt hàng trong đơn)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính chi tiết |
| `order_id` | UUID | FK -> `orders.id` | Thuộc đơn hàng nào |
| `variant_id` | UUID | FK -> `product_variants.id`| Biến thể giày được mua |
| `product_name` | VARCHAR(200)| NOT NULL | Snapshot tên giày tại thời điểm mua |
| `size` | VARCHAR(10) | NOT NULL | Snapshot size giày đã chọn |
| `color` | VARCHAR(50) | NOT NULL | Snapshot màu sắc |
| `unit_price` | DECIMAL(12,2)| NOT NULL | Đơn giá tại thời điểm mua |
| `quantity` | INT | Default `1` | Số lượng mua |
| `total_price` | DECIMAL(12,2)| NOT NULL | Thành tiền (`unit_price * quantity`) |

### 3.4. Bảng `inventory_transactions` (Lịch sử biến động kho)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính phiếu kho |
| `variant_id` | UUID | FK -> `product_variants.id`| Biến thể phát sinh biến động |
| `staff_id` | UUID | FK -> `users.id` | Nhân viên kho thực hiện |
| `type` | VARCHAR(20) | NOT NULL | Loại: `IMPORT` (nhập hàng), `EXPORT_ORDER` (xuất đơn), `ADJUSTMENT` (kiểm kê lệch) |
| `quantity` | INT | NOT NULL | Số lượng biến động (+ hoặc -) |
| `notes` | TEXT | NULL | Lý do điều chỉnh, số phiếu nhập |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời điểm giao dịch |

### 3.5. Bảng `cart_items` (Giỏ hàng người dùng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính giỏ hàng |
| `user_id` | UUID | FK -> `users.id` | Chủ sở hữu giỏ hàng |
| `variant_id` | UUID | FK -> `product_variants.id`| Biến thể size/màu đã chọn |
| `quantity` | INT | Default `1` | Số lượng |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian thêm vào giỏ |
| *Ràng buộc* | UNIQUE (`user_id`, `variant_id`)| | Một người chỉ có 1 dòng cho cùng 1 biến thể |

### 3.6. Bảng `wishlists` (Danh sách yêu thích)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính mục yêu thích |
| `user_id` | UUID | FK -> `users.id` | Người dùng thích |
| `product_id` | UUID | FK -> `products.id` | Mẫu giày được thích |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian bấm thích |
| *Ràng buộc* | UNIQUE (`user_id`, `product_id`)| | Tránh trùng lặp yêu thích |

---

## 4. NHÓM ĐÁNH GIÁ, HỎI ĐÁP & TRÍ TUỆ NHÂN TẠO AI

### 4.1. Bảng `reviews` (Đánh giá sau khi mua)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính đánh giá |
| `user_id` | UUID | FK -> `users.id` | Khách hàng đánh giá |
| `product_id` | UUID | FK -> `products.id` | Sản phẩm được đánh giá |
| `order_item_id`| UUID | FK -> `order_items.id`, UNIQUE | Đảm bảo chỉ đánh giá sau khi nhận hàng thực tế (Verified Purchase) |
| `rating` | INT | CHECK (1-5) | Số sao đánh giá (1 đến 5 sao) |
| `comment` | TEXT | NULL | Nội dung nhận xét chi tiết |
| `fit_feedback` | VARCHAR(30) | NULL | Đánh giá độ vừa size: `RUNS_SMALL` (chật), `TRUE_TO_SIZE` (vừa in), `RUNS_LARGE` (rộng) |
| `sentiment_label`| VARCHAR(20)| NULL | Nhãn AI NLP gán tự động: `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| `sentiment_score`| FLOAT | NULL | Điểm tự tin của mô hình AI (0.0 đến 1.0) |
| `helpful_count`| INT | Default `0` | Số lượt like/vote hữu ích |
| `is_pinned` | BOOLEAN | Default `false` | Ghim đánh giá chất lượng lên đầu |
| `is_visible` | BOOLEAN | Default `true` | Trạng thái hiển thị (cho phép ẩn đánh giá vi phạm) |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian gửi đánh giá |

### 4.2. Bảng `review_images` (Ảnh chụp sản phẩm thực tế của khách)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính ảnh |
| `review_id` | UUID | FK -> `reviews.id` | Thuộc đánh giá nào |
| `image_url` | TEXT | NOT NULL | Link ảnh chụp thực tế trên chân |

### 4.3. Bảng `review_replies` (Phản hồi chính thức từ Shop)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính phản hồi |
| `review_id` | UUID | FK -> `reviews.id` | Đánh giá được phản hồi |
| `staff_id` | UUID | FK -> `users.id` | Nhân viên/Admin viết phản hồi |
| `reply_text` | TEXT | NOT NULL | Nội dung cảm ơn hoặc giải đáp khiếu nại |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian gửi phản hồi |

### 4.4. Bảng `review_helpful_votes` (Lượt bình chọn đánh giá hữu ích)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính lượt vote |
| `review_id` | UUID | FK -> `reviews.id` | Đánh giá nhận vote |
| `user_id` | UUID | FK -> `users.id` | Khách hàng bấm vote |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian bấm |
| *Ràng buộc* | UNIQUE (`review_id`, `user_id`)| | Mỗi khách hàng chỉ vote 1 lần cho 1 đánh giá |

### 4.5. Bảng `product_comments` (Bình luận & Hỏi đáp công khai Q&A)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính câu hỏi/bình luận |
| `product_id` | UUID | FK -> `products.id` | Hỏi tại trang sản phẩm nào |
| `user_id` | UUID | FK -> `users.id` | Người hỏi/bình luận |
| `parent_id` | UUID | FK -> `product_comments.id` (NULL)| Hỗ trợ phản hồi theo luồng đa cấp (Threaded) |
| `content` | TEXT | NOT NULL | Nội dung hỏi đáp thắc mắc về size, form dáng |
| `is_staff_reply`| BOOLEAN | Default `false` | Đánh dấu câu trả lời chính thức từ Shop |
| `is_pinned` | BOOLEAN | Default `false` | Ghim câu hỏi phổ biến lên đầu trang |
| `is_visible` | BOOLEAN | Default `true` | Bộ lọc chống spam thô tục |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian gửi |

### 4.6. Bảng `user_recommendations` (Bảng lưu trữ gợi ý từ AI Recommender Engine)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính bản ghi gợi ý |
| `user_id` | UUID | FK -> `users.id` | Khách hàng nhận gợi ý |
| `product_id` | UUID | FK -> `products.id` | Mẫu giày do AI đề xuất |
| `match_score` | FLOAT | NOT NULL | Độ tương đồng (0.0 đến 1.0) |
| `algorithm` | VARCHAR(30) | NOT NULL | Thuật toán sinh ra: `COLLABORATIVE`, `CONTENT_BASED`, `HYBRID` |
| `updated_at` | TIMESTAMP | Auto update | Thời điểm tính toán lại gợi ý |
| *Ràng buộc* | UNIQUE (`user_id`, `product_id`)| | Một đôi giày chỉ xuất hiện 1 lần trong danh sách gợi ý của 1 khách |

### 4.7. Bảng `banners` (Banner quảng cáo ứng dụng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính banner |
| `title` | VARCHAR(150) | NOT NULL | Tiêu đề banner |
| `image_url` | TEXT | NOT NULL | Link ảnh banner slider |
| `link_url` | TEXT | NULL | Điều hướng khi bấm vào banner |
| `sort_order` | INT | Default `0` | Thứ tự xuất hiện |
| `is_active` | BOOLEAN | Default `true` | Trạng thái hiển thị |
| `created_at` | TIMESTAMP | Default `NOW()` | Ngày tạo |

### 4.8. Bảng `notifications` (Thông báo người dùng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Khóa chính thông báo |
| `user_id` | UUID | FK -> `users.id` | Người nhận thông báo |
| `title` | VARCHAR(150) | NOT NULL | Tiêu đề thông báo |
| `body` | TEXT | NOT NULL | Nội dung chi tiết |
| `type` | VARCHAR(30) | NOT NULL | Loại: `ORDER`, `REVIEW_REPLY`, `COMMENT_REPLY`, `PROMO`, `SYSTEM` |
| `reference_id`| VARCHAR(100) | NULL | ID tham chiếu (mã đơn hàng, mã review...) |
| `is_read` | BOOLEAN | Default `false` | Đã đọc hay chưa |
| `created_at` | TIMESTAMP | Default `NOW()` | Thời gian nhận thông báo |
