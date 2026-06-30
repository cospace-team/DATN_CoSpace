import React, { useState } from 'react';
import { FiCoffee, FiEdit2, FiPlus, FiPrinter, FiTrash2, FiX, FiCheck, FiAlertTriangle, FiPackage, FiInfo } from 'react-icons/fi';

/* ── Service Category Interface ── */
interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  service_count: number; // number of specific services using this category (across branches)
}

/* ── Mock Service Categories ── */
const serviceCategories: ServiceCategory[] = [
  { id: 'scat-01', code: 'BEVERAGE', name: 'Đồ uống', description: 'Các loại thức uống: cà phê, trà, nước ép, sinh tố...', icon: 'drink', is_active: true, service_count: 4 },
  { id: 'scat-02', code: 'FOOD', name: 'Ăn uống', description: 'Các bữa ăn: cơm trưa, snack, bánh mì...', icon: 'meal', is_active: true, service_count: 1 },
  { id: 'scat-03', code: 'PRINTING', name: 'In ấn', description: 'Dịch vụ in tài liệu: trắng đen, màu, scan, photocopy.', icon: 'printing', is_active: true, service_count: 2 },
  { id: 'scat-04', code: 'PARKING', name: 'Gửi xe', description: 'Dịch vụ giữ xe máy và ô tô tại chi nhánh.', icon: 'other', is_active: true, service_count: 0 },
  { id: 'scat-05', code: 'STORAGE', name: 'Lưu trữ', description: 'Tủ khóa cá nhân, kho lưu trữ đồ dùng cho khách hàng.', icon: 'other', is_active: true, service_count: 1 },
  { id: 'scat-06', code: 'EQUIPMENT', name: 'Thiết bị cho thuê', description: 'Cho thuê adapter, tai nghe, webcam, bảng trắng di động...', icon: 'other', is_active: false, service_count: 0 },
];

/* ── Modal ── */
const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold font-heading">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm !min-h-[32px] !p-2"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
};

const ExtraServicesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ServiceCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceCategory | null>(null);

  const typeIcon: Record<string, React.ReactNode> = {
    drink: <FiCoffee className="h-5 w-5" />,
    meal: <span className="text-base">🍽️</span>,
    printing: <FiPrinter className="h-5 w-5" />,
    other: <FiPackage className="h-5 w-5" />,
  };

  const openAdd = () => { setEditItem(null); setModalOpen(true); };
  const openEdit = (item: ServiceCategory) => { setEditItem(item); setModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý loại hình dịch vụ</p>
            <h1 className="text-xl font-bold font-heading mt-1">Danh mục dịch vụ bổ sung</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Định nghĩa các loại hình dịch vụ mà các chi nhánh có thể cung cấp. 
              Việc tạo dịch vụ cụ thể và đặt giá thuộc về Quản lý chi nhánh.
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm loại hình</button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-4 flex items-start gap-3">
        <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Lưu ý về phân quyền</p>
          <p className="mt-1 text-blue-700 dark:text-blue-400">
            Trang này chỉ quản lý <strong>loại hình</strong> dịch vụ (danh mục). Quản lý chi nhánh (Branch Admin) sẽ tạo các dịch vụ cụ thể, đặt giá và quản lý tồn kho dựa trên các loại hình này.
          </p>
        </div>
      </div>

      {/* Service Category Table */}
      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Loại hình dịch vụ</th>
              <th>Mã</th>
              <th>Mô tả</th>
              <th>Dịch vụ đang dùng</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {serviceCategories.map(cat => (
              <tr key={cat.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      {typeIcon[cat.icon]}
                    </div>
                    <span className="font-semibold">{cat.name}</span>
                  </div>
                </td>
                <td className="font-mono text-sm">{cat.code}</td>
                <td className="max-w-[300px]">
                  <p className="text-sm text-muted-foreground truncate" title={cat.description}>{cat.description}</p>
                </td>
                <td>
                  <span className={`text-sm font-semibold ${cat.service_count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {cat.service_count} dịch vụ
                  </span>
                </td>
                <td>
                  <span className={`badge ${cat.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {cat.is_active ? 'Hoạt động' : 'Tắt'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5" title="Chỉnh sửa">
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(cat)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive" title="Xóa">
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service Category Form Modal — Only Name + Description */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Chỉnh sửa loại hình dịch vụ' : 'Thêm loại hình dịch vụ mới'}>
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); setModalOpen(false); }}>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mã loại hình *</label>
            <input className="input-field font-mono uppercase" placeholder="VD: PARKING" defaultValue={editItem?.code || ''} />
            <p className="text-xs text-muted-foreground mt-1">Mã duy nhất, viết hoa, không dấu. VD: BEVERAGE, PRINTING, PARKING</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Tên loại hình dịch vụ *</label>
            <input className="input-field" placeholder="VD: Gửi xe, Đồ uống, In ấn..." defaultValue={editItem?.name || ''} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả</label>
            <textarea className="input-field !min-h-[100px]" placeholder="Mô tả ngắn gọn về loại hình dịch vụ này..." defaultValue={editItem?.description || ''} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Trạng thái hoạt động</label>
            <div className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={editItem?.is_active ?? true} />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1">
              <FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm — with constraint check */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <FiAlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-bold text-lg">Xóa loại hình dịch vụ?</h3>
            </div>

            {deleteConfirm.service_count > 0 ? (
              /* Cannot delete — constraint violation */
              <>
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4">
                  <p className="text-sm text-destructive font-semibold">Không thể xóa!</p>
                  <p className="text-sm text-destructive/80 mt-1">
                    Loại hình "{deleteConfirm.name}" đang có {deleteConfirm.service_count} dịch vụ cụ thể đang sử dụng tại các chi nhánh. 
                    Vui lòng xóa hoặc chuyển các dịch vụ đó trước.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Đóng</button>
                </div>
              </>
            ) : (
              /* Can delete — no services using this category */
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Bạn có chắc muốn xóa loại hình "{deleteConfirm.name}"? Không có dịch vụ nào đang sử dụng loại hình này.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Hủy bỏ</button>
                  <button onClick={() => setDeleteConfirm(null)} className="btn btn-danger btn-sm">Xác nhận xóa</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExtraServicesPage;
