-- Migration 004: Thêm supplier_id vào bảng products để gắn sản phẩm với nhà cung cấp
-- Phục vụ luồng: Khi lập phiếu nhập kho, chọn NCC nào thì chỉ hiển thị sản phẩm của NCC đó,
-- và khi thêm sản phẩm vào phiếu nhập hiển thị rõ nhà cung cấp của sản phẩm.

IF COL_LENGTH('products', 'supplier_id') IS NULL
BEGIN
    ALTER TABLE products ADD supplier_id INT NULL CONSTRAINT fk_products_supplier REFERENCES suppliers(supplier_id);
END
GO

-- Gán nhà cung cấp ban đầu cho các sản phẩm chưa có supplier_id
IF EXISTS (SELECT 1 FROM suppliers WHERE supplier_id = 1)
BEGIN
    UPDATE products
    SET supplier_id = 1
    WHERE supplier_id IS NULL AND (brand_id = 1 OR product_name LIKE N'%Nike%');
END
GO

IF EXISTS (SELECT 1 FROM suppliers WHERE supplier_id = 2)
BEGIN
    UPDATE products
    SET supplier_id = 2
    WHERE supplier_id IS NULL AND (brand_id IN (2, 3) OR product_name LIKE N'%Adidas%' OR product_name LIKE N'%Puma%');
END
GO

IF EXISTS (SELECT 1 FROM suppliers WHERE supplier_id = 3)
BEGIN
    UPDATE products
    SET supplier_id = 3
    WHERE supplier_id IS NULL;
END
GO
