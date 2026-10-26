/* 003 – Bổ sung chấm công, bảng lương, loại hình làm việc (FULL_TIME / PART_TIME),
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

/* ---------------------------------------------------------------------
   2. BẢNG CA LÀM VIỆC (SHIFTS)
   --------------------------------------------------------------------- */
IF OBJECT_ID('shifts', 'U') IS NULL
BEGIN
    CREATE TABLE shifts (
        shift_id       INT IDENTITY(1,1) PRIMARY KEY,
        shift_code     VARCHAR(20) NOT NULL UNIQUE,
        shift_name     NVARCHAR(100) NOT NULL,
        start_time     TIME(0) NOT NULL,
        end_time       TIME(0) NOT NULL,
        break_minutes  INT NOT NULL DEFAULT 0,
        standard_hours DECIMAL(4,2) NOT NULL DEFAULT 8.0,
        target_role    VARCHAR(30) NULL, -- 'SALES', 'WAREHOUSE' hoặc NULL (chung)
        is_active      BIT NOT NULL DEFAULT 1
    );
END
GO

-- Seed các ca làm việc cơ bản nếu chưa có
IF NOT EXISTS (SELECT 1 FROM shifts WHERE shift_code = 'CA_SANG')
BEGIN
    INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_minutes, standard_hours, target_role)
    VALUES ('CA_SANG', N'Ca Sáng (Full-time / Part-time)', '08:00:00', '16:30:00', 30, 8.0, NULL);
END

IF NOT EXISTS (SELECT 1 FROM shifts WHERE shift_code = 'CA_TOI')
BEGIN
    INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_minutes, standard_hours, target_role)
    VALUES ('CA_TOI', N'Ca Chiều / Tối (Full-time)', '13:30:00', '22:00:00', 30, 8.0, NULL);
END

IF NOT EXISTS (SELECT 1 FROM shifts WHERE shift_code = 'CA_PT_SANG')
BEGIN
    INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_minutes, standard_hours, target_role)
    VALUES ('CA_PT_SANG', N'Ca Sáng Part-time', '08:00:00', '12:30:00', 0, 4.5, NULL);
END

IF NOT EXISTS (SELECT 1 FROM shifts WHERE shift_code = 'CA_PT_TOI')
BEGIN
    INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_minutes, standard_hours, target_role)
    VALUES ('CA_PT_TOI', N'Ca Tối Part-time', '17:30:00', '22:00:00', 0, 4.5, NULL);
END
GO

/* ---------------------------------------------------------------------
   3. BẢNG CHẤM CÔNG (ATTENDANCES)
   --------------------------------------------------------------------- */
IF OBJECT_ID('attendances', 'U') IS NULL
BEGIN
    CREATE TABLE attendances (
        attendance_id       INT IDENTITY(1,1) PRIMARY KEY,
        employee_id         INT NOT NULL REFERENCES employees(employee_id),
        shift_id            INT NULL REFERENCES shifts(shift_id),
        work_date           DATE NOT NULL,
        check_in            DATETIME2(3) NULL,
        check_out           DATETIME2(3) NULL,
        actual_hours        DECIMAL(5,2) NOT NULL DEFAULT 0,
        work_units          DECIMAL(3,2) NOT NULL DEFAULT 0, -- 1.0 (đủ công), 0.5 (nửa công)
        late_minutes        INT NOT NULL DEFAULT 0,
        early_leave_minutes INT NOT NULL DEFAULT 0,
        status              VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
        note                NVARCHAR(255) NULL,
        verified_by         INT NULL REFERENCES employees(employee_id),
        created_at          DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT ck_att_status CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE_PAID', 'LEAVE_UNPAID')),
        CONSTRAINT uq_emp_date_shift UNIQUE (employee_id, work_date, shift_id)
    );
    CREATE INDEX idx_att_date ON attendances(work_date);
    CREATE INDEX idx_att_emp_date ON attendances(employee_id, work_date);
END
GO

/* ---------------------------------------------------------------------
   4. BẢNG KỲ LƯƠNG (PAYROLLS) & CHI TIẾT LƯƠNG (PAYROLL_ITEMS)
   --------------------------------------------------------------------- */
IF OBJECT_ID('payrolls', 'U') IS NULL
BEGIN
    CREATE TABLE payrolls (
        payroll_id     INT IDENTITY(1,1) PRIMARY KEY,
        period_month   INT NOT NULL,
        period_year    INT NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        total_amount   DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_by     INT NOT NULL REFERENCES employees(employee_id),
        approved_by    INT NULL REFERENCES employees(employee_id),
        approved_at    DATETIME2(3) NULL,
        paid_at        DATETIME2(3) NULL,
        created_at     DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT ck_payroll_month CHECK (period_month BETWEEN 1 AND 12),
        CONSTRAINT ck_payroll_status CHECK (status IN ('DRAFT', 'APPROVED', 'PAID')),
        CONSTRAINT uq_payroll_period UNIQUE (period_month, period_year)
    );
END
GO

IF OBJECT_ID('payroll_items', 'U') IS NULL
BEGIN
    CREATE TABLE payroll_items (
        item_id             INT IDENTITY(1,1) PRIMARY KEY,
        payroll_id          INT NOT NULL REFERENCES payrolls(payroll_id) ON DELETE CASCADE,
        employee_id         INT NOT NULL REFERENCES employees(employee_id),
        employment_type     VARCHAR(10) NOT NULL,
        standard_work_days  DECIMAL(4,1) NOT NULL DEFAULT 26.0,
        actual_work_days    DECIMAL(4,1) NOT NULL DEFAULT 0,
        actual_work_hours   DECIMAL(6,2) NOT NULL DEFAULT 0,
        base_salary_or_rate DECIMAL(18,2) NOT NULL DEFAULT 0, -- base_salary nếu FT, hourly_rate nếu PT
        base_pay            DECIMAL(18,2) NOT NULL DEFAULT 0, -- Lương cơ bản tính theo công hoặc giờ
        sales_revenue       DECIMAL(18,2) NOT NULL DEFAULT 0, -- Doanh số cá nhân bán được
        commission_rate     DECIMAL(5,4)  NOT NULL DEFAULT 0,
        commission_amount   DECIMAL(18,2) NOT NULL DEFAULT 0, -- Tiền hoa hồng doanh số
        kpi_bonus           DECIMAL(18,2) NOT NULL DEFAULT 0, -- Thưởng hiệu suất kho hoặc thưởng vượt KPI sales
        allowance_amount    DECIMAL(18,2) NOT NULL DEFAULT 0, -- Phụ cấp
        penalty_amount      DECIMAL(18,2) NOT NULL DEFAULT 0, -- Phạt (đi trễ, nghỉ không phép, vi phạm)
        bonus_amount        DECIMAL(18,2) NOT NULL DEFAULT 0, -- Thưởng chuyên cần, thưởng nóng
        advance_amount      DECIMAL(18,2) NOT NULL DEFAULT 0, -- Tạm ứng
        net_pay             DECIMAL(18,2) NOT NULL DEFAULT 0, -- Lương thực lĩnh
        note                NVARCHAR(500) NULL,
        CONSTRAINT uq_payroll_emp UNIQUE (payroll_id, employee_id)
    );
    CREATE INDEX idx_pi_payroll ON payroll_items(payroll_id);
    CREATE INDEX idx_pi_emp ON payroll_items(employee_id);
END
GO
