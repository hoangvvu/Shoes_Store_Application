import React, { useEffect, useState } from 'react';
import { employeeService } from '../services/employee.service';
import { Employee, EmployeePerformance } from '../types';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  BarChart2,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPerfOpen, setIsPerfOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [perfData, setPerfData] = useState<EmployeePerformance | null>(null);

  // Form states
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    roleName: 'STAFF',
    baseSalary: 8000000,
    phone: '',
    address: '',
    dateOfBirth: '',
  });

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeService.getEmployees({ q: search, page, size: 10 });
      if (res.success) {
        setEmployees(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeService.createEmployee(form);
      notify('success', 'Thêm mới nhân viên và tài khoản thành công!');
      setIsAddOpen(false);
      setForm({
        fullName: '',
        username: '',
        password: '',
        roleName: 'STAFF',
        baseSalary: 8000000,
        phone: '',
        address: '',
        dateOfBirth: '',
      });
      loadEmployees();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi tạo nhân viên');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      await employeeService.updateEmployee(selectedEmp.employeeId, {
        fullName: form.fullName,
        baseSalary: Number(form.baseSalary),
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
      });
      notify('success', 'Cập nhật nhân viên thành công!');
      setIsEditOpen(false);
      loadEmployees();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi cập nhật nhân viên');
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${emp.fullName}"?`)) return;
    try {
      await employeeService.deleteEmployee(emp.employeeId);
      notify('success', `Đã xóa mềm nhân viên "${emp.fullName}"`);
      loadEmployees();
    } catch (err: any) {
      notify('error', err.message || 'Lỗi khi xóa nhân viên');
    }
  };

  const handleViewPerformance = async (emp: Employee) => {
    setSelectedEmp(emp);
    try {
      const res = await employeeService.getEmployeePerformance(emp.employeeId);
      if (res.success) {
        setPerfData(res.data);
        setIsPerfOpen(true);
      }
    } catch (err: any) {
      notify('error', err.message || 'Lỗi tải báo cáo doanh số');
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setForm({
      fullName: emp.fullName,
      username: emp.username || '',
      password: '',
      roleName: emp.roleName || 'STAFF',
      baseSalary: emp.baseSalary,
      phone: emp.phone || '',
      address: emp.address || '',
      dateOfBirth: emp.dateOfBirth ? String(emp.dateOfBirth).slice(0, 10) : '',
    });
    setIsEditOpen(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            👥 Quản Lý Nhân Viên (M3)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Quản lý danh sách nhân sự, phân quyền vai trò STAFF/ADMIN, lương cơ bản và doanh số bán hàng
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
          }}
        >
          <UserPlus size={18} />
          Thêm Nhân Viên Mới
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Tìm
          </button>
        </form>

        <button
          onClick={loadEmployees}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#475569',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <RefreshCw size={15} />
          Tải lại
        </button>
      </div>

      {/* Employees Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Mã NV</th>
              <th style={{ padding: '14px 16px' }}>Họ Và Tên</th>
              <th style={{ padding: '14px 16px' }}>Tài Khoản</th>
              <th style={{ padding: '14px 16px' }}>Vai Trò</th>
              <th style={{ padding: '14px 16px' }}>Số Điện Thoại</th>
              <th style={{ padding: '14px 16px' }}>Lương Cơ Bản</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải dữ liệu nhân viên từ SQL Server...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Không tìm thấy nhân viên nào phù hợp.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.employeeId}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#64748b' }}>
                    #{emp.employeeId}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {emp.fullName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontFamily: 'monospace' }}>
                    {emp.username || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: emp.roleName === 'ADMIN' ? '#fef3c7' : '#e0f2fe',
                        color: emp.roleName === 'ADMIN' ? '#b45309' : '#0369a1',
                      }}
                    >
                      {emp.roleName || 'STAFF'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {emp.phone || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                    {Number(emp.baseSalary || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        title="Xem doanh số (M3.6)"
                        onClick={() => handleViewPerformance(emp)}
                        style={{
                          border: 'none',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <BarChart2 size={16} />
                      </button>
                      <button
                        title="Sửa thông tin / Lương"
                        onClick={() => openEditModal(emp)}
                        style={{
                          border: 'none',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        title="Xóa mềm (chặn nếu còn đơn chưa hoàn tất)"
                        onClick={() => handleDelete(emp)}
                        style={{
                          border: 'none',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <span>Trang {page} / {totalPages}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: page <= 1 ? '#f1f5f9' : '#ffffff',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm Nhân Viên */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                ➕ Thêm Nhân Viên Mới (M3.3)
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Họ và Tên *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Tên Đăng Nhập (Username) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="nguyenan2026"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Mật Khẩu Khởi Tạo * (≥ 8 ký tự)
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Vai Trò Quyền Hạn
                  </label>
                  <select
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="STAFF">STAFF (Nhân viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Lương Cơ Bản (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={form.baseSalary}
                    onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Ngày Sinh
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Địa Chỉ Thường Trú
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, quận/huyện..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Lưu & Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sửa Thông Tin & Lương Nhân Viên */}
      {isEditOpen && selectedEmp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                ✏️ Cập Nhật Thông Tin & Lương (M3.4)
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Họ và Tên *
                </label>
                <input
                  required
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Lương Cơ Bản (VNĐ) - Chỉ Admin được xem/sửa
                </label>
                <input
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Địa Chỉ
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem Doanh Số Nhân Viên */}
      {isPerfOpen && selectedEmp && perfData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                📈 Báo Cáo Doanh Số (M3.6)
              </h3>
              <button
                onClick={() => setIsPerfOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{perfData.fullName}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Mã nhân viên: #{perfData.employeeId}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#e0f2fe', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: 600 }}>ĐƠN ĐÃ GIAO</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0369a1', marginTop: '6px' }}>
                  {perfData.totalDeliveredOrders} đơn
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>TỔNG DOANH THU</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '8px' }}>
                  {Number(perfData.totalRevenue || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPerfOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
