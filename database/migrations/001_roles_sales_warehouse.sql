/* 001 – Tách vai trò STAFF thành SALES (bán hàng) và WAREHOUSE (kho) theo docx mục 6.6.
   Chạy 1 lần sau khi tạo CSDL từ shoestore_schema.sql (có thể chạy lại, không lỗi).
   Báo nhóm trước khi chạy trên CSDL dùng chung. */
USE ShoeStore;
GO
IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'SALES')
    INSERT INTO roles (role_name, user_type, description) VALUES ('SALES', 'EMPLOYEE', N'Nhân viên bán hàng');
IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'WAREHOUSE')
    INSERT INTO roles (role_name, user_type, description) VALUES ('WAREHOUSE', 'EMPLOYEE', N'Nhân viên kho');
GO
-- Tài khoản STAFF cũ (nếu có) chuyển sang SALES; sau đó bỏ role STAFF nếu không còn ai dùng.
DECLARE @sales INT = (SELECT role_id FROM roles WHERE role_name = 'SALES');
DECLARE @staff INT = (SELECT role_id FROM roles WHERE role_name = 'STAFF');
IF @staff IS NOT NULL
BEGIN
    UPDATE users SET role_id = @sales WHERE role_id = @staff;   -- trigger audit ghi USER_ROLE_CHANGE (actor NULL)
    DELETE FROM roles WHERE role_id = @staff;
END
GO
SELECT role_id, role_name, user_type FROM roles ORDER BY role_id;
GO
