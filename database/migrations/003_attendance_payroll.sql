/* 003 – Bổ sung loại hình làm việc (FULL_TIME / PART_TIME),
     hoa hồng doanh số cho nhân viên bán hàng và nhân viên kho.
   Chạy lại nhiều lần không lỗi (Idempotent). */
USE ShoeStore;
GO

/* ---------------------------------------------------------------------
   1. BỔ SUNG CỘT CHO BẢNG EMPLOYEES
   --------------------------------------------------------------------- */
IF COL_LENGTH('employees', 'employment_type') IS NULL 
    ALTER TABLE employees ADD employment_type VARCHAR(10) NOT NULL CONSTRAINT df_emp_type DEFAULT 'FULL_TIME';
IF COL_LENGTH('employees', 'hourly_rate') IS NULL 
    ALTER TABLE employees ADD hourly_rate DECIMAL(18,2) NOT NULL CONSTRAINT df_emp_hourly DEFAULT 0;
IF COL_LENGTH('employees', 'commission_rate') IS NULL 
    ALTER TABLE employees ADD commission_rate DECIMAL(5,4) NOT NULL CONSTRAINT df_emp_comm DEFAULT 0.0100; -- 1.0% mặc định
IF COL_LENGTH('employees', 'allowance') IS NULL 
    ALTER TABLE employees ADD allowance DECIMAL(18,2) NOT NULL CONSTRAINT df_emp_allowance DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_employment_type')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_employment_type CHECK (employment_type IN ('FULL_TIME', 'PART_TIME'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_hourly_rate')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_hourly_rate CHECK (hourly_rate >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_commission_rate')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_commission_rate CHECK (commission_rate >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_emp_allowance')
    ALTER TABLE employees ADD CONSTRAINT ck_emp_allowance CHECK (allowance >= 0);
GO
