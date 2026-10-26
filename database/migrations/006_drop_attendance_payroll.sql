USE ShoeStore;
GO

-- Xóa các bảng liên quan đến bảng lương nhân viên và chấm công
IF OBJECT_ID('payroll_items', 'U') IS NOT NULL DROP TABLE payroll_items;
IF OBJECT_ID('payrolls', 'U') IS NOT NULL DROP TABLE payrolls;
IF OBJECT_ID('shift_schedules', 'U') IS NOT NULL DROP TABLE shift_schedules;
IF OBJECT_ID('attendances', 'U') IS NOT NULL DROP TABLE attendances;
IF OBJECT_ID('shifts', 'U') IS NOT NULL DROP TABLE shifts;
GO
