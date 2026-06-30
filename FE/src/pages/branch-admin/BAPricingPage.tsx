import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiEdit2, FiPlus, FiCheckCircle, FiXCircle, FiInbox, FiX, FiCheck, FiTrash2, FiAlertCircle, FiGlobe, FiMapPin } from 'react-icons/fi';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { pricePolicies as initialPolicies, getWorkspaceType, workspaceTypes, type PricePolicy } from '../../data/mockData';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
          <FiX className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

type ModalMode = { type: 'add' } | { type: 'edit'; policy: PricePolicy } | null;

const BAPricingPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [isLoading, setIsLoading] = useState(true);
  const [policies, setPolicies] = useState<PricePolicy[]>([]);
  const [modal, setModal] = useState<ModalMode>(null);

  const [form, setForm] = useState({
    workspace_type_id: '',
    duration_unit: 'hour' as PricePolicy['duration_unit'],
    price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPolicies(initialPolicies.filter(p => !p.branch_id || p.branch_id === branchId).map(p => ({ ...p })));
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [branchId]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => {
    setForm({
      workspace_type_id: workspaceTypes[0]?.id || '',
      duration_unit: 'hour',
      price: '',
      is_active: true,
    });
    setErrors({});
    setModal({ type: 'add' });
  };

  const openEdit = (p: PricePolicy) => {
    setForm({
      workspace_type_id: p.workspace_type_id,
      duration_unit: p.duration_unit,
      price: String(p.price),
      is_active: p.is_active,
    });
    setErrors({});
    setModal({ type: 'edit', policy: p });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.workspace_type_id) newErrors.workspace_type_id = 'Vui lòng chọn loại không gian';
    if (!form.duration_unit) newErrors.duration_unit = 'Vui lòng chọn đơn vị thời gian';
    
    const priceNum = parseInt(form.price.replace(/\D/g, ''));
    if (isNaN(priceNum) || priceNum < 0) newErrors.price = 'Giá phải là số hợp lệ';
    
    const isDuplicate = policies.some(p => 
      p.branch_id === branchId &&
      p.workspace_type_id === form.workspace_type_id &&
      p.duration_unit === form.duration_unit &&
      (modal?.type !== 'edit' || modal.policy.id !== p.id)
    );

    if (isDuplicate) {
      newErrors.general = 'Chi nhánh của bạn đã có mức giá riêng cho loại không gian và thời lượng này.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;
    
    if (modal?.type === 'add') {
      const newPolicy: PricePolicy = {
        id: `pp-branch-${Date.now()}`,
        workspace_type_id: form.workspace_type_id,
        duration_unit: form.duration_unit,
        price,
        currency: 'VND',
        is_active: form.is_active,
        branch_id: branchId,
      };
      setPolicies((prev) => [newPolicy, ...prev]);
      showSuccess('Thêm giá riêng cho chi nhánh thành công');
    } else if (modal?.type === 'edit') {
      if (!modal.policy.branch_id) {
        const newOverride: PricePolicy = {
          id: `pp-branch-${Date.now()}`,
          workspace_type_id: form.workspace_type_id,
          duration_unit: form.duration_unit,
          price,
          currency: 'VND',
          is_active: form.is_active,
          branch_id: branchId,
        };
        setPolicies((prev) => [newOverride, ...prev]);
        showSuccess('Đã tạo mức giá ghi đè cho chi nhánh');
      } else {
        setPolicies((prev) =>
          prev.map((p) =>
            p.id === modal.policy.id
              ? { ...p, workspace_type_id: form.workspace_type_id, duration_unit: form.duration_unit, price, is_active: form.is_active }
              : p
          )
        );
        showSuccess('Cập nhật mức giá thành công');
      }
    }
    setModal(null);
  };

  const deletePolicy = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn mức giá riêng này? Hệ thống sẽ quay về dùng giá mặc định.')) {
      setPolicies(prev => prev.filter(p => p.id !== id));
      showSuccess('Đã xóa mức giá riêng của chi nhánh');
    }
  };

  const sortedPolicies = [...policies].sort((a, b) => {
    if (a.branch_id && !b.branch_id) return -1;
    if (!a.branch_id && b.branch_id) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheckCircle className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
              <h1 className="text-2xl font-bold font-heading mt-1">Bảng giá</h1>
              <p className="text-sm text-muted-foreground mt-1">Quản lý các mức giá áp dụng tại chi nhánh của bạn.</p>
            </div>
            <Button onClick={openAdd}>
              <FiPlus className="h-4 w-4 mr-2" /> Thêm giá riêng
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium flex items-center gap-1">
            <FiMapPin className="h-3 w-3" /> Giá riêng (Ghi đè)
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full border border-border bg-muted font-medium flex items-center gap-1">
            <FiGlobe className="h-3 w-3" /> Giá hệ thống (Mặc định)
          </span>
        </span>
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FiDollarSign className="h-5 w-5 text-primary" /> Tất cả bảng giá
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Loại workspace</th>
                <th className="px-6 py-4 font-semibold">Đơn vị thời gian</th>
                <th className="px-6 py-4 font-semibold">Phân loại</th>
                <th className="px-6 py-4 font-semibold">Giá (VND)</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-28 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-16 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : sortedPolicies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 bg-card">
                    <EmptyState 
                      icon={FiInbox} 
                      title="Chưa có chính sách giá" 
                      description="Hệ thống chưa cấu hình bảng giá nào." 
                      action={
                        <Button onClick={openAdd}>
                          <FiPlus className="h-4 w-4 mr-2" /> Thêm ngay
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                sortedPolicies.map(pp => {
                  const wsType = getWorkspaceType(pp.workspace_type_id);
                  const isBranchSpecific = !!pp.branch_id;
                  
                  const isOverridden = !isBranchSpecific && policies.some(
                    override => override.branch_id && override.workspace_type_id === pp.workspace_type_id && override.duration_unit === pp.duration_unit
                  );

                  return (
                    <tr key={pp.id} className={`border-b border-border hover:bg-muted/50 transition-colors bg-card ${isOverridden ? 'opacity-40 bg-muted/20' : ''}`}>
                      <td className="px-6 py-4 align-middle font-medium max-w-[150px]">
                        <div className="truncate" title={wsType?.name}>{wsType?.name}</div>
                      </td>
                      <td className="px-6 py-4 align-middle text-muted-foreground">{durationUnitLabel[pp.duration_unit]}</td>
                      <td className="px-6 py-4 align-middle">
                        {isBranchSpecific ? (
                          <Badge className="border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            <FiMapPin className="h-3 w-3 mr-1" /> Giá chi nhánh
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            <FiGlobe className="h-3 w-3 mr-1" /> Mặc định
                          </Badge>
                        )}
                        {isOverridden && <span className="ml-2 text-xs font-semibold text-destructive">(Đã bị ghi đè)</span>}
                      </td>
                      <td className={`px-6 py-4 align-middle font-semibold ${isBranchSpecific ? 'text-primary' : ''}`}>
                        {isOverridden ? <del className="text-muted-foreground">{formatVND(pp.price)}</del> : formatVND(pp.price)}
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <Badge variant={pp.is_active ? 'success' : 'neutral'}>
                          {pp.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isOverridden && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(pp)} title={isBranchSpecific ? "Chỉnh sửa" : "Tạo giá ghi đè"}>
                              <FiEdit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {isBranchSpecific && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deletePolicy(pp.id)} title="Xóa">
                              <FiTrash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.type === 'add' ? 'Thêm giá riêng cho chi nhánh' : (modal.policy.branch_id ? 'Chỉnh sửa giá chi nhánh' : 'Tạo giá ghi đè cho chi nhánh')}
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="workspace_type_id">Loại không gian <span className="text-destructive">*</span></Label>
              <select
                id="workspace_type_id"
                className={`flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${errors.workspace_type_id ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={form.workspace_type_id}
                disabled={modal.type === 'edit'}
                onChange={(e) => {
                  setForm(p => ({ ...p, workspace_type_id: e.target.value }));
                  if (errors.workspace_type_id) setErrors(p => ({ ...p, workspace_type_id: '' }));
                }}
              >
                {workspaceTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_unit">Thời lượng <span className="text-destructive">*</span></Label>
                <select
                  id="duration_unit"
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  value={form.duration_unit}
                  disabled={modal.type === 'edit'}
                  onChange={(e) => setForm((p) => ({ ...p, duration_unit: e.target.value as PricePolicy['duration_unit'] }))}
                >
                  <option value="hour">Giờ</option>
                  <option value="day">Ngày</option>
                  <option value="week">Tuần</option>
                  <option value="month">Tháng</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá mới (VND) <span className="text-destructive">*</span></Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={1000}
                  className={errors.price ? 'border-destructive focus-visible:ring-destructive' : ''}
                  placeholder="Ví dụ: 50000"
                  value={form.price}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, price: e.target.value }));
                    if (errors.price) setErrors(p => ({ ...p, price: '' }));
                  }}
                />
                {errors.price && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.price}</p>}
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg mt-2">
              Chính sách giá này sẽ được ưu tiên áp dụng tại chi nhánh của bạn. Giá mới chỉ áp dụng cho các lượt đặt chỗ (booking) sau thời điểm lưu.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="price-active"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="price-active" className="cursor-pointer">Kích hoạt mức giá này</Label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button onClick={save}>
                <FiCheck className="h-4 w-4 mr-2" /> Lưu giá riêng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAPricingPage;