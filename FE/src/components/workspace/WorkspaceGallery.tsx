import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiImage, FiX } from 'react-icons/fi';

interface Props {
  images: { id: string; url: string }[];
  alt: string;
}

/** Photos of a workspace: main image with arrows and thumbnails, full-screen on click. */
const WorkspaceGallery: React.FC<Props> = ({ images, alt }) => {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => setIndex(0), [images]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed, images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-2xl border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
        <FiImage className="h-5 w-5" /> Chưa có hình ảnh
      </div>
    );
  }

  const current = images[Math.min(index, images.length - 1)];
  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted border border-border">
        <button type="button" onClick={() => setZoomed(true)} className="h-full w-full cursor-zoom-in" aria-label="Xem ảnh lớn">
          <img src={current.url} alt={`${alt} — ảnh ${index + 1}`} className="h-full w-full object-cover" />
        </button>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center">
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Ảnh sau"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center">
              <FiChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              {index + 1}/{images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-10 w-14 shrink-0 rounded-md overflow-hidden border-2 ${i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
              aria-label={`Ảnh ${i + 1}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button type="button" onClick={() => setZoomed(false)} aria-label="Đóng"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center">
            <FiX className="h-5 w-5" />
          </button>
          <img src={current.url} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default WorkspaceGallery;
