import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiAlertCircle, FiCamera, FiCheck, FiClock, FiFileText, FiPackage, FiPlus, FiRefreshCw, FiRepeat, FiUser, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { staffApi, type WorkspaceMaintenanceStatusDto } from '../../api/staffApi';
import { staffBookingActionsApi } from '../../api/staffBookingActionsApi';
import {
  NOTE_KIND_LABEL, staffOpsApi, type StaffNoteDto, type StaffNoteKind,
} from '../../api/staffOpsApi';
import { StaffReasonModal } from '../../components/staff/StaffReasonModal';
import { useToast } from '../../components/Toast';
import { formatDateTime } from '../../utils/formatters';

const KINDS: { id: StaffNoteKind; icon: React.ReactNode; hint: string; resolveLabel: string; needsResolution: boolean }[] = [
  { id: 'handover', icon: <FiRepeat className="h-4 w-4" />, hint: 'Việc cần ca sau lưu ý: khách chưa thanh toán, đồ chờ giao, máy cần kiểm tra…', resolveLabel: 'Đã nhận ca', needsResolution: false },
  { id: 'incident', icon: <FiAlertCircle className="h-4 w-4" />, hint: 'Sự cố xảy ra tại chi nhánh. Quản lý chi nhánh được báo ngay khi bạn ghi.', resolveLabel: 'Đã xử lý', needsResolution: true },
  { id: 'lost_found', icon: <FiPackage className="h-4 w-4" />, hint: 'Đồ khách bỏ quên. Ghi nơi cất giữ; khi trả khách, ghi rõ trả cho ai.', resolveLabel: 'Đã trả khách', needsResolution: true },
  { id: 'customer', icon: <FiUser className="h-4 w-4" />, hint: 'Điều cần nhớ về một khách (hay trễ giờ, cần hỗ trợ…). Hiện khi tra mã đặt chỗ của khách đó.', resolveLabel: 'Gỡ ghi chú', needsResolution: false },
];

type StatusFilter = 'open' | 'resolved' | 'all';
interface CustomerChoice { id: string; name: string; phone?: string | null }

