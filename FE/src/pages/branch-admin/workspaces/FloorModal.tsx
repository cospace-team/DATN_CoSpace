import React from 'react';
import { FiX, FiCheck, FiAlertCircle, FiUploadCloud } from 'react-icons/fi';

interface FloorModalProps {
  mode: 'add-floor' | 'edit-floor';
  floorForm: { floor_no: string; name: string; svgContent: string };
  errorMsg: string;
  isSubmitting: boolean;
  onClose: () => void;
  onChangeForm: (updater: (prev: { floor_no: string; name: string; svgContent: string }) => { floor_no: string; name: string; svgContent: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSvgFileRead: (file: File, callback: (content: string) => void) => void;
}

export const FloorModal: React.FC<FloorModalProps> = ({
  mode,
  floorForm,
  errorMsg,
  isSubmitting,
  onClose,
  onChangeForm,
  onSubmit,
  onSvgFileRead,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold font-heading">
            {mode === 'add-floor' ? 'Thêm tầng mới' : 'Chỉnh sửa tầng'}
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1.5">Số tầng</label>
                <input
                  type="number"
                  className="input-field"
                  value={floorForm.floor_no}
                  onChange={(e) => onChangeForm((p) => ({ ...p, floor_no: e.target.value }))}
                  min={1}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tên hiển thị <span className="text-destructive">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Tầng 1 - Lobby"
                  required
                  value={floorForm.name}
                  onChange={(e) => onChangeForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">File Bản đồ (SVG)</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/30 hover:bg-muted/50 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept=".svg"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onSvgFileRead(file, (content) => onChangeForm((p) => ({ ...p, svgContent: content })));
                  }}
                />
                <FiUploadCloud className="h-8 w-8 text-primary mb-2" />
                {floorForm.svgContent ? (
                  <p className="text-sm font-medium text-primary">✓ SVG đã tải lên</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Nhấn để tải lên file SVG</p>
                    <p className="text-xs text-muted-foreground mt-1">Elements có id sẽ trở thành workspace gán được</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isSubmitting}>
                <FiCheck className="h-4 w-4" /> {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
