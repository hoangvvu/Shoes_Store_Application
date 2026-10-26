-- Migration 005: Thêm ca chiều part-time và bảng shift_schedules để nhân viên part-time đăng ký ca làm việc linh hoạt

IF NOT EXISTS (SELECT 1 FROM shifts WHERE shift_code = 'CA_PT_CHIEU')
BEGIN
    INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_minutes, standard_hours, target_role)
    VALUES ('CA_PT_CHIEU', N'Ca Chiều Part-time', '12:30:00', '17:00:00', 0, 4.5, NULL);
END
GO

IF OBJECT_ID('shift_schedules', 'U') IS NULL
BEGIN
    CREATE TABLE shift_schedules (
        schedule_id   INT IDENTITY(1,1) PRIMARY KEY,
        employee_id   INT NOT NULL REFERENCES employees(employee_id),
        shift_id      INT NOT NULL REFERENCES shifts(shift_id),
        work_date     DATE NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- 'REGISTERED', 'APPROVED', 'REJECTED', 'CANCELLED'
        notes         NVARCHAR(255) NULL,
        approved_by   INT NULL REFERENCES employees(employee_id),
        created_at    DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at    DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT uq_emp_shift_date UNIQUE (employee_id, shift_id, work_date),
        CONSTRAINT ck_schedule_status CHECK (status IN ('REGISTERED', 'APPROVED', 'REJECTED', 'CANCELLED'))
    );
    CREATE INDEX idx_schedule_emp_date ON shift_schedules(employee_id, work_date);
    CREATE INDEX idx_schedule_date ON shift_schedules(work_date);
END
GO
