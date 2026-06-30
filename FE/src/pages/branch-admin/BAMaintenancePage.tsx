import React, { useState } from 'react';
import { FiTool, FiPlus, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import {
  floors as allFloors, workspaces as allWorkspaces,
  workspaceMaintenances as allMaintenances,
  type WorkspaceMaintenance,
} from '../../data/mockData';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { EmptyState } from '../../components/ui/EmptyState';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
          <FiX className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const STATUS_FLOW: Array<{ from: WorkspaceMaintenance['status']; to: WorkspaceMaintenance['status']; label: string }> = [
  { from: 'scheduled', to: 'active', label: 'Bắt đầu' },
  { from: 'active', to: 'done', label: 'Hoàn thành' },
];

const STATUS_BADGE: Record<WorkspaceMaintenance['status'], "warning" | "info" | "success" | "neutral"> = {
  scheduled: 'warning',
  active: 'info',
  done: 'success',
  canceled: 'neutral',
};

const STATUS_LABEL: Record<WorkspaceMaintenance['status'], string> = {
  scheduled: 'Lên lịch',
  active: 'Đang thực hiện',
  done: 'Hoàn thành',
  canceled: 'Đã hủy',
};

const BAMaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const branchFloors = allFloors.filter((f) => f.branch_id === branchId);
  const floorIds = branchFloors.map((f) => f.id);
  const branchWorkspaces = allWorkspaces.filter((w) => floorIds.includes(w.floor_id));
  const branchWsIds = new Set(branchWorkspaces.map((w) => w.id));

  const [maintenances, setMaintenances] = useState<WorkspaceMaintenance[]>(
    allMaintenances.filter((m) => branchWsIds.has(m.workspace_id))
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    workspace_id: branchWorkspaces[0]?.id ?? '',
    start_at: '',
    end_at: '',
    reason: '',
  });
  const [formError, setFormError] = useState('');

  const getWsName = (wsId: string) => branchWorkspaces.find((w) => w.id === wsId)?.name ?? wsId;

  const saveMaintenance = () => {
    setFormError('');
    if (!form.workspace_id || !form.start_at || !form.end_at) {
      setFormError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (new Date(form.end_at) <= new Date(form.start_at)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    const newRecord: WorkspaceMaintenance = {
      id: `wm-local-${Date.now()}`,
      workspace_id: form.workspace_id,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      reason: form.reason,
      status: 'scheduled',
      created_by: user!.id,
    };
    setMaintenances((prev) => [newRecord, ...prev]);
    setModalOpen(false);
    setForm({ workspace_id: branchWorkspaces[0]?.id ?? '', start_at: '', end_at: '', reason: '' });
  };

  const advanceStatus = (id: string) => {
    setMaintenances((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const step = STATUS_FLOW.find((s) => s.from === m.status);
        return step ? { ...m, status: step.to } : m;
      })
    );
  };

  const cancelMaintenance = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch bảo trì này?')) return;
    setMaintenances((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'canceled' } : m))
    );
  };

  const active = maintenances.filter((m) => m.status === 'active');
  const scheduled = maintenances.filter((m) => m.status === 'scheduled');
  const past = maintenances.filter((m) => m.status === 'done' || m.status === 'canceled');

  const renderRow = (m: WorkspaceMaintenance) => {
    const step = STATUS_FLOW.find((s) => s.from === m.status);
    return (
      <tr key={m.id} className="border-b border-border hover:bg-muted/50 transition-colors">
        <td className="px-4 py-3 align-middle font-medium">{getWsName(m.workspace_id)}</td>
        <td className="px-4 py-3 align-middle text-sm text-muted-foreground">{m.reason || '—'}</td>
        <td className="px-4 py-3 align-middle font-mono text-xs">{new Date(m.start_at).toLocaleString('vi-VN')}</td>
        <td className="px-4 py-3 align-middle font-mono text-xs">{new Date(m.end_at).toLocaleString('vi-VN')}</td>
        <td className="px-4 py-3 align-middle text-center">
          <Badge variant={STATUS_BADGE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
        </td>
        <td className="px-4 py-3 align-middle text-right">
          <div className="flex items-center gap-2 justify-end">
            {step && (
              <Button size="sm" onClick={() => advanceStatus(m.id)}>
                {step.label}
              </Button>
            )}
            {m.status === 'scheduled' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => cancelMaintenance(m.id)}
                title="Hủy lịch"
              >
                <FiX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
              <h1 className="text-2xl font-bold font-heading mt-1">Lịch bảo trì</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {active.length} đang thực hiện · {scheduled.length} lên lịch
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <FiPlus className="h-4 w-4 mr-2" /> Tạo lịch bảo trì
            </Button>
          </div>
        </CardContent>
      </Card>

      {maintenances.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiTool}
            title="Chưa có lịch bảo trì"
            description="Bạn chưa tạo lịch bảo trì nào cho các không gian trong chi nhánh này."
            action={
              <Button onClick={() => setModalOpen(true)}>
                <FiPlus className="h-4 w-4 mr-2" /> Tạo ngay
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Active & Scheduled */}
          {[...active, ...scheduled].length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FiTool className="h-5 w-5 text-primary" /> Đang diễn ra & Sắp tới
                </CardTitle>
              </CardHeader>
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
            </Card>
          )}

          {/* History */}
          {past.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border px-6 py-4">
                <CardTitle className="text-lg text-muted-foreground flex items-center gap-2">
                  Lịch sử
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left opacity-80 hover:opacity-100 transition-opacity">
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
            </Card>
          )}
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <Modal title="Tạo lịch bảo trì" onClose={() => setModalOpen(false)}>
          <div className="space-y-5">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{formError}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="workspace_id">Workspace <span className="text-destructive">*</span></Label>
              <select
                id="workspace_id"
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={form.workspace_id}
                onChange={(e) => setForm((p) => ({ ...p, workspace_id: e.target.value }))}
              >
                {branchWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_at">Bắt đầu <span className="text-destructive">*</span></Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_at">Kết thúc <span className="text-destructive">*</span></Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do bảo trì</Label>
              <textarea
                id="reason"
                className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y min-h-[80px]"
                rows={3}
                placeholder="Ví dụ: Sửa chữa thiết bị, làm sạch tổng thể..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button onClick={saveMaintenance}>
                <FiCheck className="h-4 w-4 mr-2" /> Tạo lịch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAMaintenancePage;