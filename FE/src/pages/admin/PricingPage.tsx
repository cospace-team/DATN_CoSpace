import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiEdit2, FiPlus, FiCheckCircle, FiInbox, FiX, FiCheck, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { adminApi, type AdminPricePolicyDto } from '../../api/adminApi';
import { adminWorkspaceTypeApi, adminBranchApi, type WorkspaceTypeResponse, type AdminBranchDto } from '../../lib/spaceApi';

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

type ModalMode = { type: 'add' } | { type: 'edit'; policy: AdminPricePolicyDto } | null;

const PricingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [policies, setPolicies] = useState<AdminPricePolicyDto[]>([]);
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceTypeResponse[]>([]);
  const [branches, setBranches] = useState<AdminBranchDto[]>([]);
  const [modal, setModal] = useState<ModalMode>(null);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState({
    workspace_type_id: '',
    duration_unit: 'hour' as AdminPricePolicyDto['durationUnit'],
    branch_id: '', // Empty means "Toàn hệ thống"
    price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [policyList, typeList, branchList] = await Promise.all([
        adminApi.getPricePolicies(),
        adminWorkspaceTypeApi.list(),
        adminBranchApi.list(),
      ]);
      setPolicies(policyList);
      setWorkspaceTypes(typeList);
      setBranches(branchList);
    } catch (e: any) {
      setApiError(e.message || 'Không thể tải dữ liệu bảng giá.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => {
    setForm({
      workspace_type_id: workspaceTypes[0]?.id || '',
      duration_unit: 'hour',
      branch_id: '',
      price: '',
      is_active: true,
    });
    setErrors({});
    setModal({ type: 'add' });
  };

  const openEdit = (p: AdminPricePolicyDto) => {
    setForm({
      workspace_type_id: p.workspaceTypeId,
      duration_unit: p.durationUnit,
      branch_id: p.branchId || '',
      price: String(p.price),
      is_active: p.isActive,
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;

    try {
      if (modal?.type === 'add') {
        const created = await adminApi.createPricePolicy({
          branchId: form.branch_id || null,
          workspaceTypeId: form.workspace_type_id,
          durationUnit: form.duration_unit,
          price,
        });
        setPolicies((prev) => [created, ...prev]);
        showSuccess('Thêm chính sách giá thành công');
        setModal(null);
      } else if (modal?.type === 'edit') {
        const updated = await adminApi.updatePricePolicy(modal.policy.id, { price, isActive: form.is_active });
        setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSuccess('Cập nhật chính sách giá thành công');
        setModal(null);
      }
    } catch (e: any) {
      setErrors({ general: e.message || 'Lỗi khi lưu chính sách giá.' });
    }
  };

  const deletePolicy = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mức giá này? Hành động này không thể hoàn tác.')) return;
    try {
      await adminApi.deletePricePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Đã xóa mức giá');
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa mức giá.');
    }
  };

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
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cấu hình hệ thống</p>
              <h1 className="text-2xl font-bold font-heading mt-1">Bảng giá dịch vụ</h1>
              <p className="text-sm font-medium text-muted-foreground mt-2">
                Quản lý mức giá theo loại không gian, thời lượng và phạm vi áp dụng.
              </p>
            </div>
            <Button onClick={openAdd}>
              <FiPlus className="h-4 w-4 mr-2" /> Thêm chính sách giá
            </Button>
          </div>
        </CardContent>
      </Card>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

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
                <th className="px-6 py-4 font-semibold">Thời lượng</th>
                <th className="px-6 py-4 font-semibold">Phạm vi áp dụng</th>
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
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 bg-card">
                    <EmptyState
                      icon={FiInbox}
                      title="Chưa có chính sách giá"
                      description="Hệ thống chưa thiết lập mức giá nào."
                      action={
                        <Button onClick={openAdd}>
                          <FiPlus className="h-4 w-4 mr-2" /> Thêm ngay
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                policies.map(pp => (
                  <tr key={pp.id} className="border-b border-border hover:bg-muted/50 transition-colors bg-card">
                    <td className="px-6 py-4 align-middle font-medium max-w-[150px]">
                      <div className="truncate" title={pp.workspaceTypeName}>{pp.workspaceTypeName}</div>
                    </td>
                    <td className="px-6 py-4 align-middle text-muted-foreground">{durationUnitLabel[pp.durationUnit]}</td>
                    <td className="px-6 py-4 align-middle max-w-[150px]">
                      <div className="truncate" title={pp.branchName || ''}>
                        {pp.branchName ? <Badge variant="info">{pp.branchName}</Badge> : <Badge variant="neutral">Toàn hệ thống</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle font-semibold text-primary">{formatVND(pp.price)}</td>
                    <td className="px-6 py-4 align-middle text-center">
                      <Badge variant={pp.isActive ? 'success' : 'neutral'}>
                        {pp.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pp)} title="Chỉnh sửa">
                          <FiEdit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deletePolicy(pp.id)} title="Xóa">
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.type === 'add' ? 'Thêm chính sách giá' : 'Chỉnh sửa chính sách giá'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="workspace_type_id">Loại không gian <span className="text-destructive">*</span></Label>
              <select
                id="workspace_type_id"
                disabled={modal.type === 'edit'}
                className={`flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors disabled:opacity-60 ${errors.workspace_type_id ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={form.workspace_type_id}
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
                  disabled={modal.type === 'edit'}
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors disabled:opacity-60"
                  value={form.duration_unit}
                  onChange={(e) => setForm((p) => ({ ...p, duration_unit: e.target.value as AdminPricePolicyDto['durationUnit'] }))}
                >
                  <option value="hour">Giờ</option>
                  <option value="day">Ngày</option>
                  <option value="week">Tuần</option>
                  <option value="month">Tháng</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá (VND) <span className="text-destructive">*</span></Label>
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

            <div className="space-y-2">
              <Label htmlFor="branch_id">Phạm vi áp dụng (Chi nhánh)</Label>
              <select
                id="branch_id"
                disabled={modal.type === 'edit'}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors disabled:opacity-60"
                value={form.branch_id}
                onChange={(e) => setForm(p => ({ ...p, branch_id: e.target.value }))}
              >
                <option value="">Toàn hệ thống (Mặc định)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Chọn "Toàn hệ thống" để áp dụng cho mọi chi nhánh, trừ khi chi nhánh có giá ghi đè riêng.</p>
            </div>

            {modal.type === 'edit' && (
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
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button onClick={save}>
                <FiCheck className="h-4 w-4 mr-2" /> Lưu chính sách
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PricingPage;
