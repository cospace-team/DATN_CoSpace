import React, { useState } from 'react';
import { FiCoffee, FiPrinter, FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { extraServices as allServices, type ExtraService } from '../../data/mockData';
import { formatVND } from '../../utils/formatters';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><FiX className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const TYPE_ICON: Record<ExtraService['service_type'], React.ReactNode> = {
  drink: <FiCoffee className="h-4 w-4" />,
  meal: <span className="text-sm">🍽️</span>,
  printing: <FiPrinter className="h-4 w-4" />,
  other: <span className="text-sm">📦</span>,
};
const TYPE_LABEL: Record<ExtraService['service_type'], string> = {
  drink: 'Đồ uống', meal: 'Ăn uống', printing: 'In ấn', other: 'Khác',
};

type ModalMode = { type: 'add' } | { type: 'edit'; service: ExtraService } | null;

const BAServicesPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [services, setServices] = useState<ExtraService[]>(
    allServices.slice(0, 4).map((s) => ({ ...s }))
  );

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    service_type: 'drink' as ExtraService['service_type'],
    unit: '',
    price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => {
    setForm({ code: '', name: '', service_type: 'drink', unit: 'ly', price: '', is_active: true });
    setErrors({});
    setModal({ type: 'add' });
  };

  const openEdit = (s: ExtraService) => {
    setForm({ code: s.code, name: s.name, service_type: s.service_type, unit: s.unit, price: String(s.price), is_active: s.is_active });
    setErrors({});
    setModal({ type: 'edit', service: s });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.code.trim()) newErrors.code = 'Mã dịch vụ không được để trống';
    if (!form.name.trim()) newErrors.name = 'Tên dịch vụ không được để trống';
    if (!form.unit.trim()) newErrors.unit = 'Đơn vị không được để trống';
    const priceNum = parseInt(form.price.replace(/\D/g, ''));
    if (isNaN(priceNum) || priceNum < 0) newErrors.price = 'Giá phải là số hợp lệ';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;
    if (modal?.type === 'add') {
      const newSvc: ExtraService = {
        id: `es-local-${Date.now()}`,
        code: form.code.toUpperCase(),
        name: form.name,
        service_type: form.service_type,
        unit: form.unit,
        price,
        is_active: form.is_active,
      };
      setServices((prev) => [...prev, newSvc]);
      showSuccess('Thêm dịch vụ thành công');
    } else if (modal?.type === 'edit') {
      setServices((prev) =>
        prev.map((s) =>
          s.id === modal.service.id
            ? { ...s, code: form.code, name: form.name, service_type: form.service_type, unit: form.unit, price, is_active: form.is_active }
            : s
        )
      );
      showSuccess('Cập nhật dịch vụ thành công');
    }
    setModal(null);
  };

  const toggleActive = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const deleteService = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${name}"? Hành động này không thể hoàn tác.`)) {
      setServices(prev => prev.filter(s => s.id !== id));
      showSuccess('Đã xóa dịch vụ');
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
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-xl font-bold font-heading mt-1">Dịch vụ thêm</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {services.length} dịch vụ · {services.filter((s) => s.is_active).length} đang hoạt động
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Thêm dịch vụ
          </button>
        </div>
      </div>

      {/* Service grid */}
      {services.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <FiCoffee className="h-10 w-10 opacity-30" />
          <p className="text-sm">Chưa có dịch vụ nào cho chi nhánh này.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border bg-card p-5 card-interactive transition-all duration-200 ${
                s.is_active ? 'border-border' : 'border-border opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {TYPE_ICON[s.service_type]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{TYPE_LABEL[s.service_type]}</p>
                  </div>
                </div>
                <span className={`badge ${s.is_active ? 'badge-success' : 'badge-neutral'}`}>
                  {s.is_active ? 'Bật' : 'Tắt'}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Giá / {s.unit}</p>
                  <p className="text-lg font-bold text-primary">{formatVND(s.price)}</p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="btn btn-secondary btn-sm flex-1"
                  onClick={() => openEdit(s)}
                >
                  <FiEdit2 className="h-3.5 w-3.5" /> Sửa
                </button>
                <button
                  className={`btn btn-sm ${s.is_active ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => toggleActive(s.id)}
                  title={s.is_active ? 'Tắt dịch vụ' : 'Bật dịch vụ'}
                >
                  {s.is_active ? <FiX className="h-3.5 w-3.5" /> : <FiCheck className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="btn btn-ghost btn-sm text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => deleteService(s.id, s.name)}
                  title="Xóa vĩnh viễn"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <Modal
          title={modal.type === 'add' ? 'Thêm dịch vụ mới' : 'Chỉnh sửa dịch vụ'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Mã dịch vụ <span className="text-destructive">*</span></label>
                <input
                  className={`input-field font-mono ${errors.code ? 'border-destructive focus:ring-destructive' : ''}`}
                  placeholder="COFFEE"
                  value={form.code}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }));
                    if (errors.code) setErrors(p => ({ ...p, code: '' }));
                  }}
                />
                {errors.code && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Loại dịch vụ</label>
                <select
                  className="input-field"
                  value={form.service_type}
                  onChange={(e) => setForm((p) => ({ ...p, service_type: e.target.value as ExtraService['service_type'] }))}
                >
                  <option value="drink">Đồ uống</option>
                  <option value="meal">Ăn uống</option>
                  <option value="printing">In ấn</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tên dịch vụ <span className="text-destructive">*</span></label>
              <input
                className={`input-field ${errors.name ? 'border-destructive focus:ring-destructive' : ''}`}
                placeholder="Cà phê đặc biệt"
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  if (errors.name) setErrors(p => ({ ...p, name: '' }));
                }}
              />
              {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Đơn vị <span className="text-destructive">*</span></label>
                <input
                  className={`input-field ${errors.unit ? 'border-destructive focus:ring-destructive' : ''}`}
                  placeholder="ly, trang, phần..."
                  value={form.unit}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, unit: e.target.value }));
                    if (errors.unit) setErrors(p => ({ ...p, unit: '' }));
                  }}
                />
                {errors.unit && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.unit}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Giá (VND) <span className="text-destructive">*</span></label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className={`input-field ${errors.price ? 'border-destructive focus:ring-destructive' : ''}`}
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, price: e.target.value }));
                    if (errors.price) setErrors(p => ({ ...p, price: '' }));
                  }}
                />
                {errors.price && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.price}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="svc-active"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="svc-active" className="text-sm font-medium">Kích hoạt dịch vụ</label>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Hủy</button>
              <button
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={save}
              >
                <FiCheck className="h-3.5 w-3.5" /> Lưu dịch vụ
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAServicesPage;
