import React from 'react';
import { FiShield, FiMapPin, FiGlobe, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { CancellationPolicyDto } from '../../../api/staffApi';

interface CancellationTabProps {
  isLoading: boolean;
  filteredCancellationPolicies: CancellationPolicyDto[];
  onToggleActive: (pol: CancellationPolicyDto) => void;
  onOpenEdit: (pol: CancellationPolicyDto) => void;
  onDelete: (pol: CancellationPolicyDto) => void;
}

export const CancellationTab: React.FC<CancellationTabProps> = ({
  isLoading,
  filteredCancellationPolicies,
  onToggleActive,
  onOpenEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3 text-xs text-primary">
        <FiShield className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Nguyên tắc Bảo toàn Tài chính (Rule #40 & Priority Engine):</p>
          <p className="mt-0.5 text-foreground/80">
            1. <strong>Bảo đảm phương trình cân đối</strong>: Số tiền hoàn lại (<code>refund_amount</code>) + Phí phạt hủy (<code>penalty_amount</code>) luôn chính xác bằng Tổng tiền đơn hàng (<code>total_amount</code>).
          </p>
          <p className="mt-0.5 text-foreground/80">
            2. <strong>Thứ tự ưu tiên</strong>: Hệ thống so khớp quy tắc theo thứ tự <code>priority DESC</code> (Chi nhánh trước, Toàn hệ thống sau). Quy tắc đầu tiên thỏa mãn điều kiện thời gian sẽ được áp dụng.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="bg-muted/20 border-b border-border px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Chính sách Hủy đơn & Biểu phí phạt ({filteredCancellationPolicies.length} quy tắc)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quy định tỷ lệ hoàn tiền theo mốc ân hạn (Grace Hours) và khoảng cách thời gian trước giờ nhận phòng (Before Start Days).
            </p>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên chính sách</th>
                <th className="px-6 py-4 font-semibold">Loại quy tắc</th>
                <th className="px-6 py-4 font-semibold">Khung thời gian</th>
                <th className="px-6 py-4 font-semibold">Tỷ lệ hoàn tiền</th>
                <th className="px-6 py-4 font-semibold">Phí phạt giữ lại</th>
                <th className="px-6 py-4 font-semibold text-center">Độ ưu tiên</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-cancel-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredCancellationPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Không có chính sách hủy nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredCancellationPolicies.map(pol => (
                  <tr key={pol.id} className={`hover:bg-muted/20 transition-colors ${!pol.isActive ? 'bg-muted/10 opacity-70' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground text-sm">{pol.name}</div>
                      <div className="mt-0.5">
                        {pol.branchId ? (
                          <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                            <FiMapPin className="h-3 w-3" /> Chi nhánh riêng
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <FiGlobe className="h-3 w-3" /> Toàn hệ thống
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral" className="text-xs">
                        {pol.ruleType === 'GRACE_HOURS' ? 'Ân hạn sau đặt' : 'Trước khi nhận chỗ'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {pol.ruleType === 'GRACE_HOURS' 
                        ? `${pol.minValue}h - ${pol.maxValue}h sau khi đặt` 
                        : `${pol.minValue} - ${pol.maxValue} ngày trước giờ nhận`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-success text-base">{pol.refundPercent}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-destructive text-base">{100 - pol.refundPercent}%</span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-foreground">
                      {pol.priority}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onToggleActive(pol)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          pol.isActive 
                            ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                        }`}
                        title="Bấm để kích hoạt hoặc tạm ngưng"
                      >
                        <span className={`w-2 h-2 rounded-full ${pol.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {pol.isActive ? 'ÁP DỤNG' : 'TẠM TẮT'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onOpenEdit(pol)} className="btn btn-ghost btn-sm !p-1.5" title="Sửa"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => onDelete(pol)} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CancellationTab;
