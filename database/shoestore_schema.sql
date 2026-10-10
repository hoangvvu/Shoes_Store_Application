SET NOCOUNT ON;
GO
IF DB_ID(N'ShoeStore') IS NULL CREATE DATABASE ShoeStore COLLATE Vietnamese_CI_AS;
GO
USE ShoeStore;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------------------------------------------------------------------
   1. TÀI KHOẢN & PHÂN QUYỀN
   --------------------------------------------------------------------- */
-- Vai trò gắn cứng với loại người dùng -> khách không thể mang vai trò ADMIN
CREATE TABLE roles (
    role_id     INT IDENTITY(1,1) PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE,                -- ADMIN, STAFF, CUSTOMER
    user_type   VARCHAR(10) NOT NULL,
    description NVARCHAR(200) NULL,
    CONSTRAINT ck_roles_user_type CHECK (user_type IN ('EMPLOYEE','CUSTOMER')),
    CONSTRAINT uq_roles_id_type   UNIQUE (role_id, user_type)
);

-- NV
CREATE TABLE employees (
    employee_id   INT IDENTITY(1,1) PRIMARY KEY,            -- MaNV
    full_name     NVARCHAR(100) NOT NULL,                   -- Họ tên
    date_of_birth DATE NULL,                                -- NS
    address       NVARCHAR(255) NULL,                       -- ĐC
    phone         VARCHAR(20) NULL,
    base_salary   DECIMAL(18,2) NOT NULL DEFAULT 0 CONSTRAINT ck_emp_salary CHECK (base_salary >= 0), -- Lương CB
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL
);

-- KH (địa chỉ giao hàng ở customer_addresses)
CREATE TABLE customers (
    customer_id     INT IDENTITY(1,1) PRIMARY KEY,          -- MaKH
    full_name       NVARCHAR(100) NOT NULL,                 -- Họ tên
    phone           VARCHAR(20) NULL,                       -- ĐT
    total_purchased DECIMAL(18,2) NOT NULL DEFAULT 0 CONSTRAINT ck_cus_total CHECK (total_purchased >= 0), -- Tổng tiền hàng đã mua
    is_deleted      BIT NOT NULL DEFAULT 0,
    deleted_at      DATETIME2(3) NULL
);

CREATE TABLE customer_addresses (
    address_id     INT IDENTITY(1,1) PRIMARY KEY,
    customer_id    INT NOT NULL REFERENCES customers(customer_id),
    label          VARCHAR(10) NOT NULL DEFAULT 'HOME' CONSTRAINT ck_addr_label CHECK (label IN ('HOME','OFFICE','OTHER')),
    receiver_name  NVARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    province       NVARCHAR(100) NOT NULL,
    district       NVARCHAR(100) NOT NULL,
    ward           NVARCHAR(100) NOT NULL,
    street_detail  NVARCHAR(255) NOT NULL,
    is_default     BIT NOT NULL DEFAULT 0,
    is_deleted     BIT NOT NULL DEFAULT 0,
    deleted_at     DATETIME2(3) NULL
);

-- User (MaThamChiếu -> employee_id / customer_id; "loại" = user_type)
CREATE TABLE users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT NOT NULL,
    user_type     VARCHAR(10) NOT NULL,
    employee_id   INT NULL REFERENCES employees(employee_id),
    customer_id   INT NULL REFERENCES customers(customer_id),
    is_locked     BIT NOT NULL DEFAULT 0,                   -- khóa tài khoản (khác xóa)
    created_at    DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL,
    -- (role_id, user_type) phải khớp 1 dòng trong roles -> CUSTOMER chỉ nhận role CUSTOMER,
    -- EMPLOYEE chỉ nhận ADMIN/STAFF
    CONSTRAINT fk_users_role_type FOREIGN KEY (role_id, user_type) REFERENCES roles(role_id, user_type),
    CONSTRAINT ck_user_reference CHECK (
        (user_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND customer_id IS NULL) OR
        (user_type = 'CUSTOMER' AND customer_id IS NOT NULL AND employee_id IS NULL))
);
GO

/* ---------------------------------------------------------------------
   2. SẢN PHẨM
   --------------------------------------------------------------------- */
CREATE TABLE categories (
    category_id   INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL,
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL
);

CREATE TABLE brands (
    brand_id   INT IDENTITY(1,1) PRIMARY KEY,
    brand_name NVARCHAR(100) NOT NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2(3) NULL
);

-- NCC
CREATE TABLE suppliers (
    supplier_id   INT IDENTITY(1,1) PRIMARY KEY,            -- MaNCC
    supplier_name NVARCHAR(150) NOT NULL,
    phone         VARCHAR(20) NULL,
    email         VARCHAR(100) NULL,
    address       NVARCHAR(255) NULL,
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL
);

-- SP
CREATE TABLE products (
    product_id    INT IDENTITY(1,1) PRIMARY KEY,            -- MaSP
    product_name  NVARCHAR(200) NOT NULL,                   -- TenSP
    category_id   INT NULL REFERENCES categories(category_id),
    brand_id      INT NULL REFERENCES brands(brand_id),
    current_price DECIMAL(18,2) NOT NULL CONSTRAINT ck_prod_price CHECK (current_price >= 0), -- ĐG hiện hành
    unit          NVARCHAR(20) NOT NULL DEFAULT N'Đôi',     -- ĐVT
    description   NVARCHAR(MAX) NULL,
    image_url     VARCHAR(500) NULL,
    is_active     BIT NOT NULL DEFAULT 1,                   -- ngừng kinh doanh / ẩn (khác xóa)
    is_deleted    BIT NOT NULL DEFAULT 0,
    deleted_at    DATETIME2(3) NULL
);

CREATE TABLE sizes (
    size_id    INT IDENTITY(1,1) PRIMARY KEY,
    size_label VARCHAR(10) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2(3) NULL
);

CREATE TABLE colors (
    color_id   INT IDENTITY(1,1) PRIMARY KEY,
    color_name NVARCHAR(30) NOT NULL,
    hex_code   CHAR(7) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2(3) NULL
);

-- Biến thể (size x màu). stock_quantity = "SL có": CHỈ đổi qua inventory_transactions
CREATE TABLE product_variants (
    variant_id     INT IDENTITY(1,1) PRIMARY KEY,
    product_id     INT NOT NULL REFERENCES products(product_id),
    size_id        INT NOT NULL REFERENCES sizes(size_id),
    color_id       INT NOT NULL REFERENCES colors(color_id),
    sku            VARCHAR(50) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0 CONSTRAINT ck_variant_stock CHECK (stock_quantity >= 0),
    is_deleted     BIT NOT NULL DEFAULT 0,
    deleted_at     DATETIME2(3) NULL
);
GO

/* ---------------------------------------------------------------------
   3. NHẬP HÀNG
   --------------------------------------------------------------------- */
-- PNH. total_amount do trigger tính từ chi tiết (không nhập tay)
CREATE TABLE purchase_receipts (
    receipt_id   INT IDENTITY(1,1) PRIMARY KEY,             -- MaPNH
    receipt_date DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    employee_id  INT NOT NULL REFERENCES employees(employee_id),
    supplier_id  INT NOT NULL REFERENCES suppliers(supplier_id),
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CONSTRAINT ck_receipt_total CHECK (total_amount >= 0),
    is_deleted   BIT NOT NULL DEFAULT 0,
    deleted_at   DATETIME2(3) NULL
);

-- CTPNH (thêm dòng = nhập kho ngay; không sửa/xóa dòng, sai thì điều chỉnh kho)
CREATE TABLE purchase_receipt_details (
    receipt_id   INT NOT NULL REFERENCES purchase_receipts(receipt_id),
    variant_id   INT NOT NULL REFERENCES product_variants(variant_id),
    quantity     INT NOT NULL CONSTRAINT ck_prd_qty CHECK (quantity > 0),
    import_price DECIMAL(18,2) NOT NULL CONSTRAINT ck_prd_price CHECK (import_price >= 0),
    line_total   AS (quantity * import_price) PERSISTED,
    PRIMARY KEY (receipt_id, variant_id)
);
GO

