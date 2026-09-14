import React, { useState, useEffect } from 'react';
import { FiTool, FiPlus, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { staffApi, type MaintenanceResponseDto, type WorkspaceMaintenanceStatusDto } from '../../api/staffApi';

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><FiX className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<MaintenanceResponseDto['status'], "badge-warning" | "badge-info" | "badge-success" | "badge-neutral"> = {
  scheduled: 'badge-warning',
  active: 'badge-info',
  done: 'badge-success',
  canceled: 'badge-neutral',
};

const STATUS_LABEL: Record<MaintenanceResponseDto['status'], string> = {
  scheduled: 'Lên lịch',
  active: 'Đang thực hiện',
  done: 'Hoàn thành',
  canceled: 'Đã hủy',
};

// ─── Page Component ───────────────────────────────────────────────────────────
const BAMaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [isLoading, setIsLoading] = useState(true);
  const [maintenances, setMaintenances] = useState<MaintenanceResponseDto[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceMaintenanceStatusDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    workspaceId: '',
    startAt: '',
    endAt: '',
    reason: '',
  });
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Load Data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [mData, wsData] = await Promise.all([
          staffApi.getMaintenances(branchId),
          staffApi.getWorkspaceMaintenances(branchId),
        ]);
        setMaintenances(mData);
        setWorkspaces(wsData);
      } catch (e) {
        console.error('Failed to load maintenance data', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [branchId]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getWsName = (wsId: string) => workspaces.find((w) => w.workspaceId === wsId)?.name ?? wsId;

  const openAdd = () => {
    setForm({ workspaceId: workspaces[0]?.workspaceId ?? '', startAt: '', endAt: '', reason: '' });
    setFormError('');
    setModalOpen(true);
  };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const saveMaintenance = async () => {
    setFormError('');
    if (!form.workspaceId || !form.startAt || !form.endAt) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const created = await staffApi.createMaintenance(form.workspaceId, {
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        reason: form.reason,
      });
      setMaintenances((prev) => [created, ...prev]);
      showSuccess('Tạo lịch bảo trì thành công');
      setModalOpen(false);
    } catch (e: any) {
      setFormError(e.message || 'Lỗi khi tạo lịch bảo trì');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeMaintenance = async (id: string) => {
    if (!window.confirm('Xác nhận hoàn thành bảo trì này?')) return;
    try {
      const updated = await staffApi.completeMaintenance(id);
      setMaintenances((prev) => prev.map((m) => (m.id === id ? updated : m)));
      showSuccess('Đã hoàn thành bảo trì');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi hoàn thành bảo trì');
    }
  };

  const deleteMaintenance = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch bảo trì này? (Thao tác này sẽ xóa lịch bảo trì)')) return;
    try {
      await staffApi.deleteMaintenance(id);
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
      showSuccess('Đã hủy lịch bảo trì');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi hủy lịch bảo trì');
    }
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────────
  const active = maintenances.filter((m) => m.status === 'active');
  const scheduled = maintenances.filter((m) => m.status === 'scheduled');
  const past = maintenances.filter((m) => m.status === 'done' || m.status === 'canceled');

  const renderRow = (m: MaintenanceResponseDto) => (
    <tr key={m.id} className="border-b border-border hover:bg-muted/50 transition-colors bg-card">
      <td className="px-4 py-3 align-middle font-medium">{getWsName(m.workspaceId)}</td>
      <td className="px-4 py-3 align-middle text-sm text-muted-foreground">{m.reason || '—'}</td>
      <td className="px-4 py-3 align-middle font-mono text-xs">{new Date(m.startAt).toLocaleString('vi-VN')}</td>
      <td className="px-4 py-3 align-middle font-mono text-xs">{new Date(m.endAt).toLocaleString('vi-VN')}</td>
      <td className="px-4 py-3 align-middle text-center">
        <span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <div className="flex items-center gap-2 justify-end">
          {(m.status === 'scheduled' || m.status === 'active') && (
            <button className="btn btn-outline btn-sm" onClick={() => completeMaintenance(m.id)}>
              Hoàn thành
            </button>
          )}
          {m.status === 'scheduled' && (
            <button
              className="btn btn-ghost btn-sm p-1 text-destructive hover:bg-destructive/10"
              onClick={() => deleteMaintenance(m.id)}
              title="Hủy lịch"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheck className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lịch bảo trì</h1>
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <FiTool className="h-3.5 w-3.5" />
              {active.length} đang thực hiện · {scheduled.length} lên lịch
            </span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Tạo lịch bảo trì
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : maintenances.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border p-12 text-center text-muted-foreground">
          <FiTool className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground mb-2">Chưa có lịch bảo trì</h3>
          <p className="text-sm mb-6">Bạn chưa tạo lịch bảo trì nào cho các không gian trong chi nhánh này.</p>
          <button className="btn btn-primary" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Active & Scheduled */}
          {[...active, ...scheduled].length > 0 && (
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                <FiTool className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Đang diễn ra & Sắp tới</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Workspace</th>
                      <th className="px-4 py-3 font-semibold">Lý do</th>
                      <th className="px-4 py-3 font-semibold">Bắt đầu</th>
                      <th className="px-4 py-3 font-semibold">Kết thúc</th>
                      <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>{[...active, ...scheduled].map(renderRow)}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* History */}
          {past.length > 0 && (
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/10">
                <h2 className="text-base font-semibold text-muted-foreground">Lịch sử</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Workspace</th>
                      <th className="px-4 py-3 font-semibold">Lý do</th>
                      <th className="px-4 py-3 font-semibold">Bắt đầu</th>
                      <th className="px-4 py-3 font-semibold">Kết thúc</th>
                      <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>{past.map(renderRow)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <Modal title="Tạo lịch bảo trì" onClose={() => setModalOpen(false)}>
          <div className="space-y-5">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{formError}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="workspaceId" className="block text-sm font-medium">Workspace <span className="text-destructive">*</span></label>
              <select
                id="workspaceId"
                className="input-field"
                value={form.workspaceId}
                onChange={(e) => setForm((p) => ({ ...p, workspaceId: e.target.value }))}
              >
                {workspaces.map((w) => (
                  <option key={w.workspaceId} value={w.workspaceId}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startAt" className="block text-sm font-medium">Bắt đầu <span className="text-destructive">*</span></label>
                <input
                  id="startAt"
                  type="datetime-local"
                  className="input-field"
                  value={form.startAt}
                  onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endAt" className="block text-sm font-medium">Kết thúc <span className="text-destructive">*</span></label>
                <input
                  id="endAt"
                  type="datetime-local"
                  className="input-field"
                  value={form.endAt}
                  onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reason" className="block text-sm font-medium">Lý do bảo trì</label>
              <textarea
                id="reason"
                className="input-field resize-y min-h-[80px]"
                rows={3}
                placeholder="Ví dụ: Sửa chữa thiết bị, làm sạch tổng thể..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
                Hủy
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveMaintenance} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <FiCheck className="h-4 w-4 mr-2" />
                )}
                Tạo lịch
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAMaintenancePage;