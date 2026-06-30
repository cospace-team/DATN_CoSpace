import React, { useState } from 'react';
import { FiUsers, FiEdit2, FiLock, FiPlus, FiSave, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { users as allUsers, type User } from '../../data/mockData';

const BAStaffPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [staffList, setStaffList] = useState<User[]>(
    allUsers.filter((u) => u.role === 'staff' && u.branch_id === branchId)
  );

  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Confirmation Modal State
  const [isConfirmLockOpen, setIsConfirmLockOpen] = useState(false);
  const [staffToLock, setStaffToLock] = useState<User | null>(null);

  const filtered = staffList.filter(u => {
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleOpenModal = (staff: User | null = null) => {
    setFormError('');
    setSuccessMessage('');
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        full_name: staff.full_name,
        email: staff.email,
        password: '',
      });
    } else {
      setEditingStaff(null);
      setFormData({ full_name: '', email: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name || !formData.email || (!editingStaff && !formData.password)) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    // Check Duplicate Email (Constraint 6a)
    const isDuplicate = staffList.some(u => u.email === formData.email && u.id !== editingStaff?.id);
    if (isDuplicate) {
      setFormError('Email này đã được sử dụng. Vui lòng chọn email khác.');
      return;
    }

    if (editingStaff) {
      setStaffList(prev => prev.map(u => u.id === editingStaff.id ? { 
        ...u, 
        full_name: formData.full_name, 
        email: formData.email
      } : u));
      showSuccess('Cập nhật thông tin nhân viên thành công!');
    } else {
      const newStaff: User = {
        id: `user-${Date.now()}`,
        email: formData.email,
        full_name: formData.full_name,
        phone: '', // Mặc định trống, có thể thêm field nếu cần
        avatar_url: '',
        status: 'active',
        role: 'staff',
        branch_id: branchId,
        membership_tier: 'standard',
        created_at: new Date().toISOString()
      };
      setStaffList([newStaff, ...staffList]);
      showSuccess('Thêm nhân viên mới thành công!');
    }
    setIsModalOpen(false);
  };

  const handleLockAccount = () => {
    if (!staffToLock) return;
    setStaffList(prev => prev.map(u => u.id === staffToLock.id ? { ...u, status: 'suspended' } : u));
    setIsConfirmLockOpen(false);
    setStaffToLock(null);
    showSuccess('Đã khóa tài khoản nhân viên thành công.');
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheckCircle className="h-5 w-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-xl font-bold font-heading mt-1">Quản lý nhân viên</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {staffList.length} nhân viên · <span className="text-emerald-600 dark:text-emerald-400">{staffList.filter((u) => u.status === 'active').length} hoạt động</span>
            </p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm flex items-center gap-2">
            <FiPlus className="h-4 w-4" /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Staff list */}
      {staffList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <FiUsers className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Chưa có nhân viên nào được phân công.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-muted/50">
                  <th>Nhân viên</th>
                  <th>Email</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="max-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                          {s.full_name.charAt(0)}
                        </div>
                        <span className="font-medium">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground text-sm">{s.email}</td>
                    <td className="text-center">
                      <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'} shadow-sm`}>
                        {s.status === 'active' ? <FiCheckCircle className="h-3 w-3 mr-1" /> : <FiLock className="h-3 w-3 mr-1" />}
                        {s.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(s)} className="btn btn-ghost btn-sm text-muted-foreground hover:text-primary">
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        {s.status === 'active' && (
                          <button 
                            onClick={() => { setStaffToLock(s); setIsConfirmLockOpen(true); }} 
                            className="btn btn-ghost btn-sm text-muted-foreground hover:text-destructive"
                            title="Khóa tài khoản"
                          >
                            <FiLock className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert if no active staff */}
      {staffList.length > 0 && staffList.every((s) => s.status === 'suspended') && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <FiAlertCircle className="h-4 w-4 shrink-0" />
          Tất cả nhân viên đang bị tạm khóa. Chi nhánh không có ai trực.
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h2 className="text-lg font-bold">{editingStaff ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {formError && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex items-start gap-2 border border-destructive/20">
                  <FiAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
              
              <form id="staff-form" onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Họ và tên <span className="text-destructive">*</span></label>
                  <input 
                    type="text" 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Nhập họ và tên" 
                    className="input-field" 
                    required 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email đăng nhập <span className="text-destructive">*</span></label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="email@workhub.vn" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Mật khẩu {editingStaff ? <span className="text-muted-foreground font-normal">(Để trống nếu không đổi)</span> : <span className="text-destructive">*</span>}
                  </label>
                  <input 
                    type="password" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••" 
                    className="input-field" 
                    required={!editingStaff} 
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Hủy</button>
              <button type="submit" form="staff-form" className="btn btn-primary flex items-center gap-2">
                <FiSave className="h-4 w-4" /> Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Lock Modal */}
      {isConfirmLockOpen && staffToLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <FiLock className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold mb-2">Khóa tài khoản nhân viên?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Bạn có chắc chắn muốn khóa tài khoản của <strong>{staffToLock.full_name}</strong>? Nhân viên này sẽ không thể đăng nhập vào hệ thống nữa.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmLockOpen(false)} className="flex-1 btn btn-ghost">Hủy</button>
              <button onClick={handleLockAccount} className="flex-1 btn bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xác nhận Khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BAStaffPage;
