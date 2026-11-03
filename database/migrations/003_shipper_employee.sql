USE ShoeStore;
GO

-- Thêm cột lưu mã nhân viên giao hàng (liên kết với bảng employees)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[invoices]') AND name = N'shipper_employee_id'
)
BEGIN
    ALTER TABLE invoices
    ADD shipper_employee_id INT NULL REFERENCES employees(employee_id);
END
GO

-- Tạo index tối ưu truy vấn
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_invoices_shipper')
BEGIN
    CREATE INDEX idx_invoices_shipper ON invoices(shipper_employee_id, order_status);
END
GO
