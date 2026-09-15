import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FiDollarSign, FiEdit2, FiPlus, FiCheckCircle, FiInbox, FiX, FiCheck, 
  FiTrash2, FiAlertCircle, FiGrid, FiList, FiGlobe, FiMapPin, FiZap, FiLayers, 
  FiRefreshCw, FiCoffee, FiShield, FiClock, FiPercent, FiInfo
} from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { adminApi, type AdminPricePolicyDto } from '../../api/adminApi';
import { adminWorkspaceTypeApi, adminBranchApi, type WorkspaceTypeResponse, type AdminBranchDto } from '../../lib/spaceApi';
import { staffApi, type ExtraServiceDto, type CancellationPolicyDto } from '../../api/staffApi';

const DURATION_UNITS: Array<AdminPricePolicyDto['durationUnit']> = ['hour', 'day', 'week', 'month'];

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({
  title, onClose, children, maxWidth = 'max-w-md',
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className={`bg-card border border-border rounded-2xl shadow-2xl w-full ${maxWidth} animate-scale-in flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading text-foreground">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
          <FiX className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

type ModalMode = 
  | { type: 'add'; prefillType?: string; prefillUnit?: AdminPricePolicyDto['durationUnit']; prefillBranch?: string; suggestedPrice?: number }
  | { type: 'edit'; policy: AdminPricePolicyDto }
  | { type: 'preset'; workspaceType: WorkspaceTypeResponse; branchId: string }
  | { type: 'service'; service?: ExtraServiceDto }
  | { type: 'cancellation'; policy?: CancellationPolicyDto }
  | null;

const PricingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pricingHubTab, setPricingHubTab] = useState<'workspace' | 'services' | 'cancellation'>('workspace');
  
  // Data states
  const [isLoading, setIsLoading] = useState(true);
  const [policies, setPolicies] = useState<AdminPricePolicyDto[]>([]);
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceTypeResponse[]>([]);
  const [branches, setBranches] = useState<AdminBranchDto[]>([]);
  const [extraServices, setExtraServices] = useState<ExtraServiceDto[]>([]);
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicyDto[]>([]);
  
  // View states for Workspace Tab
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('global'); // 'global' | branchId | 'all'
  const [modal, setModal] = useState<ModalMode>(null);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Single policy form (Workspace)
  const [form, setForm] = useState({
    workspace_type_id: '',
    duration_unit: 'hour' as AdminPricePolicyDto['durationUnit'],
    branch_id: '',
    price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preset batch form
  const [presetHourlyPrice, setPresetHourlyPrice] = useState<string>('30000');
  const [presetCustomPrices, setPresetCustomPrices] = useState({
    hour: '30000',
    day: '180000',
    week: '800000',
    month: '2800000',
  });
  const [isSubmittingPreset, setIsSubmittingPreset] = useState(false);

  // Service form
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    serviceType: 'drink',
    unit: 'ly',
    price: '30000',
    description: '',
    branchId: '',
    isActive: true,
  });

  // Cancellation form
  const [cancelForm, setCancelForm] = useState({
    name: '',
    ruleType: 'GRACE_HOURS',
    minValue: '0',
    maxValue: '2',
    refundPercent: '100',
    priority: '200',
    branchId: '',
    isActive: true,
  });

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [policyList, typeList, branchList, servicesList, cancelList] = await Promise.all([
        adminApi.getPricePolicies(),
        adminWorkspaceTypeApi.list(),
        adminBranchApi.list(),
        staffApi.getExtraServices(undefined, true),
        staffApi.getCancellationPolicies(),
      ]);
      setPolicies(policyList);
      setWorkspaceTypes(typeList);
      setBranches(branchList);
      setExtraServices(servicesList);
      setCancellationPolicies(cancelList);

      // Check if URL has createForType query
      const createForTypeId = searchParams.get('createForType');
      if (createForTypeId) {
        const targetType = typeList.find(t => t.id === createForTypeId);
        if (targetType) {
          setModal({
            type: 'preset',
            workspaceType: targetType,
            branchId: '',
          });
          searchParams.delete('createForType');
          setSearchParams(searchParams, { replace: true });
        }
      }
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
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // ── Workspace Handlers ──
  const openAdd = (prefill?: { typeId?: string; unit?: AdminPricePolicyDto['durationUnit']; branchId?: string; price?: number }) => {
    setForm({
      workspace_type_id: prefill?.typeId || workspaceTypes[0]?.id || '',
      duration_unit: prefill?.unit || 'hour',
      branch_id: prefill?.branchId !== undefined ? prefill.branchId : (selectedBranchFilter === 'all' || selectedBranchFilter === 'global' ? '' : selectedBranchFilter),
      price: prefill?.price ? String(prefill.price) : '',
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

  const openPresetModal = (wt: WorkspaceTypeResponse) => {
    const targetBranch = selectedBranchFilter === 'all' || selectedBranchFilter === 'global' ? '' : selectedBranchFilter;
    const existingHour = policies.find(p => p.workspaceTypeId === wt.id && p.durationUnit === 'hour' && (targetBranch ? p.branchId === targetBranch : !p.branchId));
    const baseH = existingHour ? existingHour.price : 30000;
    
    setPresetHourlyPrice(String(baseH));
    setPresetCustomPrices({
      hour: String(baseH),
      day: String(Math.round(baseH * 6)),
      week: String(Math.round(baseH * 6 * 5 * 0.85)),
      month: String(Math.round(baseH * 6 * 22 * 0.7)),
    });
    setModal({ type: 'preset', workspaceType: wt, branchId: targetBranch });
  };

  const handleBaseHourlyChange = (val: string) => {
    setPresetHourlyPrice(val);
    const num = parseInt(val.replace(/\D/g, '')) || 0;
    setPresetCustomPrices({
      hour: String(num),
      day: String(Math.round(num * 6)),
      week: String(Math.round(num * 6 * 5 * 0.85)),
      month: String(Math.round(num * 6 * 22 * 0.7)),
    });
  };

  const handleSavePreset = async (workspaceType: WorkspaceTypeResponse, branchId: string) => {
    setIsSubmittingPreset(true);
    setApiError('');
    try {
      const units: Array<AdminPricePolicyDto['durationUnit']> = ['hour', 'day', 'week', 'month'];
      const promises = units.map(async (u) => {
        const price = parseInt(presetCustomPrices[u].replace(/\D/g, '')) || 0;
        if (price <= 0) return null;
        
        const existing = policies.find(p => 
          p.workspaceTypeId === workspaceType.id && 
          p.durationUnit === u && 
          (branchId ? p.branchId === branchId : !p.branchId)
        );

        if (existing) {
          return adminApi.updatePricePolicy(existing.id, { price, isActive: true });
        } else {
          return adminApi.createPricePolicy({
            branchId: branchId || null,
            workspaceTypeId: workspaceType.id,
            durationUnit: u,
            price,
          });
        }
      });

      await Promise.all(promises);
      await load();
      showSuccess(`Đã áp dụng bộ 4 mốc giá cho "${workspaceType.name}" thành công!`);
      setModal(null);
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu bộ giá mẫu.');
    } finally {
      setIsSubmittingPreset(false);
    }
  };

  const saveWorkspacePolicy = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.workspace_type_id) newErrors.workspace_type_id = 'Vui lòng chọn loại không gian';
    if (!form.duration_unit) newErrors.duration_unit = 'Vui lòng chọn đơn vị thời gian';
    const priceNum = parseInt(form.price.replace(/\D/g, ''));
    if (isNaN(priceNum) || priceNum < 0) newErrors.price = 'Giá phải là số hợp lệ';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      if (modal?.type === 'add') {
        const created = await adminApi.createPricePolicy({
          branchId: form.branch_id || null,
          workspaceTypeId: form.workspace_type_id,
          durationUnit: form.duration_unit,
          price: priceNum,
        });
        setPolicies((prev) => [created, ...prev]);
        showSuccess('Thêm chính sách giá thành công');
        setModal(null);
      } else if (modal?.type === 'edit') {
        const updated = await adminApi.updatePricePolicy(modal.policy.id, { price: priceNum, isActive: form.is_active });
        setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSuccess('Cập nhật chính sách giá thành công');
        setModal(null);
      }
    } catch (e: any) {
      setErrors({ general: e.message || 'Lỗi khi lưu chính sách giá.' });
    }
  };

  const deleteWorkspacePolicy = async (id: string, customConfirmMsg?: string) => {
    const msg = customConfirmMsg || 'Bạn có chắc chắn muốn xóa mức giá này? Hành động này không thể hoàn tác.';
    if (!window.confirm(msg)) return;
    try {
      await adminApi.deletePricePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Đã xóa mức giá thành công');
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa mức giá.');
    }
  };

  // ── Extra Service Handlers ──
  const toggleServiceActive = async (svc: ExtraServiceDto) => {
    try {
      const nextActive = !svc.isActive;
      await staffApi.updateExtraService(svc.id, { isActive: nextActive });
      setExtraServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: nextActive } : s));
      showSuccess(`Đã ${nextActive ? 'BẬT phục vụ' : 'TẠM NGƯNG'} dịch vụ "${svc.name}"`);
    } catch (e: any) {
      setApiError(e.message || 'Không thể cập nhật trạng thái dịch vụ.');
    }
  };

  const openAddService = () => {
    setServiceForm({
      code: '',
      name: '',
      serviceType: 'drink',
      unit: 'ly',
      price: '30000',
      description: '',
      branchId: selectedBranchFilter === 'global' || selectedBranchFilter === 'all' ? '' : selectedBranchFilter,
      isActive: true,
    });
    setModal({ type: 'service' });
  };

  const openEditService = (svc: ExtraServiceDto) => {
    setServiceForm({
      code: svc.code,
      name: svc.name,
      serviceType: svc.serviceType,
      unit: svc.unit,
      price: String(svc.price),
      description: svc.description || '',
      branchId: svc.branchId || '',
      isActive: svc.isActive,
    });
    setModal({ type: 'service', service: svc });
  };

  const saveService = async () => {
    const priceNum = parseInt(serviceForm.price.replace(/\D/g, '')) || 0;
    try {
      if (modal?.type === 'service' && modal.service) {
        await staffApi.updateExtraService(modal.service.id, {
          name: serviceForm.name,
          price: priceNum,
          unit: serviceForm.unit,
          serviceType: serviceForm.serviceType,
          description: serviceForm.description,
          isActive: serviceForm.isActive,
        });
        showSuccess('Cập nhật dịch vụ thành công');
      } else {
        await staffApi.createExtraService({
          code: serviceForm.code || `svc-${Date.now()}`,
          name: serviceForm.name,
          serviceType: serviceForm.serviceType,
          unit: serviceForm.unit,
          price: priceNum,
          description: serviceForm.description,
          branchId: serviceForm.branchId || undefined,
          isActive: serviceForm.isActive,
        });
        showSuccess('Thêm dịch vụ mới thành công');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu dịch vụ.');
    }
  };

  const deleteService = async (svc: ExtraServiceDto) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn "${svc.name}"? Nếu dịch vụ đã từng được sử dụng trong đơn hàng cũ, hệ thống sẽ yêu cầu TẮT thay vì xóa.`)) return;
    try {
      await staffApi.deleteExtraService(svc.id);
      showSuccess('Đã xóa dịch vụ thành công');
      setExtraServices(prev => prev.filter(s => s.id !== svc.id));
    } catch (e: any) {
      setApiError(e.message || 'Không thể xóa. Dịch vụ này đã gắn với đơn hàng cũ — hãy chuyển sang trạng thái Tạm ngưng.');
    }
  };

  // ── Cancellation Policy Handlers ──
  const toggleCancelPolicyActive = async (policy: CancellationPolicyDto) => {
    try {
      const nextActive = !policy.isActive;
      const { id, ...rest } = policy;
      await staffApi.updateCancellationPolicy(id, { ...rest, isActive: nextActive });
      setCancellationPolicies(prev => prev.map(p => p.id === policy.id ? { ...p, isActive: nextActive } : p));
      showSuccess(`Đã ${nextActive ? 'kích hoạt' : 'tạm ngưng'} chính sách "${policy.name}"`);
    } catch (e: any) {
      setApiError(e.message || 'Không thể cập nhật trạng thái chính sách.');
    }
  };

  const openAddCancellation = () => {
    setCancelForm({
      name: '',
      ruleType: 'GRACE_HOURS',
      minValue: '0',
      maxValue: '2',
      refundPercent: '100',
      priority: '200',
      branchId: selectedBranchFilter === 'global' || selectedBranchFilter === 'all' ? '' : selectedBranchFilter,
      isActive: true,
    });
    setModal({ type: 'cancellation' });
  };

  const openEditCancellation = (policy: CancellationPolicyDto) => {
    setCancelForm({
      name: policy.name,
      ruleType: policy.ruleType,
      minValue: String(policy.minValue),
      maxValue: String(policy.maxValue),
      refundPercent: String(policy.refundPercent),
      priority: String(policy.priority),
      branchId: policy.branchId || '',
      isActive: policy.isActive,
    });
    setModal({ type: 'cancellation', policy });
  };

  const saveCancellation = async () => {
    try {
      const payload = {
        name: cancelForm.name,
        ruleType: cancelForm.ruleType,
        minValue: parseInt(cancelForm.minValue) || 0,
        maxValue: parseInt(cancelForm.maxValue) || 1,
        refundPercent: parseInt(cancelForm.refundPercent) || 0,
        priority: parseInt(cancelForm.priority) || 100,
        branchId: cancelForm.branchId || undefined,
        isActive: cancelForm.isActive,
      };

      if (modal?.type === 'cancellation' && modal.policy) {
        await staffApi.updateCancellationPolicy(modal.policy.id, payload);
        showSuccess('Cập nhật chính sách hủy thành công');
      } else {
        await staffApi.createCancellationPolicy(payload);
        showSuccess('Thêm chính sách hủy mới thành công');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu chính sách hủy.');
    }
  };

  const deleteCancellation = async (policy: CancellationPolicyDto) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chính sách hủy "${policy.name}"?`)) return;
    try {
      await staffApi.deleteCancellationPolicy(policy.id);
      showSuccess('Đã xóa chính sách hủy');
      setCancellationPolicies(prev => prev.filter(p => p.id !== policy.id));
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa chính sách hủy.');
    }
  };

  // Helper matching for Workspace Matrix
  const getPolicyCell = (wsTypeId: string, unit: AdminPricePolicyDto['durationUnit']) => {
    if (selectedBranchFilter === 'global') {
      const globalPol = policies.find(p => p.workspaceTypeId === wsTypeId && p.durationUnit === unit && !p.branchId);
      return { type: 'global' as const, policy: globalPol || null };
    }

    if (selectedBranchFilter !== 'all') {
      const branchPol = policies.find(p => p.workspaceTypeId === wsTypeId && p.durationUnit === unit && p.branchId === selectedBranchFilter);
      const globalPol = policies.find(p => p.workspaceTypeId === wsTypeId && p.durationUnit === unit && !p.branchId);

      if (branchPol) return { type: 'branch_override' as const, policy: branchPol, globalPolicy: globalPol || null };
      if (globalPol) return { type: 'inherited' as const, policy: globalPol };
      return { type: 'missing' as const, policy: null };
    }

    return { type: 'global' as const, policy: null };
  };

  const selectedBranchName = branches.find(b => b.id === selectedBranchFilter)?.name || 'Chi nhánh';

  // Filtered lists by branch
  const filteredWorkspacePolicies = policies.filter(p => {
    if (selectedBranchFilter === 'global') return !p.branchId;
    if (selectedBranchFilter === 'all') return true;
    return p.branchId === selectedBranchFilter;
  });

  const filteredExtraServices = extraServices.filter(s => {
    if (selectedBranchFilter === 'global') return !s.branchId;
    if (selectedBranchFilter === 'all') return true;
    return s.branchId === selectedBranchFilter;
  });

  const filteredCancellationPolicies = cancellationPolicies.filter(p => {
    if (selectedBranchFilter === 'global') return !p.branchId;
    if (selectedBranchFilter === 'all') return true;
    return p.branchId === selectedBranchFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheckCircle className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* ── 1. Top Hub Header & Architecture Summary ── */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trung tâm quản lý tài chính</p>
              <h1 className="text-2xl font-bold font-heading mt-1 flex items-center gap-2.5">
                <FiDollarSign className="h-7 w-7 text-primary" /> Bảng giá & Biểu phí hệ thống
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Quản lý tập trung 3 trụ cột giá: Thuê không gian, Dịch vụ gia tăng và Biểu phí phạt hoàn hủy.
              </p>
            </div>

            {/* Quick Action Button based on Active Hub Tab */}
            <div>
              {pricingHubTab === 'workspace' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setViewMode('matrix')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        viewMode === 'matrix' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FiGrid className="h-3.5 w-3.5" /> Ma trận giá
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FiList className="h-3.5 w-3.5" /> Bảng chi tiết
                    </button>
                  </div>
                  <Button onClick={() => openAdd()}>
                    <FiPlus className="h-4 w-4 mr-1.5" /> Thêm mức giá
                  </Button>
                </div>
              )}

              {pricingHubTab === 'services' && (
                <Button onClick={openAddService}>
                  <FiPlus className="h-4 w-4 mr-1.5" /> Thêm dịch vụ
                </Button>
              )}

              {pricingHubTab === 'cancellation' && (
                <Button onClick={openAddCancellation}>
                  <FiPlus className="h-4 w-4 mr-1.5" /> Thêm chính sách hủy
                </Button>
              )}
            </div>
          </div>

          {/* Hub Navigation Tabs */}
          <div className="mt-6 flex items-center gap-2 border-b border-border pb-3">
            <button
              onClick={() => setPricingHubTab('workspace')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                pricingHubTab === 'workspace'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <FiGrid className="h-4 w-4" /> Ma trận Giá chỗ ngồi ({policies.length})
            </button>

            <button
              onClick={() => setPricingHubTab('services')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                pricingHubTab === 'services'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <FiCoffee className="h-4 w-4" /> Dịch vụ gia tăng ({extraServices.length})
            </button>

            <button
              onClick={() => setPricingHubTab('cancellation')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                pricingHubTab === 'cancellation'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <FiShield className="h-4 w-4" /> Biểu phí phạt hủy ({cancellationPolicies.length})
            </button>
          </div>

          {/* Branch Filter Pills */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground mr-2 shrink-0">Phạm vi xem:</span>
            <button
              onClick={() => setSelectedBranchFilter('global')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedBranchFilter === 'global'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              }`}
            >
              <FiGlobe className="h-3.5 w-3.5" /> Toàn hệ thống (Giá chuẩn)
            </button>

            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchFilter(b.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedBranchFilter === b.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                }`}
              >
                <FiMapPin className="h-3.5 w-3.5" /> {b.name}
              </button>
            ))}

            <button
              onClick={() => setSelectedBranchFilter('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedBranchFilter === 'all'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              }`}
            >
              <FiLayers className="h-3.5 w-3.5" /> Xem tất cả
            </button>
          </div>
        </CardContent>
      </Card>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" /> {apiError}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: WORKSPACE MATRIX PRICING
         ══════════════════════════════════════════════════════════════════════ */}
      {pricingHubTab === 'workspace' && (
        <>
          {viewMode === 'matrix' ? (
            <Card className="overflow-hidden border-border shadow-sm">
              <CardHeader className="bg-muted/20 border-b border-border px-6 py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Ma trận giá: {selectedBranchFilter === 'global' ? 'Giá chuẩn toàn hệ thống' : selectedBranchName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hàng là các loại chỗ ngồi, cột là các mốc thời lượng. Ô hiển thị nhãn "Kế thừa" là giá tổng bộ; bấm "Ghi đè" để đặt giá riêng.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {selectedBranchFilter !== 'global' && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                        <span className="text-muted-foreground font-medium">Giá riêng chi nhánh</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50 inline-block" />
                        <span className="text-muted-foreground font-medium">Kế thừa Tổng bộ</span>
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="text-muted-foreground font-medium">Chưa có giá</span>
                  </span>
                </div>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                      <th className="px-6 py-4 w-72">Loại không gian</th>
                      <th className="px-4 py-4 text-center">1 Giờ (Hour)</th>
                      <th className="px-4 py-4 text-center">1 Ngày (Day)</th>
                      <th className="px-4 py-4 text-center">1 Tuần (Week)</th>
                      <th className="px-4 py-4 text-center">1 Tháng (Month)</th>
                      <th className="px-6 py-4 text-right">Thao tác nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`skel-matrix-${i}`}>
                          <td className="px-6 py-5"><Skeleton className="h-5 w-44" /></td>
                          <td className="px-4 py-5"><Skeleton className="h-16 w-32 mx-auto rounded-xl" /></td>
                          <td className="px-4 py-5"><Skeleton className="h-16 w-32 mx-auto rounded-xl" /></td>
                          <td className="px-4 py-5"><Skeleton className="h-16 w-32 mx-auto rounded-xl" /></td>
                          <td className="px-4 py-5"><Skeleton className="h-16 w-32 mx-auto rounded-xl" /></td>
                          <td className="px-6 py-5 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>
                        </tr>
                      ))
                    ) : workspaceTypes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-muted-foreground">
                          Chưa có loại không gian nào trong hệ thống.
                        </td>
                      </tr>
                    ) : (
                      workspaceTypes.map((wt) => {
                        const missingUnits = DURATION_UNITS.filter(u => {
                          const cell = getPolicyCell(wt.id, u);
                          return cell.type === 'missing' || !cell.policy;
                        });

                        return (
                          <tr key={wt.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-5 align-middle">
                              <div className="font-bold text-foreground text-sm">{wt.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {wt.code}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Sức chứa: {wt.capacityDefault || 1} người
                                </span>
                              </div>
                            </td>

                            {DURATION_UNITS.map((unit) => {
                              const cell = getPolicyCell(wt.id, unit);

                              if (selectedBranchFilter === 'global') {
                                if (cell.policy) {
                                  const p = cell.policy;
                                  return (
                                    <td key={unit} className="px-3 py-4 text-center align-middle">
                                      <div className="bg-card border border-border/80 hover:border-primary/50 rounded-xl p-3 shadow-xs hover:shadow-sm transition-all group relative">
                                        <div className="font-bold text-foreground text-sm">{formatVND(p.price)}</div>
                                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                                          <span className="text-[10px] text-muted-foreground font-medium">{p.isActive ? 'Áp dụng' : 'Tắt'}</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1 mt-2 border-t border-border/60 pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => openEdit(p)} className="text-xs text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted" title="Sửa"><FiEdit2 className="h-3 w-3" /></button>
                                          <button onClick={() => deleteWorkspacePolicy(p.id)} className="text-xs text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10" title="Xóa"><FiTrash2 className="h-3 w-3" /></button>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                } else {
                                  return (
                                    <td key={unit} className="px-3 py-4 text-center align-middle">
                                      <div className="border border-dashed border-border rounded-xl p-3 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center min-h-[90px]">
                                        <span className="text-[11px] text-muted-foreground font-medium mb-1.5">Chưa có giá</span>
                                        <button onClick={() => openAdd({ typeId: wt.id, unit, branchId: '' })} className="btn btn-outline btn-sm !h-7 !text-[11px] !px-2.5 flex items-center gap-1">
                                          <FiPlus className="h-3 w-3" /> Đặt giá
                                        </button>
                                      </div>
                                    </td>
                                  );
                                }
                              }

                              if (cell.type === 'branch_override') {
                                const p = cell.policy!;
                                return (
                                  <td key={unit} className="px-3 py-4 text-center align-middle">
                                    <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-3 shadow-sm transition-all group">
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mb-1">
                                        <FiZap className="h-2.5 w-2.5" /> GIÁ RIÊNG
                                      </div>
                                      <div className="font-bold text-primary text-sm">{formatVND(p.price)}</div>
                                      <div className="flex items-center justify-center gap-1 mt-2 border-t border-primary/20 pt-1.5">
                                        <button onClick={() => openEdit(p)} className="text-xs text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10" title="Sửa"><FiEdit2 className="h-3 w-3" /></button>
                                        <button onClick={() => deleteWorkspacePolicy(p.id, 'Hủy mức giá riêng của chi nhánh để quay lại kế thừa giá tổng bộ?')} className="text-xs text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10" title="Hủy giá riêng"><FiTrash2 className="h-3 w-3" /></button>
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              if (cell.type === 'inherited') {
                                const p = cell.policy!;
                                return (
                                  <td key={unit} className="px-3 py-4 text-center align-middle">
                                    <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs hover:border-primary/40 transition-all flex flex-col items-center justify-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium mb-1">
                                        <FiGlobe className="h-2.5 w-2.5" /> Kế thừa Tổng bộ
                                      </span>
                                      <div className="font-semibold text-foreground/80 text-sm">{formatVND(p.price)}</div>
                                      <button onClick={() => openAdd({ typeId: wt.id, unit, branchId: selectedBranchFilter, price: p.price })} className="mt-2 text-[11px] text-primary hover:underline font-semibold flex items-center gap-1" title="Ghi đè giá">
                                        <FiZap className="h-3 w-3" /> Ghi đè giá
                                      </button>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={unit} className="px-3 py-4 text-center align-middle">
                                  <div className="border border-dashed border-amber-500/50 bg-amber-500/5 rounded-xl p-3 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                                      <FiAlertCircle className="h-3 w-3" /> Thiếu giá
                                    </span>
                                    <button onClick={() => openAdd({ typeId: wt.id, unit, branchId: selectedBranchFilter })} className="btn btn-outline btn-sm !h-7 !text-[11px] !px-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
                                      + Đặt giá
                                    </button>
                                  </div>
                                </td>
                              );
                            })}

                            <td className="px-6 py-5 align-middle text-right">
                              <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5" onClick={() => openPresetModal(wt)}>
                                <FiZap className="h-3.5 w-3.5 text-primary" />
                                {missingUnits.length > 0 ? `Đặt trọn bộ 4 mốc` : `Chỉnh trọn bộ`}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FiDollarSign className="h-5 w-5 text-primary" /> Danh sách chi tiết ({filteredWorkspacePolicies.length} mức giá)
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
                    {filteredWorkspacePolicies.map(pp => (
                      <tr key={pp.id} className="border-b border-border hover:bg-muted/50 transition-colors bg-card">
                        <td className="px-6 py-4 font-medium">{pp.workspaceTypeName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{durationUnitLabel[pp.durationUnit]}</td>
                        <td className="px-6 py-4">
                          {pp.branchName ? <Badge variant="info">{pp.branchName}</Badge> : <Badge variant="neutral">Toàn hệ thống</Badge>}
                        </td>
                        <td className="px-6 py-4 font-semibold text-primary">{formatVND(pp.price)}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={pp.isActive ? 'success' : 'neutral'}>{pp.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(pp)}><FiEdit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteWorkspacePolicy(pp.id)}><FiTrash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: EXTRA SERVICES PRICING & TOGGLE
         ══════════════════════════════════════════════════════════════════════ */}
      {pricingHubTab === 'services' && (
        <div className="space-y-4">
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
                            onClick={() => toggleServiceActive(svc)}
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
                            <button onClick={() => openEditService(svc)} className="btn btn-ghost btn-sm !p-1.5" title="Sửa dịch vụ"><FiEdit2 className="h-4 w-4" /></button>
                            <button onClick={() => deleteService(svc)} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-4 w-4" /></button>
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: CANCELLATION POLICIES & PENALTY RATES
         ══════════════════════════════════════════════════════════════════════ */}
      {pricingHubTab === 'cancellation' && (
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3 text-xs text-primary">
            <FiShield className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Nguyên tắc Bảo toàn Tài chính (Rule #40 & Priority Engine):</p>
              <p className="mt-0.5 text-foreground/80">
                1. <strong>Bảo đảm phương trình cân đối</strong>: Số tiền hoàn lại (`refund_amount`) + Phí phạt hủy (`penalty_amount`) luôn chính xác bằng Tổng tiền đơn hàng (`total_amount`).
              </p>
              <p className="mt-0.5 text-foreground/80">
                2. <strong>Thứ tự ưu tiên</strong>: Hệ thống so khớp quy tắc theo thứ tự `priority DESC` (Chi nhánh trước, Toàn hệ thống sau). Quy tắc đầu tiên thỏa mãn điều kiện thời gian sẽ được áp dụng.
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
                            onClick={() => toggleCancelPolicyActive(pol)}
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
                            <button onClick={() => openEditCancellation(pol)} className="btn btn-ghost btn-sm !p-1.5" title="Sửa"><FiEdit2 className="h-4 w-4" /></button>
                            <button onClick={() => deleteCancellation(pol)} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-4 w-4" /></button>
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
      )}

      {/* ── MODAL 1: ADD / EDIT SINGLE WORKSPACE PRICE ── */}
      {modal && (modal.type === 'add' || modal.type === 'edit') && (
        <Modal
          title={modal.type === 'add' ? 'Thêm mức giá chỗ ngồi' : 'Chỉnh sửa mức giá chỗ ngồi'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-3 text-sm text-red-700 dark:text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="workspace_type_id">Loại không gian <span className="text-destructive">*</span></Label>
              <select
                id="workspace_type_id"
                disabled={modal.type === 'edit'}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                value={form.workspace_type_id}
                onChange={(e) => setForm(p => ({ ...p, workspace_type_id: e.target.value }))}
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
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
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
                  placeholder="Ví dụ: 50000"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_id">Phạm vi áp dụng</Label>
              <select
                id="branch_id"
                disabled={modal.type === 'edit'}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                value={form.branch_id}
                onChange={(e) => setForm(p => ({ ...p, branch_id: e.target.value }))}
              >
                <option value="">Toàn hệ thống (Mặc định)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
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
              <Button onClick={saveWorkspacePolicy}>
                <FiCheck className="h-4 w-4 mr-2" /> Lưu mức giá
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: PRESET 4 TIERS BATCH FILL ── */}
      {modal && modal.type === 'preset' && (
        <Modal
          title={`Tạo bộ giá mẫu — ${modal.workspaceType.name}`}
          maxWidth="max-w-lg"
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary flex items-start gap-2.5">
              <FiZap className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Thiết lập tự động 4 mốc:</span> Nhập đơn giá theo giờ, hệ thống sẽ đề xuất giá Ngày (x6), Tuần (x25.5), Tháng (x92.4) với tỉ lệ chiết khấu hợp lý.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_hourly">Mức giá cơ sở theo giờ (VND)</Label>
              <Input
                id="base_hourly"
                type="number"
                step={1000}
                value={presetHourlyPrice}
                onChange={(e) => handleBaseHourlyChange(e.target.value)}
                className="font-semibold text-primary"
              />
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground block mb-3">
                Tinh chỉnh 4 mốc giá
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">1 Giờ (Hour)</label>
                  <Input type="number" step={1000} value={presetCustomPrices.hour} onChange={(e) => setPresetCustomPrices(p => ({ ...p, hour: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">1 Ngày (Day)</label>
                  <Input type="number" step={1000} value={presetCustomPrices.day} onChange={(e) => setPresetCustomPrices(p => ({ ...p, day: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">1 Tuần (Week)</label>
                  <Input type="number" step={1000} value={presetCustomPrices.week} onChange={(e) => setPresetCustomPrices(p => ({ ...p, week: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">1 Tháng (Month)</label>
                  <Input type="number" step={1000} value={presetCustomPrices.month} onChange={(e) => setPresetCustomPrices(p => ({ ...p, month: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModal(null)} disabled={isSubmittingPreset}>Hủy</Button>
              <Button onClick={() => handleSavePreset(modal.workspaceType, modal.branchId)} disabled={isSubmittingPreset} className="gap-2">
                {isSubmittingPreset ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiCheck className="h-4 w-4" />}
                Áp dụng trọn bộ 4 mốc
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: ADD / EDIT EXTRA SERVICE ── */}
      {modal && modal.type === 'service' && (
        <Modal
          title={modal.service ? 'Chỉnh sửa dịch vụ gia tăng' : 'Thêm dịch vụ gia tăng mới'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Mã dịch vụ (Code) *</Label>
              <Input
                disabled={!!modal.service}
                placeholder="VD: cafe-latte, in-mau"
                value={serviceForm.code}
                onChange={e => setServiceForm(p => ({ ...p, code: e.target.value.toLowerCase() }))}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Tên dịch vụ hiển thị *</Label>
              <Input
                placeholder="VD: Cà Phê Latte Sữa Tươi"
                value={serviceForm.name}
                onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phân loại dịch vụ</Label>
                <div className="space-y-1.5 mt-1">
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                    value={['drink', 'meal', 'printing', 'equipment', 'facility'].includes(serviceForm.serviceType) ? serviceForm.serviceType : 'other'}
                    onChange={e => {
                      setServiceForm(p => ({ ...p, serviceType: e.target.value }));
                    }}
                  >
                    <option value="drink">☕ Đồ uống (Drink)</option>
                    <option value="meal">🥐 Đồ ăn (Meal)</option>
                    <option value="printing">🖨️ In ấn (Printing)</option>
                    <option value="equipment">📽️ Thiết bị (Equipment)</option>
                    <option value="facility">🚪 Tiện ích phòng (Facility)</option>
                    <option value="other">✨ Tùy chỉnh / Phân loại khác...</option>
                  </select>
                  {!['drink', 'meal', 'printing', 'equipment', 'facility'].includes(serviceForm.serviceType) && (
                    <Input
                      placeholder="Nhập tên phân loại mới (VD: stationery, locker...)"
                      value={serviceForm.serviceType === 'other' ? '' : serviceForm.serviceType}
                      onChange={e => setServiceForm(p => ({ ...p, serviceType: e.target.value.toLowerCase().trim() || 'other' }))}
                      className="text-xs"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Đơn vị tính</Label>
                <Input
                  placeholder="VD: ly, trang, phần, giờ"
                  value={serviceForm.unit}
                  onChange={e => setServiceForm(p => ({ ...p, unit: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Giá bán (VND) *</Label>
                <Input
                  type="number"
                  step={1000}
                  value={serviceForm.price}
                  onChange={e => setServiceForm(p => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Phạm vi áp dụng</Label>
                <select
                  disabled={!!modal.service}
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                  value={serviceForm.branchId}
                  onChange={e => setServiceForm(p => ({ ...p, branchId: e.target.value }))}
                >
                  <option value="">Toàn hệ thống</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Mô tả chi tiết</Label>
              <Input
                placeholder="Ghi chú thành phần, mô tả..."
                value={serviceForm.description}
                onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="svc-active"
                checked={serviceForm.isActive}
                onChange={e => setServiceForm(p => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="svc-active" className="cursor-pointer">Mở bán dịch vụ này ngay</Label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button onClick={saveService}>
                <FiCheck className="h-4 w-4 mr-1.5" /> Lưu dịch vụ
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 4: ADD / EDIT CANCELLATION POLICY ── */}
      {modal && modal.type === 'cancellation' && (
        <Modal
          title={modal.policy ? 'Chỉnh sửa chính sách hủy' : 'Thêm chính sách hủy mới'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Tên chính sách *</Label>
              <Input
                placeholder="VD: Miễn phí hủy trong 2 giờ đầu"
                value={cancelForm.name}
                onChange={e => setCancelForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Loại quy tắc</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  value={cancelForm.ruleType}
                  onChange={e => setCancelForm(p => ({ ...p, ruleType: e.target.value }))}
                >
                  <option value="GRACE_HOURS">Giờ ân hạn sau đặt</option>
                  <option value="BEFORE_START_DAYS">Ngày trước khi nhận phòng</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Độ ưu tiên (Priority)</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={cancelForm.priority}
                  onChange={e => setCancelForm(p => ({ ...p, priority: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Giá trị Min ({cancelForm.ruleType === 'GRACE_HOURS' ? 'Giờ' : 'Ngày'})</Label>
                <Input
                  type="number"
                  value={cancelForm.minValue}
                  onChange={e => setCancelForm(p => ({ ...p, minValue: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Giá trị Max ({cancelForm.ruleType === 'GRACE_HOURS' ? 'Giờ' : 'Ngày'})</Label>
                <Input
                  type="number"
                  value={cancelForm.maxValue}
                  onChange={e => setCancelForm(p => ({ ...p, maxValue: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tỷ lệ hoàn tiền (%) *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={cancelForm.refundPercent}
                  onChange={e => setCancelForm(p => ({ ...p, refundPercent: e.target.value }))}
                  className="font-bold text-success"
                />
              </div>
              <div>
                <Label className="text-xs">Phạm vi áp dụng</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  value={cancelForm.branchId}
                  onChange={e => setCancelForm(p => ({ ...p, branchId: e.target.value }))}
                >
                  <option value="">Toàn hệ thống</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="cancel-active"
                checked={cancelForm.isActive}
                onChange={e => setCancelForm(p => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="cancel-active" className="cursor-pointer">Kích hoạt áp dụng chính sách này</Label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button onClick={saveCancellation}>
                <FiCheck className="h-4 w-4 mr-1.5" /> Lưu chính sách
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PricingPage;