/* ---------------------------------------------------------------------
   4. KHUYẾN MÃI
   --------------------------------------------------------------------- */
CREATE TABLE promotions (
    promotion_id   INT IDENTITY(1,1) PRIMARY KEY,           -- MaCTKM
    promotion_name NVARCHAR(150) NOT NULL,
    promo_type     VARCHAR(10) NOT NULL CONSTRAINT ck_promo_type CHECK (promo_type IN ('PRODUCT','INVOICE','VOUCHER')),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    is_active      BIT NOT NULL DEFAULT 1,
    is_deleted     BIT NOT NULL DEFAULT 0,
    deleted_at     DATETIME2(3) NULL,
    CONSTRAINT ck_promo_dates CHECK (end_date >= start_date)
);

CREATE TABLE promotion_products (                           -- KM theo SP
    promotion_id     INT NOT NULL REFERENCES promotions(promotion_id),
    product_id       INT NOT NULL REFERENCES products(product_id),
    discount_percent DECIMAL(5,2) NOT NULL CONSTRAINT ck_pp_pct CHECK (discount_percent > 0 AND discount_percent <= 100),
    PRIMARY KEY (promotion_id, product_id)
);

CREATE TABLE promotion_invoice_tiers (                      -- KM theo mức tiền HD
    promotion_id       INT NOT NULL REFERENCES promotions(promotion_id),
    min_invoice_amount DECIMAL(18,2) NOT NULL CONSTRAINT ck_pit_min CHECK (min_invoice_amount >= 0),
    discount_percent   DECIMAL(5,2) NOT NULL CONSTRAINT ck_pit_pct CHECK (discount_percent > 0 AND discount_percent <= 100),
    PRIMARY KEY (promotion_id, min_invoice_amount)
);

CREATE TABLE promotion_vouchers (                           -- KM theo voucher
    promotion_id     INT NOT NULL REFERENCES promotions(promotion_id),
    voucher_code     VARCHAR(30) NOT NULL UNIQUE,           -- không tái sử dụng mã cũ
    discount_percent DECIMAL(5,2) NOT NULL CONSTRAINT ck_pv_pct CHECK (discount_percent > 0 AND discount_percent <= 100),
    usage_limit      INT NULL CONSTRAINT ck_pv_limit CHECK (usage_limit > 0),
    used_count       INT NOT NULL DEFAULT 0 CONSTRAINT ck_pv_used CHECK (used_count >= 0),
    is_deleted       BIT NOT NULL DEFAULT 0,
    deleted_at       DATETIME2(3) NULL,
    PRIMARY KEY (promotion_id, voucher_code)
);
GO

/* ---------------------------------------------------------------------
   5. BÁN HÀNG
   invoices = ĐƠN HÀNG (cả online lẫn bán tại quầy) – giữ tên bảng của cô.
   Tách 2 khái niệm:
     * order_status  : xử lý/giao hàng  (cột này, có lịch sử)
     * payment_status: thanh toán       (KHÔNG lưu cột, suy ra từ payments/refunds
                                         qua view vw_invoice_payment_status
                                         -> không thể lệch dữ liệu)
   --------------------------------------------------------------------- */
