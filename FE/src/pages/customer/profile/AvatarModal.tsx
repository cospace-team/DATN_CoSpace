import React from 'react';
import { FiCamera, FiX, FiTrash2, FiUploadCloud, FiImage, FiCheck } from 'react-icons/fi';
import { Spinner } from '../../../components/ui/Spinner';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  customAvatarUrl: string;
  setCustomAvatarUrl: (url: string) => void;
  userAvatarUrl?: string;
  userFullName?: string;
  onSave: () => Promise<void> | void;
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
];

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  customAvatarUrl,
  setCustomAvatarUrl,
  userAvatarUrl,
  userFullName,
  onSave,
  isUploading,
  onFileUpload,
  fileInputRef,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
      <div className="bg-card rounded-3xl max-w-lg w-full border border-border shadow-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FiCamera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Đổi ảnh đại diện</h3>
              <p className="text-xs text-muted-foreground">Tải ảnh từ máy tính hoặc chọn mẫu có sẵn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Preview Current / Selected Avatar */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/40 border border-border/80">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md bg-card shrink-0 flex items-center justify-center">
              {customAvatarUrl || userAvatarUrl ? (
                <img
                  src={customAvatarUrl || userAvatarUrl}
                  alt="Avatar Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {userFullName ? userFullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">Ảnh đang chọn</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {customAvatarUrl?.startsWith('data:image')
                  ? 'Ảnh tải lên từ máy tính cá nhân'
                  : customAvatarUrl || userAvatarUrl || 'Ảnh mặc định theo chữ cái'}
              </p>
              {customAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setCustomAvatarUrl('')}
                  className="mt-1 text-[11px] font-semibold text-rose-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <FiTrash2 className="h-3 w-3" /> Bỏ ảnh này, dùng mặc định
                </button>
              )}
            </div>
          </div>

          {/* Option 1: File Upload from Computer */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              1. Tải ảnh trực tiếp từ máy tính
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                {isUploading ? <Spinner size="sm" /> : <FiUploadCloud className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {isUploading ? 'Đang xử lý tối ưu ảnh...' : 'Nhấn để chọn ảnh từ máy tính'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hỗ trợ định dạng PNG, JPG, WebP (Tối đa 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Option 2: Pre-selected Curated Avatars */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2">
              2. Hoặc chọn nhanh ảnh đại diện mẫu:
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomAvatarUrl(url)}
                  className={`h-16 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer relative group ${
                    customAvatarUrl === url
                      ? 'border-primary scale-105 shadow-md ring-2 ring-primary/20'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  <img src={url} alt={`Avatar Preset ${idx + 1}`} className="h-full w-full object-cover" />
                  {customAvatarUrl === url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <FiCheck className="h-5 w-5 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Option 3: External URL */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              3. Hoặc dán đường dẫn ảnh trực tiếp (URL)
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl">
              <FiImage className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={customAvatarUrl?.startsWith('data:') ? '' : customAvatarUrl}
                onChange={e => setCustomAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSave();
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all cursor-pointer"
            >
              <FiCheck className="h-4 w-4" /> Lưu ảnh đại diện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
