import React from 'react';
import { FiX } from 'react-icons/fi';
import type { WorkspaceResponse } from '../../../lib/spaceApi';

interface AssignWorkspaceModalProps {
  element: any;
  workspaces: WorkspaceResponse[];
  assignedWorkspaceIds: string[];
  onClose: () => void;
  onAssign: (elementId: string, wsId: string | null) => Promise<void>;
}

export const AssignWorkspaceModal: React.FC<AssignWorkspaceModalProps> = ({
  element,
  workspaces,
  assignedWorkspaceIds,
  onClose,
  onAssign,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold font-heading">Gán không gian làm việc</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thông tin phần tử sơ đồ</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Loại phần tử:</span>{' '}
                  <strong className="capitalize">{element.type}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Mã ID phần tử:</span>{' '}
                  <strong className="font-mono text-xs">{element.id ? `${element.id.substring(0, 8)}...` : ''}</strong>
                </div>
                {element.label && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Nhãn hiển thị:</span>{' '}
                    <strong>{element.label}</strong>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Chọn Workspace để liên kết
              </label>
              <select
                className="input-field"
                value={element.workspaceId || ''}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  await onAssign(element.id, val);
                  onClose();
                }}
              >
                <option value="">-- Chưa gán workspace --</option>
                {workspaces.map((ws) => {
                  const isThisElement = element.workspaceId === ws.id;
                  const isAssignedElsewhere = assignedWorkspaceIds.includes(ws.id) && !isThisElement;
                  return (
                    <option key={ws.id} value={ws.id} disabled={isAssignedElsewhere}>
                      {ws.code} - {ws.name} {isAssignedElsewhere ? '(Đã gán phần tử khác)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
              >
                Hủy bỏ
              </button>
              {element.workspaceId && (
                <button
                  type="button"
                  className="btn bg-destructive hover:bg-destructive/90 text-white flex items-center gap-2"
                  onClick={async () => {
                    await onAssign(element.id, null);
                    onClose();
                  }}
                >
                  <FiX className="h-4 w-4" /> Hủy liên kết
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
