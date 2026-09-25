import React, { useRef, useState } from 'react';
import { FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { workspaceApi, type WorkspaceImageDto } from '../../lib/spaceApi';

interface Props {
  workspaceId: string;
  branchId?: string;
  images: WorkspaceImageDto[];
  onChange: (images: WorkspaceImageDto[]) => void;
}

const MAX_IMAGES = 10;
const MAX_BYTES = 5 * 1024 * 1024;

/** Branch admin: upload (several at once) and remove the photos customers see for a workspace. */
const WorkspaceImagesManager: React.FC<Props> = ({ workspaceId, branchId, images, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (picked.length < files.length) setError(`Mỗi không gian tối đa ${MAX_IMAGES} ảnh.`);
    const tooBig = picked.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" vượt quá 5MB.`);
      return;
    }
    setBusy(true);
    let next = images;
    try {
      for (const file of picked) {
        const saved = await workspaceApi.uploadImage(workspaceId, file, branchId);
        next = [...next, saved];
        onChange(next);
      }
    } catch (e: any) {
      setError(e.message || 'Không tải được ảnh lên');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (image: WorkspaceImageDto) => {
    if (!window.confirm('Xóa ảnh này?')) return;
    setBusy(true);
    setError('');
    try {
      await workspaceApi.deleteImage(workspaceId, image.id, branchId);
      onChange(images.filter((i) => i.id !== image.id));
    } catch (e: any) {
      setError(e.message || 'Không xóa được ảnh');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <FiImage className="h-4 w-4" /> Hình ảnh không gian
        </span>
        <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted group">
            <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => remove(img)}
              disabled={busy}
              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Xóa ảnh"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors"
          >
            <FiUploadCloud className="h-5 w-5" />
            {busy ? 'Đang tải…' : 'Thêm ảnh'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP hoặc GIF, tối đa 5MB mỗi ảnh. Ảnh đầu tiên là ảnh đại diện.</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default WorkspaceImagesManager;