CREATE TABLE invoices (
    invoice_id          INT IDENTITY(1,1) PRIMARY KEY,      -- MaHD
    invoice_date        DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    channel             VARCHAR(10) NOT NULL DEFAULT 'ONLINE' CONSTRAINT ck_inv_channel CHECK (channel IN ('ONLINE','POS')),
    employee_id         INT NULL REFERENCES employees(employee_id),   -- MaNV (NULL: khách tự đặt online)
    customer_id         INT NULL REFERENCES customers(customer_id),   -- MaKH (NULL: khách vãng lai)
    promotion_id        INT NULL REFERENCES promotions(promotion_id),
    voucher_code        VARCHAR(30) NULL REFERENCES promotion_vouchers(voucher_code),
    shipping_address_id INT NULL REFERENCES customer_addresses(address_id),
    receiver_name       NVARCHAR(100) NULL,                 -- chụp lại lúc đặt
    receiver_phone      VARCHAR(20) NULL,
    shipping_address    NVARCHAR(500) NULL,
    total_amount        DECIMAL(18,2) NOT NULL DEFAULT 0,   -- Tổng tiền: trigger tính = SUM(chi tiết)
    discount_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,   -- gg cấp hóa đơn (voucher / mức HD): backend ghi SAU khi đã có chi tiết
    amount_payable      AS (total_amount - discount_amount) PERSISTED,  -- Tiền phải trả: luôn đúng công thức
    order_status        VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    stock_deducted      BIT NOT NULL DEFAULT 0,             -- do trigger quản lý, cấm sửa tay
    note                NVARCHAR(500) NULL,
    is_deleted          BIT NOT NULL DEFAULT 0,
    deleted_at          DATETIME2(3) NULL,
    CONSTRAINT ck_inv_status   CHECK (order_status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED')),
    CONSTRAINT ck_inv_total    CHECK (total_amount >= 0),
    CONSTRAINT ck_inv_discount CHECK (discount_amount >= 0 AND discount_amount <= total_amount),
    CONSTRAINT ck_inv_delivery CHECK (channel = 'POS' OR
        (receiver_name IS NOT NULL AND receiver_phone IS NOT NULL AND shipping_address IS NOT NULL))
);

-- CTHD. 1 biến thể = 1 dòng / đơn (cộng dồn số lượng). Chỉ sửa được khi đơn PENDING.
CREATE TABLE invoice_details (
    invoice_id      INT NOT NULL REFERENCES invoices(invoice_id),
    variant_id      INT NOT NULL REFERENCES product_variants(variant_id),
    quantity        INT NOT NULL CONSTRAINT ck_ind_qty CHECK (quantity > 0),
    sale_price      DECIMAL(18,2) NOT NULL CONSTRAINT ck_ind_price CHECK (sale_price >= 0),
    discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CONSTRAINT ck_ind_disc CHECK (discount_amount >= 0),
    line_total      AS (quantity * sale_price - discount_amount) PERSISTED,
    PRIMARY KEY (invoice_id, variant_id),
    CONSTRAINT ck_ind_line CHECK (discount_amount <= quantity * sale_price)
);

-- Lịch sử trạng thái đơn (append-only). changed_by NULL = hệ thống
CREATE TABLE order_status_history (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(invoice_id),
    old_status VARCHAR(10) NULL,                            -- NULL = lúc tạo đơn
    new_status VARCHAR(10) NOT NULL,
    changed_by INT NULL REFERENCES users(user_id),          -- admin / nhân viên / khách (tự hủy)
    changed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    note       NVARCHAR(500) NULL,
    CONSTRAINT ck_osh_new CHECK (new_status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED')),
    CONSTRAINT ck_osh_old CHECK (old_status IS NULL OR old_status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED'))
);
GO

/* ---------------------------------------------------------------------
   6. THANH TOÁN & HOÀN TIỀN & ĐỔI TRẢ
   --------------------------------------------------------------------- */
CREATE TABLE payment_methods (
    method_id   INT IDENTITY(1,1) PRIMARY KEY,
    method_code VARCHAR(20) NOT NULL,                       -- CASH, BANK_TRANSFER, BANK_QR, MOMO
    method_name NVARCHAR(50) NOT NULL,
    is_online   BIT NOT NULL DEFAULT 0,
    is_active   BIT NOT NULL DEFAULT 1,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL
);

-- Giao dịch thu tiền. Hoàn tiền KHÔNG còn là trạng thái ở đây mà nằm ở bảng refunds
CREATE TABLE payments (
    payment_id       INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id       INT NOT NULL REFERENCES invoices(invoice_id),
    method_id        INT NOT NULL REFERENCES payment_methods(method_id),
    amount           DECIMAL(18,2) NOT NULL CONSTRAINT ck_pay_amount CHECK (amount > 0),
    status           VARCHAR(10) NOT NULL DEFAULT 'PENDING' CONSTRAINT ck_pay_status CHECK (status IN ('PENDING','SUCCESS','FAILED')),
    transaction_code VARCHAR(100) NULL,
    proof_image_url  VARCHAR(500) NULL,
    note             NVARCHAR(255) NULL,
    paid_at          DATETIME2(3) NULL,
    created_at       DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted       BIT NOT NULL DEFAULT 0,
    deleted_at       DATETIME2(3) NULL,
    CONSTRAINT ck_pay_paid_at CHECK (status <> 'SUCCESS' OR paid_at IS NOT NULL)
);

-- Yêu cầu trả hàng (quy trình riêng, độc lập với hoàn tiền)
CREATE TABLE [returns] (
    return_id    INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id   INT NOT NULL REFERENCES invoices(invoice_id),
    reason       NVARCHAR(500) NOT NULL,
    status       VARCHAR(10) NOT NULL DEFAULT 'REQUESTED',
    requested_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    processed_by INT NULL REFERENCES employees(employee_id),
    processed_at DATETIME2(3) NULL,
    staff_note   NVARCHAR(500) NULL,
    is_deleted   BIT NOT NULL DEFAULT 0,
    deleted_at   DATETIME2(3) NULL,
    CONSTRAINT ck_ret_status CHECK (status IN ('REQUESTED','APPROVED','REJECTED','RECEIVED','CANCELLED'))
);

-- Hàng trả: số lượng không vượt số đã mua (trigger). RESALABLE được nhập lại kho, DAMAGED thì không
CREATE TABLE return_items (
    return_id      INT NOT NULL REFERENCES [returns](return_id),
    variant_id     INT NOT NULL REFERENCES product_variants(variant_id),
    quantity       INT NOT NULL CONSTRAINT ck_ri_qty CHECK (quantity > 0),
    item_condition VARCHAR(10) NOT NULL DEFAULT 'RESALABLE' CONSTRAINT ck_ri_cond CHECK (item_condition IN ('RESALABLE','DAMAGED')),
    PRIMARY KEY (return_id, variant_id)
);

-- Giao dịch hoàn tiền. return_id NULL = hoàn tiền không qua trả hàng (vd. hủy đơn đã thanh toán)
CREATE TABLE refunds (
    refund_id        INT IDENTITY(1,1) PRIMARY KEY,
    payment_id       INT NOT NULL REFERENCES payments(payment_id),
    return_id        INT NULL REFERENCES [returns](return_id),
    method_id        INT NOT NULL REFERENCES payment_methods(method_id),
    amount           DECIMAL(18,2) NOT NULL CONSTRAINT ck_ref_amount CHECK (amount > 0),
    status           VARCHAR(10) NOT NULL DEFAULT 'PENDING' CONSTRAINT ck_ref_status CHECK (status IN ('PENDING','SUCCESS','FAILED')),
    reason           NVARCHAR(255) NOT NULL,
    transaction_code VARCHAR(100) NULL,
    processed_by     INT NULL REFERENCES employees(employee_id),
    requested_at     DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    completed_at     DATETIME2(3) NULL,
    is_deleted       BIT NOT NULL DEFAULT 0,
    deleted_at       DATETIME2(3) NULL,
    CONSTRAINT ck_ref_completed CHECK (status <> 'SUCCESS' OR completed_at IS NOT NULL)
);

/* ---------------------------------------------------------------------
   7. SỔ KHO & NHẬT KÝ HỆ THỐNG
   --------------------------------------------------------------------- */
-- Sổ cái tồn kho, append-only. Mỗi nguồn chứng từ có cột FK riêng (không dùng đa hình)
CREATE TABLE inventory_transactions (
    transaction_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_id          INT NOT NULL REFERENCES product_variants(variant_id),
    transaction_type    VARCHAR(16) NOT NULL,
    quantity_change     INT NOT NULL,                       -- (+) tăng kho, (-) giảm kho
    stock_before        INT NOT NULL DEFAULT 0,             -- trigger điền
    stock_after         INT NOT NULL DEFAULT 0,             -- trigger điền
    reason              NVARCHAR(255) NULL,
    purchase_receipt_id INT NULL REFERENCES purchase_receipts(receipt_id),
    invoice_id          INT NULL REFERENCES invoices(invoice_id),
    return_id           INT NULL REFERENCES [returns](return_id),
    created_by          INT NULL REFERENCES users(user_id), -- NULL = hệ thống
    created_at          DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT ck_invtx_type CHECK (transaction_type IN
        ('IMPORT','IMPORT_REVERSAL','SALE','SALE_CANCEL','RETURN_RESTOCK','ADJUST_IN','ADJUST_OUT')),
    CONSTRAINT ck_invtx_sign CHECK (
        (transaction_type IN ('IMPORT','SALE_CANCEL','RETURN_RESTOCK','ADJUST_IN') AND quantity_change > 0) OR
        (transaction_type IN ('IMPORT_REVERSAL','SALE','ADJUST_OUT') AND quantity_change < 0)),
    CONSTRAINT ck_invtx_source CHECK (
        (transaction_type IN ('IMPORT','IMPORT_REVERSAL') AND purchase_receipt_id IS NOT NULL AND invoice_id IS NULL AND return_id IS NULL) OR
        (transaction_type IN ('SALE','SALE_CANCEL')       AND invoice_id IS NOT NULL AND purchase_receipt_id IS NULL AND return_id IS NULL) OR
        (transaction_type = 'RETURN_RESTOCK'              AND return_id IS NOT NULL AND purchase_receipt_id IS NULL AND invoice_id IS NULL) OR
        (transaction_type IN ('ADJUST_IN','ADJUST_OUT')   AND purchase_receipt_id IS NULL AND invoice_id IS NULL AND return_id IS NULL
                                                          AND reason IS NOT NULL AND created_by IS NOT NULL))
);

-- Nhật ký hành động quan trọng, append-only. KHÔNG ghi mật khẩu/token vào old_values/new_values
CREATE TABLE audit_logs (
    audit_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
    actor_user_id INT NULL REFERENCES users(user_id),       -- NULL = hệ thống tự động
    action_type   VARCHAR(30) NOT NULL,                     -- USER_LOCK, USER_UNLOCK, USER_ROLE_CHANGE, PRODUCT_PRICE_CHANGE, ORDER_CANCEL, STOCK_ADJUST...
    entity_type   VARCHAR(50) NOT NULL,                     -- tên bảng bị tác động
    entity_id     NVARCHAR(100) NOT NULL,
    old_values    NVARCHAR(MAX) NULL,                       -- JSON
    new_values    NVARCHAR(MAX) NULL,                       -- JSON
    reason        NVARCHAR(500) NULL,
    ip_address    VARCHAR(45) NULL,
    created_at    DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT ck_audit_old_json  CHECK (old_values IS NULL OR ISJSON(old_values) = 1),
    CONSTRAINT ck_audit_new_json  CHECK (new_values IS NULL OR ISJSON(new_values) = 1),
    CONSTRAINT ck_audit_no_secret CHECK (
        ISNULL(old_values,N'') NOT LIKE N'%password%' AND ISNULL(new_values,N'') NOT LIKE N'%password%' AND
        ISNULL(old_values,N'') NOT LIKE N'%token%'    AND ISNULL(new_values,N'') NOT LIKE N'%token%')
);
GO

/* ---------------------------------------------------------------------
   8. GIỎ HÀNG (lưu trên server, đồng bộ web <-> mobile)
   --------------------------------------------------------------------- */
-- Mỗi khách có tối đa 1 giỏ ACTIVE; thanh toán xong -> CHECKED_OUT, lần sau tạo giỏ mới
CREATE TABLE carts (
    cart_id     INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    status      VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CONSTRAINT ck_cart_status CHECK (status IN ('ACTIVE','CHECKED_OUT')),
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL
);

-- 1 biến thể = 1 dòng / giỏ. Xóa khỏi giỏ = xóa mềm; thêm lại = đặt is_deleted = 0.
-- Biến thể ngừng bán / hết hàng KHÔNG bị chặn ở đây; xem view vw_cart_item_status
CREATE TABLE cart_items (
    cart_id    INT NOT NULL REFERENCES carts(cart_id),
    variant_id INT NOT NULL REFERENCES product_variants(variant_id),
    quantity   INT NOT NULL CONSTRAINT ck_ci_qty CHECK (quantity > 0),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2(3) NULL,
    PRIMARY KEY (cart_id, variant_id)
);
GO

/* ---------------------------------------------------------------------
   9. BANNER, THÔNG BÁO, ĐÁNH GIÁ, YÊU THÍCH
   --------------------------------------------------------------------- */
CREATE TABLE banners (
    banner_id    INT IDENTITY(1,1) PRIMARY KEY,
    title        NVARCHAR(150) NOT NULL,
    image_url    VARCHAR(500) NOT NULL,
    link_url     VARCHAR(500) NULL,
    position     VARCHAR(15) NOT NULL DEFAULT 'HOME_TOP'
                 CONSTRAINT ck_banner_pos CHECK (position IN ('HOME_TOP','HOME_MIDDLE','HOME_BOTTOM','POPUP','CATEGORY')),
    platform     VARCHAR(10) NOT NULL DEFAULT 'ALL' CONSTRAINT ck_banner_plat CHECK (platform IN ('WEB','MOBILE','ALL')),
    sort_order   INT NOT NULL DEFAULT 0,
    start_date   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    end_date     DATETIME2(3) NULL,
    is_active    BIT NOT NULL DEFAULT 1,
    promotion_id INT NULL REFERENCES promotions(promotion_id),
    created_by   INT NULL REFERENCES employees(employee_id),
    created_at   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted   BIT NOT NULL DEFAULT 0,
    deleted_at   DATETIME2(3) NULL,
    CONSTRAINT ck_banner_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE notifications (
    notification_id   INT IDENTITY(1,1) PRIMARY KEY,
    title             NVARCHAR(150) NOT NULL,
    content           NVARCHAR(MAX) NOT NULL,
    notification_type VARCHAR(10) NOT NULL DEFAULT 'SYSTEM'
                      CONSTRAINT ck_notif_type CHECK (notification_type IN ('SYSTEM','PROMOTION','ORDER','OTHER')),
    target_type       VARCHAR(10) NOT NULL DEFAULT 'SELECTED' CONSTRAINT ck_notif_target CHECK (target_type IN ('ALL','SELECTED')),
    link_url          VARCHAR(500) NULL,
    promotion_id      INT NULL REFERENCES promotions(promotion_id),
    created_by        INT NOT NULL REFERENCES employees(employee_id),
    created_at        DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted        BIT NOT NULL DEFAULT 0,
    deleted_at        DATETIME2(3) NULL
);

CREATE TABLE notification_recipients (
    notification_id INT NOT NULL REFERENCES notifications(notification_id),
    customer_id     INT NOT NULL REFERENCES customers(customer_id),
    is_read         BIT NOT NULL DEFAULT 0,
    read_at         DATETIME2(3) NULL,
    is_deleted      BIT NOT NULL DEFAULT 0,
    deleted_at      DATETIME2(3) NULL,
    PRIMARY KEY (notification_id, customer_id)
);

-- Chính sách: ai cũng được đánh giá; invoice_id NULL = chưa xác thực mua hàng.
-- Nếu có invoice_id thì trigger kiểm tra: đơn của chính khách, đã DELIVERED, có sản phẩm đó.
-- (Muốn "chỉ người đã mua mới được đánh giá": đổi invoice_id thành NOT NULL.)
CREATE TABLE product_reviews (
    review_id   INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    product_id  INT NOT NULL REFERENCES products(product_id),
    invoice_id  INT NULL REFERENCES invoices(invoice_id),
    rating      TINYINT NOT NULL CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5),
    comment     NVARCHAR(MAX) NULL,
    image_url   VARCHAR(500) NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'APPROVED' CONSTRAINT ck_review_status CHECK (status IN ('PENDING','APPROVED','HIDDEN')),
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL
);

CREATE TABLE review_replies (
    reply_id    INT IDENTITY(1,1) PRIMARY KEY,
    review_id   INT NOT NULL REFERENCES product_reviews(review_id),
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    content     NVARCHAR(MAX) NOT NULL,
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2(3) NULL,
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL
);

CREATE TABLE favorite_products (
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    product_id  INT NOT NULL REFERENCES products(product_id),
    created_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_deleted  BIT NOT NULL DEFAULT 0,
    deleted_at  DATETIME2(3) NULL,
    PRIMARY KEY (customer_id, product_id)
);
GO

/* ---------------------------------------------------------------------
   10. INDEX (UNIQUE có điều kiện chỉ xét bản ghi chưa xóa)
   --------------------------------------------------------------------- */
CREATE UNIQUE INDEX uq_users_username   ON users(username)         WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_users_employee   ON users(employee_id)      WHERE is_deleted = 0 AND employee_id IS NOT NULL;
CREATE UNIQUE INDEX uq_users_customer   ON users(customer_id)      WHERE is_deleted = 0 AND customer_id IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_phone  ON customers(phone)        WHERE is_deleted = 0 AND phone IS NOT NULL;
CREATE UNIQUE INDEX uq_categories_name  ON categories(category_name) WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_brands_name      ON brands(brand_name)      WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_sizes_label      ON sizes(size_label)       WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_colors_name      ON colors(color_name)      WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_variants_sku     ON product_variants(sku)   WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_variants_combo   ON product_variants(product_id, size_id, color_id) WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_address_default  ON customer_addresses(customer_id) WHERE is_default = 1 AND is_deleted = 0;
CREATE UNIQUE INDEX uq_pay_methods_code ON payment_methods(method_code) WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_payments_txn     ON payments(method_id, transaction_code) WHERE is_deleted = 0 AND transaction_code IS NOT NULL;
CREATE UNIQUE INDEX uq_refunds_txn      ON refunds(method_id, transaction_code)  WHERE is_deleted = 0 AND transaction_code IS NOT NULL;
CREATE UNIQUE INDEX uq_review_cus_prod  ON product_reviews(customer_id, product_id) WHERE is_deleted = 0;
CREATE UNIQUE INDEX uq_cart_active      ON carts(customer_id)      WHERE status = 'ACTIVE' AND is_deleted = 0;

-- Chống ghi sổ kho trùng (cùng chứng từ + cùng biến thể + cùng loại chỉ 1 lần)
CREATE UNIQUE INDEX uq_invtx_import     ON inventory_transactions(purchase_receipt_id, variant_id) WHERE transaction_type = 'IMPORT';
CREATE UNIQUE INDEX uq_invtx_import_rev ON inventory_transactions(purchase_receipt_id, variant_id) WHERE transaction_type = 'IMPORT_REVERSAL';
CREATE UNIQUE INDEX uq_invtx_sale       ON inventory_transactions(invoice_id, variant_id)          WHERE transaction_type = 'SALE';
CREATE UNIQUE INDEX uq_invtx_sale_cxl   ON inventory_transactions(invoice_id, variant_id)          WHERE transaction_type = 'SALE_CANCEL';
CREATE UNIQUE INDEX uq_invtx_return     ON inventory_transactions(return_id, variant_id)           WHERE transaction_type = 'RETURN_RESTOCK';

CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_brand     ON products(brand_id);
CREATE INDEX idx_variants_product   ON product_variants(product_id);
CREATE INDEX idx_variants_size      ON product_variants(size_id);
CREATE INDEX idx_variants_color     ON product_variants(color_id);
CREATE INDEX idx_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_invoices_customer  ON invoices(customer_id);
CREATE INDEX idx_invoices_employee  ON invoices(employee_id);
CREATE INDEX idx_invoices_date      ON invoices(invoice_date);
CREATE INDEX idx_invoices_status    ON invoices(order_status);
CREATE INDEX idx_osh_invoice        ON order_status_history(invoice_id, changed_at);
CREATE INDEX idx_receipts_supplier  ON purchase_receipts(supplier_id);
CREATE INDEX idx_payments_invoice   ON payments(invoice_id);
CREATE INDEX idx_refunds_payment    ON refunds(payment_id);
CREATE INDEX idx_returns_invoice    ON [returns](invoice_id);
CREATE INDEX idx_invtx_variant      ON inventory_transactions(variant_id, created_at);
CREATE INDEX idx_audit_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor        ON audit_logs(actor_user_id, created_at);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);
CREATE INDEX idx_banners_display    ON banners(position, platform, is_active, sort_order);
CREATE INDEX idx_notif_recipient    ON notification_recipients(customer_id, is_read);
CREATE INDEX idx_reviews_product    ON product_reviews(product_id, status);
CREATE INDEX idx_replies_review     ON review_replies(review_id);
CREATE INDEX idx_favorites_product  ON favorite_products(product_id);
CREATE INDEX idx_promo_dates        ON promotions(start_date, end_date);
GO

IF OBJECT_ID(N'dbo.password_reset_tokens') IS NULL
CREATE TABLE password_reset_tokens (
    token_id   INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id),
    token_hash VARCHAR(255) NOT NULL,                 -- bcrypt hash của OTP, không lưu OTP gốc
    expires_at DATETIME2(3) NOT NULL,
    used_at    DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_prt_user')
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id, used_at, expires_at);
GO

/* =====================================================================
   11. TRIGGER – TỒN KHO (nguồn duy nhất: inventory_transactions)
   ===================================================================== */

-- 11.1 Áp dụng dòng sổ kho vào stock_quantity (nguyên tử, chống bán vượt kho)
--      INSTEAD OF INSERT: tính stock_before/after theo từng dòng, khóa dòng biến thể
--      (UPDLOCK, HOLDLOCK) nên 2 giao dịch cùng mua biến thể cuối cùng sẽ xếp hàng,
--      người sau nhận lỗi "Không đủ tồn kho" và rollback.
CREATE TRIGGER trg_invtx_apply ON inventory_transactions INSTEAD OF INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) RETURN;

    DECLARE @calc TABLE (
        rn INT PRIMARY KEY, variant_id INT NOT NULL, transaction_type VARCHAR(16) NOT NULL,
        quantity_change INT NOT NULL, stock_before INT NOT NULL, stock_after INT NOT NULL,
        reason NVARCHAR(255) NULL, purchase_receipt_id INT NULL, invoice_id INT NULL,
        return_id INT NULL, created_by INT NULL);

    ;WITH src AS (
        SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS rn,
               variant_id, transaction_type, quantity_change, reason,
               purchase_receipt_id, invoice_id, return_id, created_by
        FROM inserted
    )
    INSERT INTO @calc (rn, variant_id, transaction_type, quantity_change, stock_before, stock_after,
                       reason, purchase_receipt_id, invoice_id, return_id, created_by)
    SELECT s.rn, s.variant_id, s.transaction_type, s.quantity_change,
           pv.stock_quantity + ISNULL(SUM(s.quantity_change) OVER (PARTITION BY s.variant_id ORDER BY s.rn
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0),
           pv.stock_quantity + SUM(s.quantity_change) OVER (PARTITION BY s.variant_id ORDER BY s.rn
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
           s.reason, s.purchase_receipt_id, s.invoice_id, s.return_id, s.created_by
    FROM src s
    JOIN product_variants pv WITH (UPDLOCK, HOLDLOCK) ON pv.variant_id = s.variant_id;

    IF (SELECT COUNT(*) FROM @calc) <> (SELECT COUNT(*) FROM inserted)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51010, N'Biến thể sản phẩm không tồn tại.', 1;
    END
    IF EXISTS (SELECT 1 FROM @calc WHERE stock_after < 0)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51011, N'Không đủ tồn kho.', 1;
    END

    BEGIN TRY
        INSERT INTO inventory_transactions
            (variant_id, transaction_type, quantity_change, stock_before, stock_after,
             reason, purchase_receipt_id, invoice_id, return_id, created_by)
        SELECT variant_id, transaction_type, quantity_change, stock_before, stock_after,
               reason, purchase_receipt_id, invoice_id, return_id, created_by
        FROM @calc ORDER BY rn;

        -- điều chỉnh kho thủ công cũng đi vào audit_logs
        INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, old_values, new_values, reason)
        SELECT created_by, 'STOCK_ADJUST', 'product_variants', CAST(variant_id AS NVARCHAR(100)),
               CONCAT(N'{"stock_quantity":', stock_before, N'}'),
               CONCAT(N'{"stock_quantity":', stock_after,  N'}'), reason
        FROM @calc WHERE transaction_type IN ('ADJUST_IN','ADJUST_OUT');

        -- mở "cổng" cho trigger guard rồi cập nhật tồn kho đúng 1 lần
        EXEC sp_set_session_context @key = N'stock_apply', @value = 1;
        UPDATE pv SET stock_quantity = pv.stock_quantity + d.delta
        FROM product_variants pv
        JOIN (SELECT variant_id, SUM(quantity_change) AS delta FROM @calc GROUP BY variant_id) d
             ON d.variant_id = pv.variant_id;
        EXEC sp_set_session_context @key = N'stock_apply', @value = NULL;
    END TRY
    BEGIN CATCH
        EXEC sp_set_session_context @key = N'stock_apply', @value = NULL;
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 11.2 Sổ kho append-only
CREATE TRIGGER trg_invtx_immutable ON inventory_transactions INSTEAD OF UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW 51012, N'inventory_transactions chỉ cho INSERT. Sai sót hãy ghi dòng điều chỉnh (sp_adjust_stock).', 1;
END;
GO

-- 11.3 Chặn mọi cách đổi stock_quantity ngoài sổ kho
CREATE TRIGGER trg_variants_guard_stock ON product_variants AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF ISNULL(TRY_CAST(SESSION_CONTEXT(N'stock_apply') AS INT), 0) = 1 RETURN;
    IF EXISTS (SELECT 1 FROM inserted i
               LEFT JOIN deleted d ON d.variant_id = i.variant_id
               WHERE i.stock_quantity <> ISNULL(d.stock_quantity, 0))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51013, N'Không được sửa stock_quantity trực tiếp. Hãy ghi inventory_transactions.', 1;
    END
END;
GO

/* =====================================================================
   12. TRIGGER – NHẬP HÀNG
   ===================================================================== */
-- 12.1 Thêm dòng phiếu nhập = ghi sổ IMPORT + tính lại tổng tiền phiếu
CREATE TRIGGER trg_receipt_details_ai ON purchase_receipt_details AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN purchase_receipts r ON r.receipt_id = i.receipt_id WHERE r.is_deleted = 1)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51020, N'Phiếu nhập đã xóa, không thể thêm chi tiết.', 1;
    END

    INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, purchase_receipt_id, created_by)
    SELECT i.variant_id, 'IMPORT', i.quantity, N'Nhập hàng theo phiếu nhập', i.receipt_id,
           TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT)
    FROM inserted i;

    UPDATE r SET total_amount = t.total
    FROM purchase_receipts r
    JOIN (SELECT receipt_id, SUM(line_total) AS total
          FROM purchase_receipt_details
          WHERE receipt_id IN (SELECT receipt_id FROM inserted)
          GROUP BY receipt_id) t ON t.receipt_id = r.receipt_id;
