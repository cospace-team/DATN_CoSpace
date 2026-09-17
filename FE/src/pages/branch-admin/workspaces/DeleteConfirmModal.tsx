import React from 'react';
import { FiX, FiAlertCircle, FiTrash2 } from 'react-icons/fi';

interface DeleteConfirmModalProps {
  type: 'floor' | 'workspace';
  title: string;
  itemName: string;
  itemCode?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  type,
  title,
  itemName,
  itemCode,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold font-heading">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
              <FiAlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  {type === 'floor' ? 'Hành động này không thể hoàn tác!' : 'Cảnh báo xóa không gian'}
                </p>
                <p className="text-xs opacity-90">
                  {type === 'floor'
                    ? 'Tất cả các không gian làm việc (workspace) thuộc tầng này cũng sẽ bị xóa vĩnh viễn.'
                    : 'Không gian này sẽ bị xóa khỏi bản đồ và hệ thống. Nếu có lịch đặt trong tương lai, hệ thống sẽ chặn hành động này.'}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {type === 'floor' ? (
                <>
                  Bạn có chắc chắn muốn xóa tầng <strong className="text-foreground">"{itemName}"</strong> không?
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa không gian{' '}
                  <strong className="text-foreground font-mono">#{itemCode || itemName}</strong> không?
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn bg-destructive hover:bg-destructive/95 text-destructive-foreground flex items-center gap-2"
                onClick={onConfirm}
              >
                <FiTrash2 className="h-4 w-4" /> {type === 'floor' ? 'Xóa vĩnh viễn' : 'Xóa không gian'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
