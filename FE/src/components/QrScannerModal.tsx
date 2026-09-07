import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { 
  FiCamera, FiX, FiZap, FiAlertCircle, 
  FiUploadCloud, FiClipboard, FiImage, FiArrowRight, FiCheckCircle
} from 'react-icons/fi';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (bookingCode: string) => void;
}

/** Parse QR data → extract booking code.
 *  Supports formats:
 *    - "CHECKIN_WH-76PDE8"  → "WH-76PDE8"
 *    - "WH-76PDE8"          → "WH-76PDE8" (raw code, gun scanner)
 */
const parseQrData = (raw: string): string | null => {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Strip CHECKIN_ prefix
  if (trimmed.startsWith('CHECKIN_')) {
    return trimmed.substring('CHECKIN_'.length);
  }

  // Accept raw booking codes (alphanumeric + dash, 4-20 chars)
  if (/^[A-Z0-9\-]{4,20}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
};

const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('upload'); // Default to upload/paste for smooth desktop demo
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasProcessedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = scannerRef.current;
      if (scanner) {
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop();
        }
        scanner.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn('QR scanner cleanup:', e);
    }
  }, []);

  // Khởi động camera trực tiếp
  const startCamera = useCallback(async () => {
    if (!isOpen || activeTab !== 'camera') return;

    setIsStartingCamera(true);
    setError(null);
    hasProcessedRef.current = false;

    await stopScanner();

    try {
      const elementId = 'qr-scanner-region';
      if (!document.getElementById(elementId)) {
        setError('Không tìm thấy khung quét camera');
        setIsStartingCamera(false);
        return;
      }

      const html5Qr = new Html5Qrcode(elementId);
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (hasProcessedRef.current) return;
          const bookingCode = parseQrData(decodedText);
          if (bookingCode) {
            hasProcessedRef.current = true;
            onScanSuccess(bookingCode);
          }
        },
        () => {
          // Silent when frame has no QR
        }
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      if (err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission')) {
        setError('Vui lòng cấp quyền camera trong trình duyệt hoặc chuyển sang tab "Dán ảnh / Tải file" bên cạnh.');
      } else if (err?.toString().includes('NotFoundError') || err?.toString().includes('Requested device not found')) {
        setError('Không tìm thấy camera trên máy tính. Bạn vui lòng sử dụng tab "Dán ảnh / Tải file" để tiếp tục.');
      } else {
        setError(`Không thể mở camera: ${err?.message || err}. Hãy dùng tính năng Dán ảnh (Ctrl+V) bên cạnh.`);
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [isOpen, activeTab, onScanSuccess, stopScanner]);

  // Quét mã từ file hình ảnh (dán hoặc tải lên)
  const processImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn hoặc dán đúng định dạng file ảnh (PNG, JPG, WebP).');
      return;
    }

    setIsProcessingImage(true);
    setError(null);

    // Tạo preview ảnh
    const previewUrl = URL.createObjectURL(file);
    setPastedImagePreview(previewUrl);

    try {
      await stopScanner();

      const elementId = 'qr-scanner-region';
      let html5Qr = scannerRef.current;
      if (!html5Qr) {
        html5Qr = new Html5Qrcode(elementId);
        scannerRef.current = html5Qr;
      }

      const decodedText = await html5Qr.scanFile(file, false);
      const bookingCode = parseQrData(decodedText);

      if (bookingCode) {
        hasProcessedRef.current = true;
        // Trì hoãn nhẹ 400ms để người dùng thấy feedback ảnh
        setTimeout(() => {
          onScanSuccess(bookingCode);
        }, 400);
      } else {
        setError(`Đã đọc được dữ liệu ("${decodedText.substring(0, 30)}...") nhưng không đúng định dạng mã đặt chỗ.`);
      }
    } catch (err: any) {
      console.warn('Scan file error:', err);
      setError('Không nhận diện được mã QR trong ảnh. Vui lòng thử chụp góc rõ hơn hoặc dùng vé demo bên dưới.');
    } finally {
      setIsProcessingImage(false);
    }
  }, [stopScanner, onScanSuccess]);

  // Tab change handler
  const handleTabChange = async (tab: 'camera' | 'upload') => {
    setError(null);
    setPastedImagePreview(null);
    if (tab === 'upload') {
      await stopScanner();
    }
    setActiveTab(tab);
  };

  // Bắt sự kiện Paste (Ctrl + V) trên toàn màn hình khi modal đang mở
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            // Tự động chuyển sang tab upload nếu đang ở tab camera
            setActiveTab('upload');
            processImageFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, processImageFile]);

  // Quản lý lifecycle camera theo activeTab và isOpen
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(startCamera, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, startCamera, stopScanner]);

  // Dọn dẹp unmount
  useEffect(() => {
    return () => {
      stopScanner();
      if (pastedImagePreview) {
        URL.revokeObjectURL(pastedImagePreview);
      }
    };
  }, [stopScanner, pastedImagePreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FiZap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Quét mã QR Check-in</h3>
              <p className="text-xs text-muted-foreground">Nhận diện mã định danh tự động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Đóng"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border bg-muted/20 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FiClipboard className="h-4 w-4 text-primary" />
            <span>Dán ảnh (Ctrl+V) / Tải file</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'camera'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FiCamera className="h-4 w-4 text-primary" />
            <span>Camera trực tiếp</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: UPLOAD / PASTE CLIPBOARD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Drop & Paste Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImageFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-3xl border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                  dragOver 
                    ? 'border-primary bg-primary/5 scale-[0.99]' 
                    : 'border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />

                {isProcessingImage ? (
                  <div className="flex flex-col items-center py-6">
                    <div className="h-12 w-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
                    <p className="text-sm font-bold text-foreground">Đang xử lý và quét mã QR...</p>
                    <p className="text-xs text-muted-foreground mt-1">Đang phân tích dữ liệu hình ảnh</p>
                  </div>
                ) : pastedImagePreview ? (
                  <div className="flex flex-col items-center py-2 space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-border shadow-md max-h-36">
                      <img 
                        src={pastedImagePreview} 
                        alt="Pasted QR preview" 
                        className="object-contain max-h-36 mx-auto"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <FiCheckCircle className="h-4 w-4" />
                      <span>Đã nạp ảnh, nhấn để chọn ảnh khác</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FiUploadCloud className="h-7 w-7" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground mb-1">
                      Nhấn <kbd className="px-2 py-1 text-xs font-semibold font-mono bg-card border border-border rounded-lg shadow-sm">Ctrl + V</kbd> để dán ảnh QR
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      Dùng phím <span className="font-semibold text-foreground">Win + Shift + S</span> để chụp mã vé của khách, sau đó dán vào đây hoặc kéo thả file ảnh.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                      <FiImage className="h-3.5 w-3.5" />
                      <span>Chọn file từ máy tính</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CAMERA WEBCAM */}
          <div className={activeTab === 'camera' ? 'block' : 'hidden'}>
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-h-[290px] mx-auto border border-border shadow-inner" ref={containerRef}>
              <div
                id="qr-scanner-region"
                className="w-full h-full"
              />

              {/* Camera loading */}
              {isStartingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                  <div className="h-10 w-10 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                  <p className="text-white text-xs font-medium">Đang khởi động camera...</p>
                </div>
              )}

              {/* Scanning crosshair guide */}
              {!isStartingCamera && !error && activeTab === 'camera' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-white/60 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-[11px] text-white/90 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Đặt mã QR vào giữa khung
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message display */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-shake">
              <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-medium">{error}</p>
                {activeTab === 'camera' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('upload')}
                    className="mt-1.5 inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                  >
                    Chuyển sang dán ảnh (Ctrl+V) <FiArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border bg-muted/30 px-6 py-4">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Hỗ trợ quét qua Camera trực tiếp, dán ảnh chụp màn hình (<kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-card border border-border rounded shadow-xs">Ctrl + V</kbd>), tải file ảnh hoặc máy quét barcode chuyên dụng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QrScannerModal;