END;
GO

-- 12.2 Không sửa/xóa dòng phiếu nhập đã ghi kho
CREATE TRIGGER trg_receipt_details_lock ON purchase_receipt_details INSTEAD OF UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW 51021, N'Chi tiết phiếu nhập đã ghi kho, không sửa/xóa. Hãy xóa mềm phiếu (hoàn tác nhập) hoặc điều chỉnh kho.', 1;
END;
GO

-- 12.3 Xóa mềm phiếu nhập = ghi sổ IMPORT_REVERSAL (lỗi nếu hàng đã bán làm tồn không đủ trừ)
CREATE TRIGGER trg_receipts_au ON purchase_receipts AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(is_deleted) RETURN;

    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.receipt_id = i.receipt_id
               WHERE i.is_deleted = 0 AND d.is_deleted = 1)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51022, N'Không khôi phục phiếu nhập đã xóa. Hãy tạo phiếu mới.', 1;
    END

    INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, purchase_receipt_id, created_by)
    SELECT dt.variant_id, 'IMPORT_REVERSAL', -dt.quantity, N'Xóa phiếu nhập - hoàn tác nhập kho', dt.receipt_id,
           TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT)
    FROM purchase_receipt_details dt
    JOIN inserted i ON i.receipt_id = dt.receipt_id
    JOIN deleted  d ON d.receipt_id = i.receipt_id
    WHERE i.is_deleted = 1 AND d.is_deleted = 0;
