import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiTool, FiAlertTriangle, FiTrash2, FiSearch, FiMap, FiList } from 'react-icons/fi';
import { formatDateTime } from '../../utils/formatters';
import { staffApi, WorkspaceMaintenanceStatusDto } from '../../api/staffApi';
import type { FloorResponse } from '../../lib/spaceApi';
import FloorPlanViewer from '../../components/floor-plan/FloorPlanViewer';
import type { FloorLayout, LayoutElement } from '../../types/floorPlan';
import { useStableCallback } from '../../hooks/useStableCallback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const MaintenancePage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const branchId = user?.branchId || '';


  const [workspaces, setWorkspaces] = useState<WorkspaceMaintenanceStatusDto[]>([]);
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWs, setSelectedWs] = useState<WorkspaceMaintenanceStatusDto | null>(null);
  const [reason, setReason] = useState('');
  
  const [unlockModalWs, setUnlockModalWs] = useState<WorkspaceMaintenanceStatusDto | null>(null);

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      const data = await staffApi.getWorkspaceMaintenances(branchId);
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFloors = async () => {
    try {
      const data = await staffApi.getFloors(branchId);
      setFloors(data);
      if (data.length > 0 && !selectedFloorId) {
        setSelectedFloorId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch floors', error);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchFloors();
  }, [branchId]);

  const currentFloor = floors.find((f) => f.id === selectedFloorId);
  
  const currentLayout = React.useMemo<FloorLayout | null>(() => {
    if (!currentFloor?.layoutJson) return null;
    try { return JSON.parse(currentFloor.layoutJson) as FloorLayout; }
    catch { return null; }
  }, [currentFloor?.layoutJson]);

  const getAvailability = React.useCallback((wsId: string) => {
    const ws = workspaces.find(w => w.workspaceId === wsId);
    if (!ws) return 'unassigned';
    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return 'maintenance';
    return 'available';
  }, [workspaces]);

  const handleSelectWorkspaceFromMap = (wsId: string | null) => {
    if (!wsId) return;
    const ws = workspaces.find(w => w.workspaceId === wsId);
    if (!ws) return;

    if (ws.activeMaintenance) {
      setUnlockModalWs(ws);
    } else if (ws.workspaceStatus !== 'maintenance') {
      handleOpenLockModal(ws);
    }
  };

  // Stable handlers for the memoized FloorPlanViewer, so typing in the lock-reason form doesn't
  // re-render the whole map.
  const onMapSelectWorkspace = useStableCallback(handleSelectWorkspaceFromMap);
  const onMapElementClick = useStableCallback((el: LayoutElement) =>
    handleSelectWorkspaceFromMap(el.workspaceId || null)
  );

  const handleOpenLockModal = (ws: WorkspaceMaintenanceStatusDto) => {
    setSelectedWs(ws);
    setReason('');
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWs || !reason) return;
    
    const now = new Date();
    // Tạo mốc thời gian giả định cho DB (kết thúc sau 24h)
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
    
    try {
      setIsSubmitting(true);
      await staffApi.createMaintenance(selectedWs.workspaceId, {
        startAt: now.toISOString(),
        endAt: end.toISOString(),
        reason
      });
      setIsModalOpen(false);
      setSelectedWs(null);
      setReason('');
      showToast('Đã tạo báo cáo hư hỏng và khóa bàn thành công!', 'success');
      fetchWorkspaces();
    } catch (error: any) {
      showToast('Lỗi tạo bảo trì: ' + (error.message || 'Không thể tạo bảo trì'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (maintenanceId: string) => {
    try {
      await staffApi.completeMaintenance(maintenanceId);
      setUnlockModalWs(null);
      showToast('Đã hoàn tất bảo trì và mở khóa không gian thành công!', 'success');
      fetchWorkspaces();
    } catch (error: any) {
      showToast('Lỗi khi hoàn tất bảo trì: ' + (error.message || 'Thao tác thất bại'), 'error');
    }
  };

  const handleDelete = async (maintenanceId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy bảo trì này và mở khóa không gian?')) return;
    try {
      await staffApi.deleteMaintenance(maintenanceId);
      setUnlockModalWs(null);
      showToast('Đã hủy bảo trì và mở khóa không gian!', 'info');
      fetchWorkspaces();
    } catch (error: any) {
      showToast('Lỗi khi hủy bảo trì: ' + (error.message || 'Thao tác thất bại'), 'error');
    }
  };

  const filteredWorkspaces = workspaces.filter(ws => 
    ws.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ws.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <h1 className="text-xl font-bold font-heading">Quản lý Không gian & Bảo trì</h1>
        
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm không gian..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field !pl-10 w-full"
            />
          </div>
          
          <div className="flex bg-muted p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('map')}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none ${viewMode === 'map' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <FiMap /> Bản đồ
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <FiList /> Danh sách
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="space-y-4">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {floors.map(floor => (
              <button
                key={floor.id}
                onClick={() => setSelectedFloorId(floor.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedFloorId === floor.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Tầng {floor.floorNo}: {floor.name}
              </button>
            ))}
          </div>
          
          <div className="rounded-xl border border-border bg-card h-[600px] overflow-hidden">
            {currentLayout ? (
              <FloorPlanViewer
                layout={currentLayout}
                selectedWsId={null}
                onSelectWorkspace={onMapSelectWorkspace}
                onElementClick={onMapElementClick}
                getAvailability={getAvailability}
                isAdmin={true}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Tầng này chưa có bản đồ.
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground text-center">
            * Nhấp vào một không gian đang <strong>Trống</strong> để báo hỏng / khóa bàn.<br/>
            * Nhấp vào một không gian đang <strong>Bảo trì</strong> để mở khóa.
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Đang tải dữ liệu...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Không gian</th>
                <th>Mã</th>
                <th>Trạng thái</th>
                <th>Thông tin Bảo trì</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkspaces.map(ws => {
                const isMaintenance = ws.workspaceStatus === 'maintenance' || ws.activeMaintenance != null;
                return (
                  <tr key={ws.workspaceId}>
                    <td className="font-medium text-primary">{ws.name}</td>
                    <td className="font-mono text-sm text-muted-foreground">{ws.code}</td>
                    <td>
                      {isMaintenance ? (
                        <span className="badge badge-warning animate-pulse">Bảo trì (Khóa)</span>
                      ) : ws.workspaceStatus === 'active' ? (
                        <span className="badge badge-success">Đang hoạt động</span>
                      ) : (
                        <span className="badge badge-outline">Ngưng HĐ</span>
                      )}
                    </td>
                    <td>
                      {isMaintenance && ws.activeMaintenance ? (
                        <div className="text-sm">
                          <p className="font-medium text-destructive max-w-[200px] truncate" title={ws.activeMaintenance.reason}>
                            Lý do: {ws.activeMaintenance.reason}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Khóa lúc: {formatDateTime(ws.activeMaintenance.startAt)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">-</span>
                      )}
                    </td>
                    <td className="text-right flex items-center justify-end gap-2">
                      {!isMaintenance ? (
                        <button 
                          onClick={() => handleOpenLockModal(ws)} 
                          className="btn btn-outline btn-sm hover:text-destructive hover:border-destructive"
                        >
                          <FiAlertTriangle className="h-3.5 w-3.5" /> Khóa bàn
                        </button>
                      ) : ws.activeMaintenance ? (
                        <>
                          <button onClick={() => handleComplete(ws.activeMaintenance!.id)} className="btn btn-primary btn-sm">
                            <FiCheck className="h-3.5 w-3.5" /> Sửa xong
                          </button>
                          <button onClick={() => handleDelete(ws.activeMaintenance!.id)} className="btn btn-outline btn-sm text-destructive" title="Hủy bảo trì">
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {filteredWorkspaces.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Không tìm thấy không gian nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* Modal Báo Lỗi */}
      {isModalOpen && selectedWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-in-up">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-red-50 dark:bg-red-950/30">
              <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><FiTool /></div>
              <div>
                <h2 className="font-bold text-lg text-red-700 dark:text-red-400">Báo cáo Hư hỏng & Khóa bàn</h2>
                <p className="text-xs text-red-600/80">Khách hàng sẽ không thể đặt bàn này nữa</p>
              </div>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Không gian</label>
                <div className="p-3 bg-muted rounded-lg border border-border font-medium flex justify-between items-center">
                  <span>{selectedWs.name}</span>
                  <span className="text-sm text-muted-foreground">{selectedWs.code}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Tình trạng hư hỏng (Lý do)</label>
                <textarea 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  required 
                  placeholder="Ví dụ: Máy lạnh chảy nước, Chân ghế bị gãy..." 
                  rows={3} 
                  className="input-field w-full" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline flex-1">Hủy</button>
                <button type="submit" className="btn btn-destructive flex-1" disabled={isSubmitting}>
                  <FiAlertTriangle /> {isSubmitting ? 'Đang Khóa...' : 'Xác nhận Khóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mở Khóa */}
      {unlockModalWs && unlockModalWs.activeMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-in-up">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-blue-50 dark:bg-blue-950/30">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><FiCheck /></div>
              <div>
                <h2 className="font-bold text-lg text-blue-700 dark:text-blue-400">Tùy chọn Bảo trì</h2>
                <p className="text-xs text-blue-600/80">Không gian: {unlockModalWs.name}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-sm font-medium">Lý do khóa: <span className="text-destructive">{unlockModalWs.activeMaintenance.reason}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Khóa lúc: {formatDateTime(unlockModalWs.activeMaintenance.startAt)}</p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={() => handleComplete(unlockModalWs.activeMaintenance!.id)} 
                  className="btn btn-primary w-full"
                >
                  <FiCheck className="mr-2" /> Đã sửa xong (Mở khóa)
                </button>
                <button 
                  onClick={() => handleDelete(unlockModalWs.activeMaintenance!.id)} 
                  className="btn btn-outline text-destructive w-full hover:bg-destructive hover:text-white"
                >
                  <FiTrash2 className="mr-2" /> Hủy bỏ báo cáo sai
                </button>
                <button 
                  onClick={() => setUnlockModalWs(null)} 
                  className="btn btn-ghost w-full mt-2"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
