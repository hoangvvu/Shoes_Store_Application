/* 003 – Tách full_name thành last_name và first_name cho employees và customers (commit 9fd9255).
   Chạy lại nhiều lần không lỗi. */
USE ShoeStore;
GO
IF COL_LENGTH('employees', 'last_name') IS NULL
    ALTER TABLE employees ADD last_name NVARCHAR(50) NULL;
IF COL_LENGTH('employees', 'first_name') IS NULL
    ALTER TABLE employees ADD first_name NVARCHAR(50) NULL;
IF COL_LENGTH('customers', 'last_name') IS NULL
    ALTER TABLE customers ADD last_name NVARCHAR(50) NULL;
IF COL_LENGTH('customers', 'first_name') IS NULL
    ALTER TABLE customers ADD first_name NVARCHAR(50) NULL;
GO

IF COL_LENGTH('employees', 'full_name') IS NOT NULL
BEGIN
    EXEC(N'UPDATE employees
    SET 
      first_name = CASE 
        WHEN CHARINDEX('' '', LTRIM(RTRIM(full_name))) > 0 
          THEN RIGHT(LTRIM(RTRIM(full_name)), CHARINDEX('' '', REVERSE(LTRIM(RTRIM(full_name)))) - 1)
        ELSE LTRIM(RTRIM(full_name))
      END,
      last_name = CASE 
        WHEN CHARINDEX('' '', LTRIM(RTRIM(full_name))) > 0 
          THEN LEFT(LTRIM(RTRIM(full_name)), LEN(LTRIM(RTRIM(full_name))) - CHARINDEX('' '', REVERSE(LTRIM(RTRIM(full_name)))))
        ELSE N''''
      END
    WHERE (last_name IS NULL OR first_name IS NULL) AND full_name IS NOT NULL;');
END
GO

IF COL_LENGTH('customers', 'full_name') IS NOT NULL
BEGIN
    EXEC(N'UPDATE customers
    SET 
      first_name = CASE 
        WHEN CHARINDEX('' '', LTRIM(RTRIM(full_name))) > 0 
          THEN RIGHT(LTRIM(RTRIM(full_name)), CHARINDEX('' '', REVERSE(LTRIM(RTRIM(full_name)))) - 1)
        ELSE LTRIM(RTRIM(full_name))
      END,
      last_name = CASE 
        WHEN CHARINDEX('' '', LTRIM(RTRIM(full_name))) > 0 
          THEN LEFT(LTRIM(RTRIM(full_name)), LEN(LTRIM(RTRIM(full_name))) - CHARINDEX('' '', REVERSE(LTRIM(RTRIM(full_name)))))
        ELSE N''''
      END
    WHERE (last_name IS NULL OR first_name IS NULL) AND full_name IS NOT NULL;');
END
GO

UPDATE employees SET last_name = ISNULL(last_name, N''), first_name = ISNULL(first_name, N'') WHERE last_name IS NULL OR first_name IS NULL;
UPDATE customers SET last_name = ISNULL(last_name, N''), first_name = ISNULL(first_name, N'') WHERE last_name IS NULL OR first_name IS NULL;
GO

ALTER TABLE employees ALTER COLUMN last_name NVARCHAR(50) NOT NULL;
ALTER TABLE employees ALTER COLUMN first_name NVARCHAR(50) NOT NULL;
ALTER TABLE customers ALTER COLUMN last_name NVARCHAR(50) NOT NULL;
ALTER TABLE customers ALTER COLUMN first_name NVARCHAR(50) NOT NULL;
GO

-- Xóa cột full_name cũ để tránh lỗi NOT NULL khi chạy seed hoặc tạo mới
IF COL_LENGTH('employees', 'full_name') IS NOT NULL
    ALTER TABLE employees DROP COLUMN full_name;
IF COL_LENGTH('customers', 'full_name') IS NOT NULL
    ALTER TABLE customers DROP COLUMN full_name;
GO