END;
GO

/* =====================================================================
   13. TRIGGER – ĐƠN HÀNG (invoices)
   ===================================================================== */
-- 13.1 Chi tiết đơn: chỉ sửa khi PENDING; tự tính total_amount (nguồn duy nhất)
CREATE TRIGGER trg_invoice_details_aiud ON invoice_details AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted) RETURN;

    DECLARE @ids TABLE (invoice_id INT PRIMARY KEY);
    INSERT INTO @ids SELECT invoice_id FROM inserted UNION SELECT invoice_id FROM deleted;

    IF EXISTS (SELECT 1 FROM invoices v JOIN @ids x ON x.invoice_id = v.invoice_id
               WHERE v.order_status <> 'PENDING' OR v.is_deleted = 1)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51030, N'Chỉ được thêm/sửa/xóa chi tiết khi đơn hàng ở trạng thái PENDING.', 1;
    END

    UPDATE v SET total_amount = ISNULL(s.total, 0)
    FROM invoices v
    JOIN @ids x ON x.invoice_id = v.invoice_id
    LEFT JOIN (SELECT invoice_id, SUM(line_total) AS total FROM invoice_details GROUP BY invoice_id) s
           ON s.invoice_id = v.invoice_id;
END;
GO

-- 13.2 Đơn mới bắt buộc PENDING, chưa trừ kho; ghi lịch sử đầu tiên
CREATE TRIGGER trg_invoices_ai ON invoices AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted WHERE order_status <> 'PENDING' OR stock_deducted <> 0)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51031, N'Đơn hàng phải được tạo ở trạng thái PENDING; dùng sp_change_order_status để chuyển trạng thái.', 1;
    END

    INSERT INTO order_status_history (invoice_id, old_status, new_status, changed_by, note)
    SELECT invoice_id, NULL, 'PENDING', TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT), N'Tạo đơn hàng'
    FROM inserted;
