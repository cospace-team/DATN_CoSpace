import React, { useEffect, useState } from 'react';
import { FiCheck, FiCopy, FiGift } from 'react-icons/fi';
import { promotionApi, type PromotionDto } from '../../../api/loyaltyApi';
import { formatVND } from '../../../utils/formatters';

/** The customer's usable personal vouchers (refunds paid as vouchers), with one-click copy. */
const MyVouchersStrip: React.FC<{ reloadKey?: number }> = ({ reloadKey = 0 }) => {
  const [vouchers, setVouchers] = useState<PromotionDto[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    promotionApi.myVouchers()
      .then((list) => setVouchers(list.filter((v) => v.state === 'running')))
      .catch(() => setVouchers([]));
  }, [reloadKey]);

  if (vouchers.length === 0) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FiGift className="h-4 w-4 text-emerald-600" /> Voucher hoàn tiền của bạn
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {vouchers.map((v) => (
          <div key={v.id} className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-500/40 bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{v.code}</p>
              <p className="text-xs text-muted-foreground">
                Giảm {formatVND(v.discountValue)} · HSD {new Date(v.endAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(v.code)}
              className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted flex items-center gap-1"
            >
              {copied === v.code ? <FiCheck className="h-3.5 w-3.5" /> : <FiCopy className="h-3.5 w-3.5" />}
              {copied === v.code ? 'Đã chép' : 'Chép mã'}
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Nhập mã ở bước thanh toán khi đặt chỗ. Mỗi voucher dùng một lần, trừ vào tiền thuê chỗ.</p>
    </section>
  );
};

export default MyVouchersStrip;
