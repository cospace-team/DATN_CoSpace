import React, { useState, useEffect } from 'react';
import { FiCoffee, FiEdit2, FiPlus, FiPrinter, FiTrash2, FiX, FiCheck, FiAlertTriangle, FiPackage, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { staffApi, type ExtraServiceDto } from '../../api/staffApi';
import { formatVND } from '../../utils/formatters';

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-3xl border border-border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold font-heading">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm !min-h-[32px] !p-2"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  drink: <FiCoffee className="h-5 w-5" />,
  meal: <span className="text-base">🍽️</span>,
  printing: <FiPrinter className="h-5 w-5" />,
  other: <FiPackage className="h-5 w-5" />,
};
const TYPE_LABEL: Record<string, string> = {
  drink: 'Đồ uống', meal: 'Ăn uống', printing: 'In ấn', other: 'Khác',
};

type ModalMode = { type: 'add' } | { type: 'edit'; service: ExtraServiceDto } | null;
const emptyForm = { code: '', name: '', service_type: 'other' as string, description: '', unit: 'item', price: '', is_active: true };

const ExtraServicesPage: React.FC = () => {
  const [services, setServices] = useState<ExtraServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<ExtraServiceDto | null>(null);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      // No branchId → only global (system-wide) service definitions, which every branch inherits.
      const data = await staffApi.getExtraServices();
      setServices(data.filter(s => !s.branchId));
    } catch (e: any) {
      setApiError(e.message || 'Không thể tải danh sách dịch vụ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => { setForm(emptyForm); setErrors({}); setModal({ type: 'add' }); };
  const openEdit = (s: ExtraServiceDto) => {
    setForm({ code: s.code, name: s.name, service_type: s.serviceType, description: '', unit: s.unit || 'item', price: String(s.price), is_active: s.isActive });
    setErrors({});
    setModal({ type: 'edit', service: s });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.code.trim()) newErrors.code = 'Mã dịch vụ không được để trống';
    if (!form.name.trim()) newErrors.name = 'Tên dịch vụ không được để trống';
    const priceNum = parseInt(form.price.replace(/\D/g, ''));
    if (isNaN(priceNum) || priceNum < 0) newErrors.price = 'Giá phải là số hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;
    try {
      if (modal?.type === 'add') {
        const created = await staffApi.createExtraService({
          code: form.code.toUpperCase(),
          name: form.name,
          serviceType: form.service_type,
          unit: form.unit || 'item',
          price,
          isActive: form.is_active,
          branchId: undefined,
        });
        setServices((prev) => [created, ...prev]);
        showSuccess('Thêm loại hình dịch vụ thành công');
      } else if (modal?.type === 'edit') {
        const updated = await staffApi.updateExtraService(modal.service.id, {
          code: form.code.toUpperCase(),
          name: form.name,
          serviceType: form.service_type,
          unit: form.unit || 'item',
          price,
          isActive: form.is_active,
        });
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showSuccess('Cập nhật loại hình dịch vụ thành công');
      }
      setModal(null);
    } catch (e: any) {
      setErrors({ general: e.message || 'Lỗi khi lưu dịch vụ.' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await staffApi.deleteExtraService(deleteConfirm.id);
      setServices((prev) => prev.filter((s) => s.id !== deleteConfirm.id));
      showSuccess('Đã xóa loại hình dịch vụ');
    } catch (e: any) {
      setApiError(e.message || 'Không thể xóa dịch vụ.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheck className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quản lý loại hình dịch vụ</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Dịch vụ bổ sung toàn hệ thống</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Định nghĩa các dịch vụ dùng chung cho mọi chi nhánh. Chi nhánh vẫn có thể tạo thêm dịch vụ hoặc mức giá riêng.
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm dịch vụ</button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Lưu ý về phân quyền</p>
          <p className="mt-1 text-blue-700 dark:text-blue-400">
            Dịch vụ tạo tại đây áp dụng cho toàn bộ chi nhánh. Quản lý chi nhánh (Branch Admin) có thể bổ sung dịch vụ riêng cho chi nhánh của mình.
          </p>
        </div>
      </div>

      {/* Service Table */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow overflow-x-auto">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-muted rounded-2xl h-32 animate-pulse" />)}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có dịch vụ toàn hệ thống nào.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Dịch vụ</th>
                <th>Mã</th>
                <th>Loại</th>
                <th>Giá / đơn vị</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                        {TYPE_ICON[s.serviceType] || TYPE_ICON.other}
                      </div>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{s.code}</td>
                  <td>{TYPE_LABEL[s.serviceType] || s.serviceType}</td>
                  <td className="font-semibold text-primary">{formatVND(s.price)} / {s.unit}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>
                      {s.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5" title="Chỉnh sửa">
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(s)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive" title="Xóa">
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}>
        <div className="space-y-5">
          {errors.general && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <FiAlertCircle className="h-4 w-4 shrink-0" />{errors.general}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Mã dịch vụ *</label>
              <input className={`input-field font-mono uppercase ${errors.code ? 'border-destructive' : ''}`} placeholder="VD: PARKING"
                value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Loại dịch vụ</label>
              <select className="input-field" value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}>
                <option value="drink">Đồ uống</option>
                <option value="meal">Ăn uống</option>
                <option value="printing">In ấn</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Tên dịch vụ *</label>
            <input className={`input-field ${errors.name ? 'border-destructive' : ''}`} placeholder="VD: Gửi xe, Cà phê, In tài liệu..."
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Đơn vị</label>
              <input className="input-field" placeholder="lượt, ly, trang..." value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Giá (VND) *</label>
              <input type="number" min={0} step={1000} className={`input-field ${errors.price ? 'border-destructive' : ''}`}
                value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="svc-active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
            <label htmlFor="svc-active" className="text-sm font-medium">Kích hoạt dịch vụ</label>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button onClick={save} className="btn btn-primary btn-sm flex-1">
              <FiCheck className="h-4 w-4" /> {modal?.type === 'edit' ? 'Cập nhật' : 'Tạo mới'}
            </button>
            <button onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-3xl border border-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <FiAlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-bold text-lg">Xóa dịch vụ?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Bạn có chắc muốn xóa "{deleteConfirm.name}"? Dịch vụ đã được dùng trong booking sẽ không thể xóa vĩnh viễn.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Hủy bỏ</button>
              <button onClick={confirmDelete} className="btn btn-danger btn-sm">Xác nhận xóa</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExtraServicesPage;