END;
GO

-- 13.4 Đổi trạng thái: kiểm tra luồng hợp lệ -> ghi lịch sử -> trừ/cộng kho (cùng 1 transaction)
CREATE TRIGGER trg_invoices_au ON invoices AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL(OBJECT_ID(N'dbo.trg_invoices_au'), N'AFTER', N'DML') > 1 RETURN;  -- bỏ qua lần gọi do chính trigger tự UPDATE

    -- (a) stock_deducted do trigger quản lý
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
               WHERE i.stock_deducted <> d.stock_deducted)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51032, N'Không được sửa stock_deducted trực tiếp.', 1;
    END

    -- (b) luồng trạng thái hợp lệ
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
               WHERE i.order_status <> d.order_status
                 AND NOT EXISTS (SELECT 1 FROM (VALUES
                        ('PENDING','CONFIRMED'),('PENDING','DELIVERED'),('PENDING','CANCELLED'),
                        ('CONFIRMED','SHIPPING'),('CONFIRMED','DELIVERED'),('CONFIRMED','CANCELLED'),
                        ('SHIPPING','DELIVERED'),('SHIPPING','CANCELLED')) AS v(from_s, to_s)
                        WHERE v.from_s = d.order_status AND v.to_s = i.order_status))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51033, N'Chuyển trạng thái đơn hàng không hợp lệ.', 1;
    END

    -- (c) đơn online phải đi đủ bước xác nhận + giao hàng; chỉ POS mới được nhảy thẳng PENDING -> DELIVERED
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
               WHERE i.channel = 'ONLINE' AND i.order_status = 'DELIVERED' AND d.order_status IN ('PENDING','CONFIRMED'))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51034, N'Đơn online phải qua trạng thái SHIPPING trước khi DELIVERED.', 1;
    END

    -- (d) không rời PENDING nếu đơn không có dòng hàng nào (trừ khi hủy)
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
               WHERE d.order_status = 'PENDING' AND i.order_status IN ('CONFIRMED','DELIVERED')
                 AND NOT EXISTS (SELECT 1 FROM invoice_details x WHERE x.invoice_id = i.invoice_id))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51035, N'Đơn hàng chưa có sản phẩm nào.', 1;
    END

    -- (e) đơn đã trừ kho phải HỦY trước khi xóa mềm
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
               WHERE i.is_deleted = 1 AND d.is_deleted = 0 AND i.stock_deducted = 1)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51036, N'Đơn đã xuất kho: hãy hủy đơn (hoàn kho) trước khi xóa.', 1;
    END

    DECLARE @uid  INT = TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT);
    DECLARE @note NVARCHAR(500) = TRY_CAST(SESSION_CONTEXT(N'note') AS NVARCHAR(500));

    DECLARE @changed TABLE (invoice_id INT PRIMARY KEY, old_status VARCHAR(10), new_status VARCHAR(10));
    INSERT INTO @changed
    SELECT i.invoice_id, d.order_status, i.order_status
    FROM inserted i JOIN deleted d ON d.invoice_id = i.invoice_id
    WHERE i.order_status <> d.order_status;

    IF NOT EXISTS (SELECT 1 FROM @changed) RETURN;

    -- lịch sử trạng thái
    INSERT INTO order_status_history (invoice_id, old_status, new_status, changed_by, note)
    SELECT invoice_id, old_status, new_status, @uid, @note FROM @changed;

    -- xác định đơn cần trừ kho / hoàn kho (mỗi đơn đúng 1 lần nhờ stock_deducted)
    DECLARE @deduct  TABLE (invoice_id INT PRIMARY KEY);
    DECLARE @restock TABLE (invoice_id INT PRIMARY KEY);

    INSERT INTO @deduct
    SELECT c.invoice_id FROM @changed c JOIN invoices v ON v.invoice_id = c.invoice_id
    WHERE v.stock_deducted = 0 AND c.new_status IN ('CONFIRMED','SHIPPING','DELIVERED');

    INSERT INTO @restock
    SELECT c.invoice_id FROM @changed c JOIN invoices v ON v.invoice_id = c.invoice_id
    WHERE v.stock_deducted = 1 AND c.new_status = 'CANCELLED';

    INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, invoice_id, created_by)
    SELECT d.variant_id, 'SALE', -d.quantity, N'Xuất kho bán hàng', d.invoice_id, @uid
    FROM invoice_details d JOIN @deduct x ON x.invoice_id = d.invoice_id;

    INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, invoice_id, created_by)
    SELECT d.variant_id, 'SALE_CANCEL', d.quantity, N'Hủy đơn - hoàn kho', d.invoice_id, @uid
    FROM invoice_details d JOIN @restock x ON x.invoice_id = d.invoice_id;

    UPDATE v SET stock_deducted = 1 FROM invoices v JOIN @deduct  x ON x.invoice_id = v.invoice_id;
    UPDATE v SET stock_deducted = 0 FROM invoices v JOIN @restock x ON x.invoice_id = v.invoice_id;

    -- hủy đơn -> audit
    INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, old_values, new_values, reason)
    SELECT @uid, 'ORDER_CANCEL', 'invoices', CAST(invoice_id AS NVARCHAR(100)),
           CONCAT(N'{"order_status":"', old_status, N'"}'), N'{"order_status":"CANCELLED"}', @note
    FROM @changed WHERE new_status = 'CANCELLED';
