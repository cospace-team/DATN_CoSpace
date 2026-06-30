import React, { useState } from 'react';
import { FiPlus, FiX, FiCheck, FiTool, FiAlertTriangle } from 'react-icons/fi';
import { workspaceMaintenances, workspaces, getWorkspace } from '../../data/mockData';
import { formatDateTime } from '../../utils/formatters';

const MaintenancePage: React.FC = () => {
  // Chỉ lấy các maintenance đang active hoặc done (bỏ scheduled)
  const [localMaintenances, setLocalMaintenances] = useState(
    workspaceMaintenances.filter(m => m.status !== 'scheduled')
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [wsId, setWsId] = useState('');
  const [reason, setReason] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsId || !reason) return;
    
    const now = new Date();
    // Tạo mốc thời gian giả định cho DB (kết thúc sau 24h)
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
    
    const newMaint = {
      id: `wm-${Date.now()}`,
      workspace_id: wsId,
      start_at: now.toISOString(),
      end_at: end.toISOString(),
      reason,
      status: 'active' as const, // LUÔN ACTIVE NGAY LẬP TỨC
      created_by: 'user-0003'
    };
    
    setLocalMaintenances([newMaint, ...localMaintenances]);
    setIsModalOpen(false);
    // Reset
    setWsId(''); setReason('');
  };

  const handleUpdateStatus = (id: string, newStatus: 'done') => {
    setLocalMaintenances(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vận hành</p>
            <h1 className="text-xl font-bold font-heading mt-1">Báo cáo Hư hỏng / Bảo trì</h1>
            <p className="text-sm text-muted-foreground mt-1">Khóa không gian ngay lập tức để sửa chữa</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-destructive"><FiAlertTriangle className="h-4 w-4" /> Báo lỗi & Khóa bàn</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Không gian</th><th>Thời điểm báo lỗi</th><th>Lý do</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
          <tbody>
            {localMaintenances.map(wm => {
              const ws = getWorkspace(wm.workspace_id);
              return (
                <tr key={wm.id}>
                  <td className="font-medium text-primary">{ws?.name} <span className="text-xs text-muted-foreground">({ws?.code})</span></td>
                  <td>{formatDateTime(wm.start_at)}</td>
                  <td><div className="max-w-xs truncate font-medium text-destructive" title={wm.reason}>{wm.reason}</div></td>
                  <td>
                    {wm.status === 'active' ? (
                      <span className="badge badge-warning animate-pulse">Đang khóa (Bảo trì)</span>
                    ) : (
                      <span className="badge badge-success">Đã sửa xong</span>
                    )}
                  </td>
                  <td className="text-right">
                    {wm.status === 'active' && (
                      <button onClick={() => handleUpdateStatus(wm.id, 'done')} className="btn btn-primary btn-sm"><FiCheck className="h-3.5 w-3.5" /> Hoàn tất & Mở bàn</button>
                    )}
                    {wm.status === 'done' && <span className="text-sm text-muted-foreground italic">Không có hành động</span>}
                  </td>
                </tr>
              );
            })}
            {localMaintenances.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Không có không gian nào đang bảo trì.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Báo Lỗi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-in-up">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-red-50 dark:bg-red-950/20">
              <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><FiTool /></div>
              <div>
                <h2 className="font-bold text-lg text-red-700 dark:text-red-400">Báo cáo Hư hỏng</h2>
                <p className="text-xs text-red-600/80">Bàn sẽ bị khóa ngay lập tức</p>
              </div>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">1. Bàn/Phòng nào bị hỏng?</label>
                <select value={wsId} onChange={e => setWsId(e.target.value)} required className="input-field w-full font-medium">
                  <option value="">-- Click để Chọn Không gian --</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">2. Tình trạng hư hỏng (Lý do)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} required placeholder="Ví dụ: Máy lạnh chảy nước, Chân ghế bị gãy..." rows={3} className="input-field w-full" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline flex-1">Hủy</button>
                <button type="submit" className="btn btn-destructive flex-1"><FiAlertTriangle /> Khóa Bàn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