/** The branch counter's log: handover notes, incidents, lost items and notes about customers. */
const StaffNotesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const branchId = user?.branchId || '';
  const preset = (location.state as { kind?: StaffNoteKind; customer?: CustomerChoice } | null) ?? null;

  const [kind, setKind] = useState<StaffNoteKind>(preset?.kind ?? 'handover');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [notes, setNotes] = useState<StaffNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spaces, setSpaces] = useState<WorkspaceMaintenanceStatusDto[]>([]);
  const [customers, setCustomers] = useState<CustomerChoice[]>([]);

  const [formOpen, setFormOpen] = useState(!!preset?.customer);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [customer, setCustomer] = useState<CustomerChoice | null>(preset?.customer ?? null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [resolving, setResolving] = useState<StaffNoteDto | null>(null);

  const meta = KINDS.find((k) => k.id === kind)!;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setNotes(await staffOpsApi.listNotes({ kind, status: status === 'all' ? undefined : status }));
    } catch (e) {
      setError((e as Error).message);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [kind, status]);
  useEffect(() => { void load(); }, [load]);

  // Seats for incidents, and the customers who booked here lately for notes about customers.
  useEffect(() => {
    if (!branchId) return;
    staffApi.getWorkspaceMaintenances(branchId).then(setSpaces).catch(() => setSpaces([]));
    const from = new Date(); from.setDate(from.getDate() - 14); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setDate(to.getDate() + 14);
    staffBookingActionsApi.list(branchId, from, to).then((list) => {
      const seen = new Map<string, CustomerChoice>();
      list.forEach((b) => { if (b.userId && !seen.has(b.userId)) seen.set(b.userId, { id: b.userId, name: b.customerName || 'Khách', phone: b.customerPhone }); });
      setCustomers([...seen.values()]);
    }).catch(() => setCustomers([]));
  }, [branchId]);

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 6);
  }, [customers, customerQuery]);

  const resetForm = () => {
    setTitle(''); setBody(''); setWorkspaceId(''); setCustomer(null); setCustomerQuery(''); setPhotoUrl(''); setFormError('');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      setPhotoUrl(await staffOpsApi.uploadPhoto(file));
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === 'customer' && !customer) { setFormError('Vui lòng chọn khách hàng.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await staffOpsApi.createNote({
        kind,
        title: title.trim(),
        body: body.trim() || undefined,
        customerId: kind === 'customer' ? customer!.id : undefined,
        workspaceId: kind === 'incident' && workspaceId ? workspaceId : undefined,
        photoUrl: photoUrl || undefined,
      });
      showToast('Đã lưu ghi chú', 'success');
      resetForm();
      setFormOpen(false);
      if (status === 'resolved') setStatus('open'); else await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resolveNow = async (n: StaffNoteDto, note?: string) => {
    await staffOpsApi.resolveNote(n.id, note);
    showToast(`${meta.resolveLabel}: ${n.title}`, 'success');
    await load();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sổ ghi chú</h1>
          <p className="text-sm text-muted-foreground mt-1">Giao ca, sự cố, đồ thất lạc và ghi chú về khách của chi nhánh.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn btn-secondary btn-sm"><FiRefreshCw className="h-4 w-4" /> Làm mới</button>
          <button onClick={() => setFormOpen((v) => !v)} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm ghi chú</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto" role="tablist">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${kind === k.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {k.icon} {NOTE_KIND_LABEL[k.id]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([['open', 'Đang mở'], ['resolved', 'Đã đóng'], ['all', 'Tất cả']] as [StatusFilter, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setStatus(id)} className={`btn btn-sm ${status === id ? 'btn-primary' : 'btn-secondary'}`}>{label}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">{meta.hint}</p>

      {formOpen && (
        <form onSubmit={save} className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Ghi chú mới · {NOTE_KIND_LABEL[kind]}</h2>
            <button type="button" onClick={() => { resetForm(); setFormOpen(false); }} className="btn btn-ghost btn-sm !p-1.5" aria-label="Đóng"><FiX className="h-4 w-4" /></button>
          </div>

          {kind === 'customer' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Khách hàng <span className="text-destructive">*</span></label>
              {customer ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span><strong>{customer.name}</strong>{customer.phone ? <span className="text-muted-foreground"> · {customer.phone}</span> : null}</span>
                  <button type="button" onClick={() => setCustomer(null)} className="text-xs text-primary cursor-pointer">Đổi</button>
                </div>
              ) : (
                <>
                  <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Tên hoặc SĐT khách đã đặt chỗ gần đây" className="input-field w-full text-sm" />
                  {customerMatches.length > 0 && (
                    <ul className="mt-1 rounded-xl border border-border divide-y divide-border bg-background">
                      {customerMatches.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => setCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer">
                            {c.name}{c.phone ? <span className="text-muted-foreground"> · {c.phone}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerQuery.trim() && customerMatches.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Không thấy khách nào đặt chỗ ở chi nhánh trong 2 tuần qua khớp từ khóa.</p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label htmlFor="note-title" className="text-xs font-semibold text-muted-foreground block mb-1">Tiêu đề <span className="text-destructive">*</span></label>
            <input id="note-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className="input-field w-full text-sm"
              placeholder={kind === 'lost_found' ? 'Ví da màu nâu, ốp lưng điện thoại…' : kind === 'incident' ? 'Máy lạnh rò nước, mất mạng…' : kind === 'customer' ? 'Hay đến trễ, cần hỗ trợ…' : 'Việc cần ca sau lưu ý'} />
          </div>
          <div>
            <label htmlFor="note-body" className="text-xs font-semibold text-muted-foreground block mb-1">Chi tiết</label>
            <textarea id="note-body" rows={3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} className="input-field w-full text-sm"
              placeholder={kind === 'lost_found' ? 'Nhặt ở đâu, lúc nào, đang cất ở đâu' : 'Mô tả ngắn'} />
          </div>

          {kind === 'incident' && (
            <div>
              <label htmlFor="note-ws" className="text-xs font-semibold text-muted-foreground block mb-1">Chỗ ngồi liên quan (nếu có)</label>
              <select id="note-ws" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="input-field w-full text-sm">
                <option value="">— Không gắn với chỗ nào —</option>
                {spaces.map((s) => <option key={s.workspaceId} value={s.workspaceId}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          )}

          {(kind === 'incident' || kind === 'lost_found') && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Ảnh</span>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
              {photoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={photoUrl} alt="Ảnh đính kèm" className="h-16 w-16 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => setPhotoUrl('')} className="text-xs text-destructive cursor-pointer">Bỏ ảnh</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-outline btn-sm">
                  <FiCamera className="h-4 w-4" /> {uploading ? 'Đang tải ảnh…' : 'Chụp / chọn ảnh'}
                </button>
              )}
            </div>
          )}

          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { resetForm(); setFormOpen(false); }} className="btn btn-ghost btn-sm">Hủy</button>
            <button type="submit" disabled={saving || uploading || !title.trim()} className="btn btn-primary btn-sm disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu ghi chú'}</button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-muted rounded-2xl h-16 animate-pulse" />)}</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FiFileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{status === 'open' ? 'Không có ghi chú nào đang mở.' : 'Chưa có ghi chú.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex gap-3">
                  {n.photoUrl && (
                    <a href={n.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={n.photoUrl} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                    </a>
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{n.title}</span>
                      <span className={`badge ${n.status === 'open' ? 'badge-warning' : 'badge-success'}`}>{n.status === 'open' ? 'Đang mở' : 'Đã đóng'}</span>
                    </p>
                    {n.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                      {n.customerName && <span><FiUser className="inline h-3 w-3" /> {n.customerName}{n.customerPhone ? ` · ${n.customerPhone}` : ''}</span>}
                      {n.workspaceName && <span>Chỗ: {n.workspaceName}</span>}
                      {n.bookingCode && <span className="font-mono">#{n.bookingCode}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1"><FiClock className="inline h-3 w-3" /> {n.createdByName || 'Nhân viên'} · {formatDateTime(n.createdAt)}</p>
                    {n.status === 'resolved' && (
                      <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-400">
                        {meta.resolveLabel} bởi {n.resolvedByName || 'nhân viên'}{n.resolvedAt ? ` · ${formatDateTime(n.resolvedAt)}` : ''}{n.resolutionNote ? ` — "${n.resolutionNote}"` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {n.status === 'open' && (
                  <button
                    onClick={() => (meta.needsResolution ? setResolving(n) : void resolveNow(n).catch((e: Error) => showToast(e.message, 'error')))}
                    className="btn btn-outline btn-sm shrink-0"
                  >
                    <FiCheck className="h-4 w-4" /> {meta.resolveLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {resolving && (
        <StaffReasonModal
          title={`${meta.resolveLabel} · ${resolving.title}`}
          description={kind === 'lost_found' ? 'Ghi rõ đã trả cho ai và đã đối chiếu giấy tờ gì.' : 'Ghi cách đã xử lý để ca sau và quản lý nắm được.'}
          confirmLabel={meta.resolveLabel}
          onClose={() => setResolving(null)}
          onSubmit={(text) => resolveNow(resolving, text)}
        />
      )}
    </div>
  );
};

export default StaffNotesPage;
