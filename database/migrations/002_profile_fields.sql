/* 002 – Bổ sung thông tin cá nhân (đều cho phép NULL, vì không bắt buộc phải cung cấp đầy đủ):
     employees: gender, email, hire_date
     customers: gender, date_of_birth, email
   Chạy lại nhiều lần không lỗi. Báo nhóm trước khi chạy trên CSDL dùng chung.
   gender: 'MALE' | 'FEMALE' | 'OTHER'.  email: kiểm tra cơ bản ở CSDL, kiểm tra đầy đủ ở backend. */
USE ShoeStore;
GO
IF COL_LENGTH('employees', 'gender')    IS NULL ALTER TABLE employees ADD gender    VARCHAR(10)  NULL;
IF COL_LENGTH('employees', 'email')     IS NULL ALTER TABLE employees ADD email     VARCHAR(100) NULL;
IF COL_LENGTH('employees', 'hire_date') IS NULL ALTER TABLE employees ADD hire_date DATE         NULL;
IF COL_LENGTH('customers', 'gender')        IS NULL ALTER TABLE customers ADD gender        VARCHAR(10)  NULL;
IF COL_LENGTH('customers', 'date_of_birth') IS NULL ALTER TABLE customers ADD date_of_birth DATE         NULL;
IF COL_LENGTH('customers', 'email')         IS NULL ALTER TABLE customers ADD email         VARCHAR(100) NULL;
GO
-- Ràng buộc đặt trong batch riêng (cột phải tồn tại trước khi tham chiếu)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_gender')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_gender CHECK (gender IN ('MALE','FEMALE','OTHER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_email')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_email CHECK (email LIKE '%_@_%._%');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_cus_gender')
    ALTER TABLE customers ADD CONSTRAINT ck_cus_gender CHECK (gender IN ('MALE','FEMALE','OTHER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_cus_email')
    ALTER TABLE customers ADD CONSTRAINT ck_cus_email CHECK (email LIKE '%_@_%._%');
GO
SELECT 'employees' AS tbl, name, TYPE_NAME(system_type_id) AS type, is_nullable FROM sys.columns
 WHERE object_id = OBJECT_ID('employees') AND name IN ('gender','email','hire_date')
UNION ALL
SELECT 'customers', name, TYPE_NAME(system_type_id), is_nullable FROM sys.columns
 WHERE object_id = OBJECT_ID('customers') AND name IN ('gender','date_of_birth','email');
GO