END;
GO

-- 13.5 Lịch sử trạng thái & audit chỉ INSERT
CREATE TRIGGER trg_osh_immutable ON order_status_history INSTEAD OF UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW 51037, N'order_status_history chỉ cho INSERT.', 1;
END;
GO
CREATE TRIGGER trg_audit_immutable ON audit_logs INSTEAD OF UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW 51038, N'audit_logs chỉ cho INSERT, không được sửa/xóa.', 1;
END;
GO

/* =====================================================================
   14. TRIGGER – THANH TOÁN, HOÀN TIỀN, ĐỔI TRẢ
   ===================================================================== */
-- Tổng tiền thu thành công không vượt số phải trả
CREATE TRIGGER trg_payments_validate ON payments AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM invoices v
               JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments
                     WHERE status = 'SUCCESS' AND is_deleted = 0
                       AND invoice_id IN (SELECT invoice_id FROM inserted)
                     GROUP BY invoice_id) s ON s.invoice_id = v.invoice_id
               WHERE s.paid > v.amount_payable)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51040, N'Tổng tiền thanh toán thành công vượt số tiền phải trả của đơn hàng.', 1;
    END
END;
GO

-- Hoàn tiền: chỉ cho giao dịch đã SUCCESS, tổng hoàn <= số đã thu, khớp đơn với yêu cầu trả hàng
CREATE TRIGGER trg_refunds_validate ON refunds AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN payments p ON p.payment_id = i.payment_id WHERE p.status <> 'SUCCESS')
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51041, N'Chỉ hoàn tiền cho giao dịch thanh toán đã thành công.', 1;
    END
    IF EXISTS (SELECT 1 FROM payments p
               JOIN (SELECT payment_id, SUM(amount) AS refunded FROM refunds
                     WHERE status IN ('PENDING','SUCCESS') AND is_deleted = 0
                       AND payment_id IN (SELECT payment_id FROM inserted)
                     GROUP BY payment_id) r ON r.payment_id = p.payment_id
               WHERE r.refunded > p.amount)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51042, N'Tổng tiền hoàn vượt số tiền đã thanh toán.', 1;
    END
    IF EXISTS (SELECT 1 FROM inserted i
               JOIN payments p ON p.payment_id = i.payment_id
               JOIN [returns] r ON r.return_id = i.return_id
               WHERE r.invoice_id <> p.invoice_id OR r.status NOT IN ('APPROVED','RECEIVED'))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51043, N'Yêu cầu trả hàng phải ở trạng thái APPROVED/RECEIVED và cùng đơn hàng với giao dịch cần hoàn.', 1;
    END
END;
GO

-- Yêu cầu trả hàng: chỉ cho đơn đã giao
CREATE TRIGGER trg_returns_ai ON [returns] AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN invoices v ON v.invoice_id = i.invoice_id
               WHERE v.order_status <> 'DELIVERED' OR v.is_deleted = 1 OR i.status <> 'REQUESTED')
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51050, N'Chỉ tạo yêu cầu trả hàng (REQUESTED) cho đơn hàng đã DELIVERED.', 1;
    END
END;
GO

-- Luồng trạng thái trả hàng + nhập lại kho khi RECEIVED
CREATE TRIGGER trg_returns_au ON [returns] AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.return_id = i.return_id WHERE i.status <> d.status) RETURN;

    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.return_id = i.return_id
               WHERE i.status <> d.status
                 AND NOT EXISTS (SELECT 1 FROM (VALUES
                        ('REQUESTED','APPROVED'),('REQUESTED','REJECTED'),('REQUESTED','CANCELLED'),
                        ('APPROVED','RECEIVED'),('APPROVED','CANCELLED')) AS v(from_s, to_s)
                        WHERE v.from_s = d.status AND v.to_s = i.status))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51051, N'Chuyển trạng thái yêu cầu trả hàng không hợp lệ.', 1;
    END
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.return_id = i.return_id
               WHERE i.status <> d.status AND i.status IN ('APPROVED','REJECTED','RECEIVED')
                 AND (i.processed_by IS NULL OR i.processed_at IS NULL))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51052, N'Cần ghi người xử lý (processed_by) và thời điểm xử lý (processed_at).', 1;
    END
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.return_id = i.return_id
               WHERE i.status <> d.status AND i.status = 'APPROVED'
                 AND NOT EXISTS (SELECT 1 FROM return_items x WHERE x.return_id = i.return_id))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51053, N'Yêu cầu trả hàng chưa có sản phẩm nào.', 1;
    END

    INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, return_id, created_by)
    SELECT ri.variant_id, 'RETURN_RESTOCK', ri.quantity, N'Nhận hàng trả - nhập lại kho', ri.return_id,
           TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT)
    FROM return_items ri
    JOIN inserted i ON i.return_id = ri.return_id
    JOIN deleted  d ON d.return_id = i.return_id
    WHERE d.status <> 'RECEIVED' AND i.status = 'RECEIVED' AND ri.item_condition = 'RESALABLE';
END;
GO

-- Hàng trả: chỉ sửa khi REQUESTED/APPROVED; có trong đơn; tổng trả không vượt số đã mua
CREATE TRIGGER trg_return_items_aiud ON return_items AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted) RETURN;

    IF EXISTS (SELECT 1 FROM [returns] r
               WHERE r.return_id IN (SELECT return_id FROM inserted UNION SELECT return_id FROM deleted)
                 AND (r.status NOT IN ('REQUESTED','APPROVED') OR r.is_deleted = 1))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51054, N'Chỉ sửa danh sách hàng trả khi yêu cầu ở trạng thái REQUESTED/APPROVED.', 1;
    END

    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT r.invoice_id, ri.variant_id
              FROM inserted ri JOIN [returns] r ON r.return_id = ri.return_id) k
        LEFT JOIN invoice_details d ON d.invoice_id = k.invoice_id AND d.variant_id = k.variant_id
        CROSS APPLY (SELECT ISNULL(SUM(x.quantity), 0) AS q
                     FROM return_items x JOIN [returns] rr ON rr.return_id = x.return_id
                     WHERE rr.invoice_id = k.invoice_id AND x.variant_id = k.variant_id
                       AND rr.status NOT IN ('REJECTED','CANCELLED') AND rr.is_deleted = 0) s
        WHERE d.invoice_id IS NULL OR s.q > d.quantity)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51055, N'Sản phẩm trả không có trong đơn hoặc tổng số lượng trả vượt số lượng đã mua.', 1;
    END
END;
GO

/* =====================================================================
   15. TRIGGER – ĐÁNH GIÁ & AUDIT TỰ ĐỘNG
   ===================================================================== */
