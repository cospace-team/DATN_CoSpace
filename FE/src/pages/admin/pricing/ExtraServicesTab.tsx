import React from 'react';
import { FiInfo, FiMapPin, FiGlobe, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatVND } from '../../../utils/formatters';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { ExtraServiceDto } from '../../../api/staffApi';

interface ExtraServicesTabProps {
  isLoading: boolean;
  filteredExtraServices: ExtraServiceDto[];
  onToggleActive: (svc: ExtraServiceDto) => void;
  onOpenEdit: (svc: ExtraServiceDto) => void;
  onDelete: (svc: ExtraServiceDto) => void;
}

export const ExtraServicesTab: React.FC<ExtraServicesTabProps> = ({
  isLoading,
  filteredExtraServices,
  onToggleActive,
  onOpenEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3 text-xs text-primary">
        <FiInfo className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Cơ chế an toàn doanh thu & Demo trực tiếp:</p>
          <p className="mt-0.5 text-foreground/80">
            1. <strong>Không ảnh hưởng đơn cũ</strong>: Đơn giá dịch vụ được ghi nhận (snapshot) cố định vào từng đơn đặt chỗ ngay lúc gọi món. Sửa tên hoặc thay đổi giá không làm thay đổi lịch sử đơn cũ.
          </p>
          <p className="mt-0.5 text-foreground/80">
            2. <strong>Công tắc Bật/Tắt (Toggle)</strong>: Bạn có thể bật hoặc tạm ngưng các dịch vụ bên dưới để thấy khách hàng chỉ có thể chọn các dịch vụ đang hoạt động.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="bg-muted/20 border-b border-border px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Danh mục Dịch vụ gia tăng ({filteredExtraServices.length} dịch vụ)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý giá bán và trạng thái cung ứng của các món ăn, thức uống, thiết bị văn phòng và tiện ích sự kiện.
            </p>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên dịch vụ</th>
                <th className="px-6 py-4 font-semibold">Phân loại</th>
                <th className="px-6 py-4 font-semibold">Đơn vị</th>
                <th className="px-6 py-4 font-semibold">Giá bán (VND)</th>
                <th className="px-6 py-4 font-semibold">Phạm vi áp dụng</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái (Bật/Tắt)</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-svc-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-24 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredExtraServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Không có dịch vụ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredExtraServices.map(svc => (
                  <tr key={svc.id} className={`hover:bg-muted/20 transition-colors ${!svc.isActive ? 'bg-muted/10 opacity-70' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground text-sm">{svc.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{svc.code}</div>
                      {svc.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{svc.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral" className="gap-1 font-medium text-xs">
                        <span>
                          {svc.serviceType === 'drink' ? '☕'
                            : svc.serviceType === 'meal' ? '🥐'
                            : svc.serviceType === 'printing' ? '🖨️'
                            : svc.serviceType === 'equipment' ? '📽️'
                            : svc.serviceType === 'facility' ? '🚪'
                            : '✨'}
                        </span>
                        <span className="capitalize">{svc.serviceType}</span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{svc.unit}</td>
                    <td className="px-6 py-4 font-bold text-primary text-base">{formatVND(svc.price)}</td>
                    <td className="px-6 py-4">
                      {svc.branchId ? (
                        <Badge variant="info" className="gap-1">
                          <FiMapPin className="h-3 w-3" /> Chi nhánh riêng
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="gap-1">
                          <FiGlobe className="h-3 w-3" /> Toàn hệ thống
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onToggleActive(svc)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          svc.isActive 
                            ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                        }`}
                        title="Bấm để bật hoặc tắt phục vụ"
                      >
                        <span className={`w-2 h-2 rounded-full ${svc.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {svc.isActive ? 'ĐANG PHỤC VỤ' : 'TẠM NGƯNG'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onOpenEdit(svc)} className="btn btn-ghost btn-sm !p-1.5" title="Sửa dịch vụ"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => onDelete(svc)} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-4 w-4" /></button>
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

export default ExtraServicesTab;
