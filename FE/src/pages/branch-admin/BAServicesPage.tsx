import React, { useState, useEffect } from 'react';
import { FiCoffee, FiPrinter, FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { staffApi, type ExtraServiceDto } from '../../api/staffApi';
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

const TYPE_ICON: Record<string, React.ReactNode> = {
  drink: <FiCoffee className="h-4 w-4" />,
  meal: <span className="text-sm">🍽️</span>,
  printing: <FiPrinter className="h-4 w-4" />,
  other: <span className="text-sm">📦</span>,
};
const TYPE_LABEL: Record<string, string> = {
  drink: 'Đồ uống', meal: 'Ăn uống', printing: 'In ấn', other: 'Khác',
};

type ModalMode = { type: 'add' } | { type: 'edit'; service: ExtraServiceDto } | null;


const BAServicesPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [services, setServices] = useState<ExtraServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setApiError('');
      try {
        const data = await staffApi.getExtraServices(branchId, true);
        setServices(data);
      } catch (e: any) {
        setApiError(e.message || 'Không thể tải dịch vụ.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [branchId]);

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    service_type: 'drink' as string,
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

  const openEdit = (s: ExtraServiceDto) => {
    setForm({ code: s.code, name: s.name, service_type: s.serviceType, unit: s.unit || '', price: String(s.price), is_active: s.isActive });
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

  const save = async () => {
    if (!validate()) return;
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;
    try {
      if (modal?.type === 'add') {
        const created = await staffApi.createExtraService({
          code: form.code.toUpperCase(),
          name: form.name,
          serviceType: form.service_type,
          unit: form.unit,
          price,
          isActive: form.is_active,
          branchId,
        });
        setServices((prev) => [...prev, created]);
        showSuccess('Thêm dịch vụ thành công');
      } else if (modal?.type === 'edit') {
        const updated = await staffApi.updateExtraService(modal.service.id, {
          code: form.code.toUpperCase(),
          name: form.name,
          serviceType: form.service_type,
          unit: form.unit,
          price,
          isActive: form.is_active,
        });
        setServices((prev) => prev.map((s) => s.id === updated.id ? updated : s));
        showSuccess('Cập nhật dịch vụ thành công');
      }
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu dịch vụ.');
    }
    setModal(null);
  };

  const toggleActive = async (s: ExtraServiceDto) => {
    try {
      const updated = await staffApi.updateExtraService(s.id, { isActive: !s.isActive });
      setServices((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi đổi trạng thái.');
    }
  };

  const deleteService = async (id: string) => {
    try {
      await staffApi.deleteExtraService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      showSuccess('Xóa dịch vụ thành công');
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa dịch vụ.');
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

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Dịch vụ thêm</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              {services.length} dịch vụ · {services.filter((s) => s.isActive).length} đang hoạt động
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Thêm dịch vụ
          </button>
        </div>
      </div>


      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse h-40" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <FiCoffee className="h-10 w-10 opacity-30" />
          <p className="text-sm">Chưa có dịch vụ nào cho chi nhánh này.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.id}
              className={`bg-card rounded-2xl border p-5 flex flex-col transition-all hover:shadow-md ${
                s.isActive ? 'border-border' : 'border-border opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    s.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {TYPE_ICON[s.serviceType]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{TYPE_LABEL[s.serviceType]}</p>
                  </div>
                </div>
                <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {s.isActive ? 'Bật' : 'Tắt'}
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
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(s)}>
                  <FiEdit2 className="h-3.5 w-3.5" /> Sửa
                </button>
                <button
                  className={`btn btn-sm ${s.isActive ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => toggleActive(s)}
                  title={s.isActive ? 'Tắt dịch vụ' : 'Bật dịch vụ'}
                >
                  {s.isActive ? <FiX className="h-3.5 w-3.5" /> : <FiCheck className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="btn btn-ghost btn-sm text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => deleteService(s.id)}
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
                onChange={(e) => setForm((p) => ({ ...p, service_type: e.target.value }))}
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
