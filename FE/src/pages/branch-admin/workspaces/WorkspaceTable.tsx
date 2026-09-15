import React from 'react';
import { FiGrid, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import type { FloorResponse, WorkspaceResponse } from '../../../lib/spaceApi';
import type { FloorLayout } from '../../../types/floorPlan';

interface WorkspaceTableProps {
  workspaces: WorkspaceResponse[];
  currentFloor: FloorResponse;
  currentLayout: FloorLayout | null;
  selectedWsId: string | null;
  assigningWsId: string | null;
  isBranchInactive: boolean;
  onSelectWorkspace: (wsId: string | null) => void;
  onToggleAssigning: (wsId: string, wsCode: string) => void;
  onAddWorkspace: () => void;
  onEditWorkspace: (ws: WorkspaceResponse) => void;
  onDeleteWorkspace: (wsId: string, wsCode: string) => void;
  onUnlinkWorkspace: (elementId: string) => void;
}

const statusBadge = (status: string) =>
  status === 'active' ? 'badge-success' : status === 'maintenance' ? 'badge-warning' : 'badge-danger';

const statusLabel = (status: string) =>
  status === 'active' ? 'Hoạt động' : status === 'maintenance' ? 'Bảo trì' : 'Ngưng';

export const WorkspaceTable: React.FC<WorkspaceTableProps> = ({
  workspaces,
  currentFloor,
  currentLayout,
  selectedWsId,
  assigningWsId,
  isBranchInactive,
  onSelectWorkspace,
  onToggleAssigning,
  onAddWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
  onUnlinkWorkspace,
}) => {
  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-3 bg-muted/20">
        <h2 className="font-semibold flex items-center gap-2 text-lg">
          <FiGrid className="h-5 w-5 text-primary" /> Workspace tại {currentFloor.name}
        </h2>
        <button
          className="btn btn-primary btn-sm flex items-center gap-2"
          onClick={onAddWorkspace}
          disabled={isBranchInactive}
          title={isBranchInactive ? 'Chi nhánh đang tạm ngưng hoạt động' : undefined}
        >
          <FiPlus className="h-4 w-4" /> Thêm không gian
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <FiGrid className="h-12 w-12 opacity-30" />
          <p className="font-medium">Chưa có không gian nào.</p>
          <p className="text-sm">Click element trên SVG hoặc nhấn "Thêm không gian".</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-muted/50">
                <th>Mã</th>
                <th>Tên không gian</th>
                <th>Loại</th>
                <th>Sức chứa</th>
                <th>Vị trí sơ đồ</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => {
                const linkedEl = currentLayout?.elements.find((el) => el.workspaceId === ws.id);
                return (
                  <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-mono font-semibold text-sm">{ws.code}</td>
                    <td className="font-medium">{ws.name}</td>
                    <td className="text-muted-foreground text-sm">{ws.workspaceTypeName}</td>
                    <td className="text-sm">{ws.capacity} người</td>
                    <td className="text-sm">
                      {linkedEl ? (
                        <button
                          onClick={() => {
                            onSelectWorkspace(selectedWsId === ws.id ? null : ws.id);
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                            selectedWsId === ws.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-success/10 text-success hover:bg-success/20'
                          }`}
                          title="Click để định vị trên sơ đồ"
                        >
                          {linkedEl.label || 'Đã gán'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleAssigning(ws.id, ws.code)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                            assigningWsId === ws.id
                              ? 'bg-warning text-warning-foreground animate-pulse'
                              : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                          }`}
                          title="Click để chọn vị trí trên sơ đồ"
                        >
                          {assigningWsId === ws.id ? 'Đang gán...' : '➕ Gán sơ đồ'}
                        </button>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${statusBadge(ws.status)} shadow-sm`}>
                        {statusLabel(ws.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {linkedEl && (
                          <button
                            onClick={() => onUnlinkWorkspace(linkedEl.id)}
                            className="btn btn-ghost btn-sm text-muted-foreground hover:text-warning p-2"
                            title="Hủy liên kết vị trí"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditWorkspace(ws)}
                          className="btn btn-ghost btn-sm text-muted-foreground hover:text-primary p-2"
                          title="Chỉnh sửa"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteWorkspace(ws.id, ws.code)}
                          className="btn btn-ghost btn-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2"
                          title="Xóa"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