-- Nếu đánh giá gắn invoice_id: đơn phải của chính khách, đã DELIVERED, và có sản phẩm đó
CREATE TRIGGER trg_reviews_validate ON product_reviews AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN invoices v ON v.invoice_id = i.invoice_id
               WHERE v.customer_id IS NULL OR v.customer_id <> i.customer_id OR v.order_status <> 'DELIVERED'
                  OR NOT EXISTS (SELECT 1 FROM invoice_details d
                                 JOIN product_variants pv ON pv.variant_id = d.variant_id
                                 WHERE d.invoice_id = v.invoice_id AND pv.product_id = i.product_id))
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 51060, N'invoice_id không hợp lệ: đơn phải của khách này, đã giao, và có chứa sản phẩm được đánh giá.', 1;
    END
END;
GO

-- Audit: đổi giá sản phẩm
CREATE TRIGGER trg_products_audit ON products AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(current_price) RETURN;
    INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, old_values, new_values)
    SELECT TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT), 'PRODUCT_PRICE_CHANGE', 'products',
           CAST(i.product_id AS NVARCHAR(100)),
           CONCAT(N'{"current_price":', d.current_price, N'}'),
           CONCAT(N'{"current_price":', i.current_price, N'}')
    FROM inserted i JOIN deleted d ON d.product_id = i.product_id
    WHERE i.current_price <> d.current_price;
END;
GO

-- Audit: khóa/mở khóa, đổi vai trò (không bao giờ ghi password_hash)
CREATE TRIGGER trg_users_audit ON users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @uid INT = TRY_CAST(SESSION_CONTEXT(N'user_id') AS INT);

    INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, old_values, new_values)
    SELECT @uid, CASE WHEN i.is_locked = 1 THEN 'USER_LOCK' ELSE 'USER_UNLOCK' END, 'users',
           CAST(i.user_id AS NVARCHAR(100)),
           CONCAT(N'{"is_locked":', d.is_locked, N'}'), CONCAT(N'{"is_locked":', i.is_locked, N'}')
    FROM inserted i JOIN deleted d ON d.user_id = i.user_id
    WHERE i.is_locked <> d.is_locked;

    INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, old_values, new_values)
    SELECT @uid, 'USER_ROLE_CHANGE', 'users', CAST(i.user_id AS NVARCHAR(100)),
           CONCAT(N'{"role_id":', d.role_id, N'}'), CONCAT(N'{"role_id":', i.role_id, N'}')
    FROM inserted i JOIN deleted d ON d.user_id = i.user_id
    WHERE i.role_id <> d.role_id;
END;
GO

/* =====================================================================
   16. STORED PROCEDURE – điểm vào chuẩn cho thao tác nhiều bước
   ===================================================================== */
-- Đổi trạng thái đơn hàng (ghi người thực hiện + ghi chú; lịch sử và kho do trigger lo,
-- tất cả nằm trong 1 transaction). Gọi lại cùng yêu cầu lần 2 -> lỗi 51070, không trừ kho trùng.
CREATE PROCEDURE dbo.sp_change_order_status
    @invoice_id INT,
    @new_status VARCHAR(10),
    @user_id    INT = NULL,
    @note       NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sp_set_session_context @key = N'user_id', @value = @user_id;
        EXEC sp_set_session_context @key = N'note',    @value = @note;

        UPDATE invoices SET order_status = @new_status
        WHERE invoice_id = @invoice_id AND order_status <> @new_status AND is_deleted = 0;

        IF @@ROWCOUNT = 0
            THROW 51070, N'Đơn hàng không tồn tại, đã bị xóa hoặc đã ở trạng thái này.', 1;

        COMMIT TRANSACTION;
        EXEC sp_set_session_context @key = N'user_id', @value = NULL;
        EXEC sp_set_session_context @key = N'note',    @value = NULL;
    END TRY
    BEGIN CATCH
        EXEC sp_set_session_context @key = N'user_id', @value = NULL;
        EXEC sp_set_session_context @key = N'note',    @value = NULL;
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Điều chỉnh tồn kho thủ công (kiểm kê, hỏng, mất...). @quantity_change: (+) tăng, (-) giảm
CREATE PROCEDURE dbo.sp_adjust_stock
    @variant_id      INT,
    @quantity_change INT,
    @reason          NVARCHAR(255),
    @user_id         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @quantity_change = 0 THROW 51071, N'Số lượng điều chỉnh phải khác 0.', 1;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, created_by)
        VALUES (@variant_id, CASE WHEN @quantity_change > 0 THEN 'ADJUST_IN' ELSE 'ADJUST_OUT' END,
                @quantity_change, @reason, @user_id);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* =====================================================================
   17. VIEW
   ===================================================================== */
-- Trạng thái thanh toán suy ra từ payments + refunds (không lưu cột -> không lệch)
CREATE VIEW dbo.vw_invoice_payment_status AS
SELECT i.invoice_id, i.amount_payable,
       ISNULL(p.paid, 0)     AS paid_amount,
       ISNULL(r.refunded, 0) AS refunded_amount,
       CASE WHEN ISNULL(r.refunded, 0) > 0 AND ISNULL(r.refunded, 0) >= ISNULL(p.paid, 0) THEN 'REFUNDED'
            WHEN ISNULL(r.refunded, 0) > 0                                                THEN 'PARTIALLY_REFUNDED'
            WHEN ISNULL(p.paid, 0) = 0                                                    THEN 'UNPAID'
            WHEN ISNULL(p.paid, 0) < i.amount_payable                                     THEN 'PARTIALLY_PAID'
            ELSE 'PAID' END AS payment_status
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid
           FROM payments WHERE status = 'SUCCESS' AND is_deleted = 0 GROUP BY invoice_id) p ON p.invoice_id = i.invoice_id
LEFT JOIN (SELECT pm.invoice_id, SUM(rf.amount) AS refunded
           FROM refunds rf JOIN payments pm ON pm.payment_id = rf.payment_id
           WHERE rf.status = 'SUCCESS' AND rf.is_deleted = 0 GROUP BY pm.invoice_id) r ON r.invoice_id = i.invoice_id;
GO

-- Tình trạng từng dòng giỏ hàng: biến thể xóa / ngừng bán / hết hàng / không đủ hàng
CREATE VIEW dbo.vw_cart_item_status AS
SELECT ci.cart_id, ci.variant_id, ci.quantity, v.stock_quantity, p.current_price,
       CASE WHEN v.is_deleted = 1 OR p.is_deleted = 1 OR p.is_active = 0 THEN 'UNAVAILABLE'
            WHEN v.stock_quantity = 0                                    THEN 'OUT_OF_STOCK'
            WHEN v.stock_quantity < ci.quantity                          THEN 'INSUFFICIENT_STOCK'
            ELSE 'OK' END AS availability
FROM cart_items ci
JOIN product_variants v ON v.variant_id = ci.variant_id
JOIN products p         ON p.product_id = v.product_id
WHERE ci.is_deleted = 0;
GO

/* =====================================================================
   18. DỮ LIỆU KHỞI TẠO
   ===================================================================== */
INSERT INTO roles (role_name, user_type, description) VALUES
    ('ADMIN',    'EMPLOYEE', N'Quản trị hệ thống'),
    ('STAFF',    'EMPLOYEE', N'Nhân viên bán hàng / kho'),
    ('CUSTOMER', 'CUSTOMER', N'Khách hàng');

INSERT INTO sizes (size_label, sort_order) VALUES
    ('36',1),('37',2),('38',3),('39',4),('40',5),('41',6),('42',7),('43',8),('44',9);

INSERT INTO colors (color_name, hex_code) VALUES
    (N'Đen','#000000'),(N'Trắng','#FFFFFF'),(N'Xám','#808080'),(N'Xanh navy','#1F2A44'),(N'Đỏ','#C62828');

INSERT INTO payment_methods (method_code, method_name, is_online) VALUES
    ('CASH',          N'Tiền mặt',               0),
    ('BANK_TRANSFER', N'Chuyển khoản ngân hàng', 1),
    ('BANK_QR',       N'Quét mã QR ngân hàng',   1),
    ('MOMO',          N'Ví MoMo',                1);
GO
