import React from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import type { WorkspaceTypeResponse } from '../../../lib/spaceApi';

interface WorkspaceModalProps {
  mode: 'add-ws' | 'edit-ws';
  wsForm: {
    code: string;
    name: string;
    workspace_type_id: string;
    capacity: string;
    svg_element_id: string;
    status: string;
  };
  wsTypes: WorkspaceTypeResponse[];
  errorMsg: string;
  onClose: () => void;
  onChangeForm: (updater: (prev: WorkspaceModalProps['wsForm']) => WorkspaceModalProps['wsForm']) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  mode,
  wsForm,
  wsTypes,
  errorMsg,
  onClose,
  onChangeForm,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold font-heading">
            {mode === 'add-ws' ? 'Thêm không gian mới' : 'Chỉnh sửa không gian'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex items-start gap-2 border border-destructive/20">
              <FiAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Mã không gian <span className="text-destructive">*</span>
                </label>
                <input
                  className="input-field font-mono"
                  placeholder="HD-01"
                  required
                  value={wsForm.code}
                  onChange={(e) => onChangeForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Loại không gian</label>
                <select
                  className="input-field"
                  value={wsForm.workspace_type_id}
                  onChange={(e) => onChangeForm((p) => ({ ...p, workspace_type_id: e.target.value }))}
                >
                  {wsTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Tên hiển thị <span className="text-destructive">*</span>
              </label>
              <input
                className="input-field"
                placeholder="Bàn làm việc số 1"
                required
                value={wsForm.name}
                onChange={(e) => onChangeForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sức chứa (người)</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  required
                  value={wsForm.capacity}
                  onChange={(e) => onChangeForm((p) => ({ ...p, capacity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Trạng thái</label>
                <select
                  className="input-field"
                  value={wsForm.status}
                  onChange={(e) => onChangeForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary flex items-center gap-2">
                <FiCheck className="h-4 w-4" /> Lưu thông tin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
