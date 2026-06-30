/* ── Full mock data aligned with Database_dbdiagram_script ── */
import { generateBookingCode } from '../utils/formatters';

// ── Branches ──
export interface Branch {
  id: string; code: string; name: string; address: string; city: string;
  timezone: string; status: 'active' | 'inactive'; created_at: string;
}

export const branches: Branch[] = [
  { id: 'branch-0001', code: 'WH-Q1', name: 'WorkHub Quận 1', address: '123 Nguyễn Huệ, Quận 1', city: 'TP.HCM', timezone: 'Asia/Ho_Chi_Minh', status: 'active', created_at: '2026-01-01T00:00:00Z' },
  { id: 'branch-0002', code: 'WH-Q7', name: 'WorkHub Quận 7', address: '456 Nguyễn Lương Bằng, Quận 7', city: 'TP.HCM', timezone: 'Asia/Ho_Chi_Minh', status: 'active', created_at: '2026-02-01T00:00:00Z' },
  { id: 'branch-0003', code: 'WH-TD', name: 'WorkHub Thủ Đức', address: '789 Võ Văn Ngân, TP Thủ Đức', city: 'TP.HCM', timezone: 'Asia/Ho_Chi_Minh', status: 'active', created_at: '2026-03-01T00:00:00Z' },
];

// ── Floors ──
export interface Floor {
  id: string; branch_id: string; floor_no: number; name: string;
  svg_url: string; map_version: number; is_published: boolean;
}

export const floors: Floor[] = [
  { id: 'floor-0001', branch_id: 'branch-0001', floor_no: 1, name: 'Tầng 1 - Lobby & Hot Desk', svg_url: '/floorplans/q1-f1.svg', map_version: 1, is_published: true },
  { id: 'floor-0002', branch_id: 'branch-0001', floor_no: 2, name: 'Tầng 2 - Phòng họp & Private', svg_url: '/floorplans/q1-f2.svg', map_version: 1, is_published: true },
  { id: 'floor-0003', branch_id: 'branch-0001', floor_no: 3, name: 'Tầng 3 - Event & Training', svg_url: '/floorplans/q1-f3.svg', map_version: 1, is_published: true },
  { id: 'floor-0004', branch_id: 'branch-0002', floor_no: 1, name: 'Tầng 1 - Open Space', svg_url: '/floorplans/q7-f1.svg', map_version: 1, is_published: true },
  { id: 'floor-0005', branch_id: 'branch-0002', floor_no: 2, name: 'Tầng 2 - Meeting & Focus', svg_url: '/floorplans/q7-f2.svg', map_version: 1, is_published: true },
];

// ── Workspace Types ──
export interface WorkspaceType {
  id: string; code: string; name: string; capacity_default: number;
}

export const workspaceTypes: WorkspaceType[] = [
  { id: 'wst-desk', code: 'desk', name: 'Bàn làm việc', capacity_default: 1 },
  { id: 'wst-meeting', code: 'meeting_room', name: 'Phòng họp', capacity_default: 8 },
  { id: 'wst-private', code: 'private_office', name: 'Văn phòng riêng', capacity_default: 4 },
];

// ── Workspaces ──
export interface Workspace {
  id: string; floor_id: string; workspace_type_id: string; code: string;
  name: string; capacity: number; svg_element_id: string;
  status: 'active' | 'maintenance' | 'inactive';
}

export const workspaces: Workspace[] = [
  // Branch Q1 - Floor 1
  { id: 'ws-0001', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-01', name: 'Hot Desk 01', capacity: 1, svg_element_id: 'hd01', status: 'active' },
  { id: 'ws-0002', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-02', name: 'Hot Desk 02', capacity: 1, svg_element_id: 'hd02', status: 'active' },
  { id: 'ws-0003', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-03', name: 'Hot Desk 03', capacity: 1, svg_element_id: 'hd03', status: 'active' },
  { id: 'ws-0004', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-04', name: 'Hot Desk 04', capacity: 1, svg_element_id: 'hd04', status: 'active' },
  { id: 'ws-0005', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-05', name: 'Hot Desk 05', capacity: 1, svg_element_id: 'hd05', status: 'maintenance' },
  { id: 'ws-0006', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'HD-06', name: 'Hot Desk 06', capacity: 1, svg_element_id: 'hd06', status: 'active' },
  { id: 'ws-0007', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'DD-01', name: 'Dedicated Desk 01', capacity: 1, svg_element_id: 'dd01', status: 'active' },
  { id: 'ws-0008', floor_id: 'floor-0001', workspace_type_id: 'wst-desk', code: 'DD-02', name: 'Dedicated Desk 02', capacity: 1, svg_element_id: 'dd02', status: 'active' },
  // Branch Q1 - Floor 2
  { id: 'ws-0009', floor_id: 'floor-0002', workspace_type_id: 'wst-meeting', code: 'MR-01', name: 'Phòng họp Lotus', capacity: 8, svg_element_id: 'mr01', status: 'active' },
  { id: 'ws-0010', floor_id: 'floor-0002', workspace_type_id: 'wst-meeting', code: 'MR-02', name: 'Phòng họp Orchid', capacity: 12, svg_element_id: 'mr02', status: 'active' },
  { id: 'ws-0011', floor_id: 'floor-0002', workspace_type_id: 'wst-private', code: 'PO-01', name: 'Văn phòng Bamboo', capacity: 4, svg_element_id: 'po01', status: 'active' },
  { id: 'ws-0012', floor_id: 'floor-0002', workspace_type_id: 'wst-private', code: 'PO-02', name: 'Văn phòng Jasmine', capacity: 6, svg_element_id: 'po02', status: 'active' },
  // Branch Q1 - Floor 3
  { id: 'ws-0013', floor_id: 'floor-0003', workspace_type_id: 'wst-meeting', code: 'EV-01', name: 'Hội trường Saigon', capacity: 30, svg_element_id: 'ev01', status: 'active' },
  // Branch Q7
  { id: 'ws-0014', floor_id: 'floor-0004', workspace_type_id: 'wst-desk', code: 'HD-01', name: 'Hot Desk A1', capacity: 1, svg_element_id: 'hda1', status: 'active' },
  { id: 'ws-0015', floor_id: 'floor-0004', workspace_type_id: 'wst-desk', code: 'HD-02', name: 'Hot Desk A2', capacity: 1, svg_element_id: 'hda2', status: 'active' },
  { id: 'ws-0016', floor_id: 'floor-0005', workspace_type_id: 'wst-meeting', code: 'MR-01', name: 'Phòng họp River', capacity: 10, svg_element_id: 'mrr1', status: 'active' },
];

// ── Users ──
export interface User {
  id: string; email: string; full_name: string; phone: string;
  avatar_url: string; status: 'active' | 'suspended';
  role: 'admin' | 'staff' | 'customer'; branch_id: string | null;
  membership_tier: 'standard' | 'premium'; created_at: string;
}

export const users: User[] = [
  { id: 'user-0001', email: 'linh.nguyen@example.com', full_name: 'Linh Nguyễn', phone: '0901234567', avatar_url: '', status: 'active', role: 'customer', branch_id: null, membership_tier: 'premium', created_at: '2026-01-15T00:00:00Z' },
  { id: 'user-0002', email: 'anh.tran@example.com', full_name: 'Anh Trần', phone: '0912345678', avatar_url: '', status: 'active', role: 'customer', branch_id: null, membership_tier: 'standard', created_at: '2026-02-01T00:00:00Z' },
  { id: 'user-0003', email: 'bao.pham@example.com', full_name: 'Bảo Phạm', phone: '0923456789', avatar_url: '', status: 'active', role: 'staff', branch_id: 'branch-0001', membership_tier: 'standard', created_at: '2026-01-01T00:00:00Z' },
  { id: 'user-0004', email: 'admin@workhub.vn', full_name: 'Admin WorkHub', phone: '0934567890', avatar_url: '', status: 'active', role: 'admin', branch_id: null, membership_tier: 'standard', created_at: '2025-12-01T00:00:00Z' },
  { id: 'user-0005', email: 'mai.le@example.com', full_name: 'Mai Lê', phone: '0945678901', avatar_url: '', status: 'active', role: 'customer', branch_id: null, membership_tier: 'standard', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-0006', email: 'duc.vo@example.com', full_name: 'Đức Võ', phone: '0956789012', avatar_url: '', status: 'active', role: 'staff', branch_id: 'branch-0002', membership_tier: 'standard', created_at: '2026-02-01T00:00:00Z' },
  { id: 'user-0007', email: 'hoa.dang@example.com', full_name: 'Hoa Đặng', phone: '0967890123', avatar_url: '', status: 'suspended', role: 'customer', branch_id: null, membership_tier: 'standard', created_at: '2026-01-20T00:00:00Z' },
];

// ── Profiles ──
export interface Profile {
  user_id: string; bio: string; profession: string; company: string;
  contact_email: string; contact_phone: string; contact_link: string;
  contact_public: boolean; primary_branch_id: string | null;
}

export const profiles: Profile[] = [
  { user_id: 'user-0001', bio: 'Backend engineer & startup mentor', profession: 'Kỹ sư phần mềm', company: 'TechVN', contact_email: 'linh@techvn.com', contact_phone: '0901234567', contact_link: 'https://linkedin.com/in/linh', contact_public: true, primary_branch_id: 'branch-0001' },
  { user_id: 'user-0002', bio: 'Product designer chuyên UX/UI', profession: 'Product Designer', company: 'DesignCo', contact_email: 'anh@designco.com', contact_phone: '0912345678', contact_link: '', contact_public: true, primary_branch_id: 'branch-0001' },
  { user_id: 'user-0005', bio: 'Marketing specialist tập trung digital', profession: 'Digital Marketing', company: 'MarketPro', contact_email: 'mai@marketpro.vn', contact_phone: '0945678901', contact_link: 'https://linkedin.com/in/mai', contact_public: false, primary_branch_id: 'branch-0002' },
];

// ── Tags ──
export interface Tag { id: string; name: string; category: 'skill' | 'interest' | 'industry'; }

export const tags: Tag[] = [
  { id: 'tag-01', name: 'React', category: 'skill' },
  { id: 'tag-02', name: 'Node.js', category: 'skill' },
  { id: 'tag-03', name: 'Python', category: 'skill' },
  { id: 'tag-04', name: 'UX Design', category: 'skill' },
  { id: 'tag-05', name: 'Marketing', category: 'skill' },
  { id: 'tag-06', name: 'SaaS', category: 'industry' },
  { id: 'tag-07', name: 'Fintech', category: 'industry' },
  { id: 'tag-08', name: 'EdTech', category: 'industry' },
  { id: 'tag-09', name: 'AI/ML', category: 'interest' },
  { id: 'tag-10', name: 'Startup', category: 'interest' },
  { id: 'tag-11', name: 'Blockchain', category: 'interest' },
  { id: 'tag-12', name: 'Data Science', category: 'skill' },
];

// ── Profile Skills ──
export interface ProfileSkill { profile_user_id: string; tag_id: string; level: number; }

export const profileSkills: ProfileSkill[] = [
  { profile_user_id: 'user-0001', tag_id: 'tag-01', level: 5 },
  { profile_user_id: 'user-0001', tag_id: 'tag-02', level: 4 },
  { profile_user_id: 'user-0002', tag_id: 'tag-04', level: 5 },
  { profile_user_id: 'user-0005', tag_id: 'tag-05', level: 4 },
];

// ── Profile Interests ──
export interface ProfileInterest { profile_user_id: string; tag_id: string; priority: number; }

export const profileInterests: ProfileInterest[] = [
  { profile_user_id: 'user-0001', tag_id: 'tag-06', priority: 5 },
  { profile_user_id: 'user-0001', tag_id: 'tag-09', priority: 4 },
  { profile_user_id: 'user-0001', tag_id: 'tag-10', priority: 5 },
  { profile_user_id: 'user-0002', tag_id: 'tag-10', priority: 5 },
  { profile_user_id: 'user-0005', tag_id: 'tag-07', priority: 3 },
];

// ── Match Scores ──
export interface MatchScore {
  profile_user_id: string; matched_user_id: string; score: number;
  reasons_json: string[]; computed_at: string;
}

export const matchScores: MatchScore[] = [
  { profile_user_id: 'user-0001', matched_user_id: 'user-0002', score: 0.85, reasons_json: ['Cùng quan tâm Startup', 'Kỹ năng bổ trợ: Tech + Design', 'Cùng chi nhánh Q1'], computed_at: '2026-04-15T00:00:00Z' },
  { profile_user_id: 'user-0001', matched_user_id: 'user-0005', score: 0.62, reasons_json: ['Cùng lĩnh vực SaaS', 'Marketing + Tech'], computed_at: '2026-04-15T00:00:00Z' },
];

// ── Price Policies ──
export interface PricePolicy {
  id: string; branch_id: string | null; workspace_type_id: string;
  duration_unit: 'hour' | 'day' | 'week' | 'month';
  price: number; currency: string; is_active: boolean;
}

export const pricePolicies: PricePolicy[] = [
  { id: 'pp-01', branch_id: null, workspace_type_id: 'wst-desk', duration_unit: 'hour', price: 50000, currency: 'VND', is_active: true },
  { id: 'pp-02', branch_id: null, workspace_type_id: 'wst-desk', duration_unit: 'day', price: 250000, currency: 'VND', is_active: true },
  { id: 'pp-03', branch_id: null, workspace_type_id: 'wst-desk', duration_unit: 'month', price: 3500000, currency: 'VND', is_active: true },
  { id: 'pp-04', branch_id: null, workspace_type_id: 'wst-meeting', duration_unit: 'hour', price: 200000, currency: 'VND', is_active: true },
  { id: 'pp-05', branch_id: null, workspace_type_id: 'wst-meeting', duration_unit: 'day', price: 1200000, currency: 'VND', is_active: true },
  { id: 'pp-06', branch_id: null, workspace_type_id: 'wst-private', duration_unit: 'day', price: 800000, currency: 'VND', is_active: true },
  { id: 'pp-07', branch_id: null, workspace_type_id: 'wst-private', duration_unit: 'month', price: 12000000, currency: 'VND', is_active: true },
  { id: 'pp-08', branch_id: 'branch-0001', workspace_type_id: 'wst-desk', duration_unit: 'hour', price: 60000, currency: 'VND', is_active: true },
];

// ── Bookings ──
export interface Booking {
  id: string; booking_code: string; user_id: string; workspace_id: string;
  branch_id: string; start_at: string; end_at: string;
  unit: 'hour' | 'day' | 'week' | 'month'; unit_count: number;
  status: 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'canceled' | 'expired';
  subtotal_amount: number; discount_amount: number; addon_amount: number;
  total_amount: number; payment_deadline_at: string | null;
  source: 'web' | 'mobile' | 'counter' | 'admin'; created_at: string;
}

const now = new Date();
const h = (offset: number) => new Date(now.getTime() + offset * 3600000).toISOString();

export const bookings: Booking[] = [
  { id: 'bk-0001', booking_code: 'WH-A3K7P2', user_id: 'user-0001', workspace_id: 'ws-0001', branch_id: 'branch-0001', start_at: h(-2), end_at: h(1), unit: 'hour', unit_count: 3, status: 'checked_in', subtotal_amount: 180000, discount_amount: 0, addon_amount: 30000, total_amount: 210000, payment_deadline_at: null, source: 'web', created_at: h(-3) },
  { id: 'bk-0002', booking_code: 'WH-B9M4T6', user_id: 'user-0001', workspace_id: 'ws-0009', branch_id: 'branch-0001', start_at: h(24), end_at: h(26), unit: 'hour', unit_count: 2, status: 'confirmed', subtotal_amount: 400000, discount_amount: 0, addon_amount: 0, total_amount: 400000, payment_deadline_at: null, source: 'web', created_at: h(-1) },
  { id: 'bk-0003', booking_code: 'WH-C2R8V5', user_id: 'user-0002', workspace_id: 'ws-0002', branch_id: 'branch-0001', start_at: h(2), end_at: h(5), unit: 'hour', unit_count: 3, status: 'pending_payment', subtotal_amount: 180000, discount_amount: 0, addon_amount: 0, total_amount: 180000, payment_deadline_at: h(0.25), source: 'web', created_at: h(0) },
  { id: 'bk-0004', booking_code: 'WH-D7N3Q1', user_id: 'user-0001', workspace_id: 'ws-0011', branch_id: 'branch-0001', start_at: h(-72), end_at: h(-70), unit: 'hour', unit_count: 2, status: 'completed', subtotal_amount: 1600000, discount_amount: 200000, addon_amount: 50000, total_amount: 1450000, payment_deadline_at: null, source: 'web', created_at: h(-96) },
  { id: 'bk-0005', booking_code: 'WH-E4L6W8', user_id: 'user-0005', workspace_id: 'ws-0003', branch_id: 'branch-0001', start_at: h(3), end_at: h(6), unit: 'hour', unit_count: 3, status: 'confirmed', subtotal_amount: 180000, discount_amount: 0, addon_amount: 15000, total_amount: 195000, payment_deadline_at: null, source: 'mobile', created_at: h(-5) },
  { id: 'bk-0006', booking_code: 'WH-F1S9X3', user_id: 'user-0002', workspace_id: 'ws-0014', branch_id: 'branch-0002', start_at: h(-48), end_at: h(-46), unit: 'hour', unit_count: 2, status: 'canceled', subtotal_amount: 100000, discount_amount: 0, addon_amount: 0, total_amount: 100000, payment_deadline_at: null, source: 'web', created_at: h(-72) },
  { id: 'bk-0007', booking_code: 'WH-G5H2Y7', user_id: 'user-0001', workspace_id: 'ws-0004', branch_id: 'branch-0001', start_at: h(48), end_at: h(50), unit: 'hour', unit_count: 2, status: 'pending_payment', subtotal_amount: 120000, discount_amount: 0, addon_amount: 0, total_amount: 120000, payment_deadline_at: h(0.2), source: 'web', created_at: h(-0.1) },
];

// ── Payments ──
export interface Payment {
  id: string; booking_id: string; provider: 'momo' | 'cash';
  method: 'ewallet' | 'qr' | 'cash'; order_id: string; amount: number;
  status: 'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded';
  paid_at: string | null; created_by_staff_id: string | null; created_at: string;
}

export const payments: Payment[] = [
  { id: 'pay-0001', booking_id: 'bk-0001', provider: 'momo', method: 'ewallet', order_id: 'MOMO-001', amount: 210000, status: 'paid', paid_at: h(-2.5), created_by_staff_id: null, created_at: h(-3) },
  { id: 'pay-0002', booking_id: 'bk-0002', provider: 'momo', method: 'qr', order_id: 'MOMO-002', amount: 400000, status: 'paid', paid_at: h(-0.5), created_by_staff_id: null, created_at: h(-1) },
  { id: 'pay-0003', booking_id: 'bk-0003', provider: 'momo', method: 'ewallet', order_id: 'MOMO-003', amount: 180000, status: 'pending', paid_at: null, created_by_staff_id: null, created_at: h(0) },
  { id: 'pay-0004', booking_id: 'bk-0004', provider: 'cash', method: 'cash', order_id: 'CASH-004', amount: 1450000, status: 'paid', paid_at: h(-71.5), created_by_staff_id: 'user-0003', created_at: h(-72) },
  { id: 'pay-0005', booking_id: 'bk-0005', provider: 'momo', method: 'ewallet', order_id: 'MOMO-005', amount: 195000, status: 'paid', paid_at: h(-4), created_by_staff_id: null, created_at: h(-5) },
  { id: 'pay-0006', booking_id: 'bk-0007', provider: 'cash', method: 'cash', order_id: 'CASH-006', amount: 120000, status: 'pending', paid_at: null, created_by_staff_id: null, created_at: h(-0.1) },
];

// ── Check-in Logs ──
export interface CheckinLog {
  id: string; booking_id: string; staff_user_id: string;
  checkin_at: string; checkout_at: string | null; note: string;
}

export const checkinLogs: CheckinLog[] = [
  { id: 'ci-0001', booking_id: 'bk-0001', staff_user_id: 'user-0003', checkin_at: h(-2), checkout_at: null, note: '' },
  { id: 'ci-0002', booking_id: 'bk-0004', staff_user_id: 'user-0003', checkin_at: h(-72), checkout_at: h(-70), note: 'Hoàn thành đúng giờ' },
];

// ── Extra Services ──
export interface ExtraService {
  id: string; code: string; name: string;
  service_type: 'drink' | 'meal' | 'printing' | 'other';
  unit: string; price: number; is_active: boolean;
}

export const extraServices: ExtraService[] = [
  { id: 'es-01', code: 'COFFEE', name: 'Cà phê đặc biệt', service_type: 'drink', unit: 'ly', price: 35000, is_active: true },
  { id: 'es-02', code: 'TEA', name: 'Trà sen', service_type: 'drink', unit: 'ly', price: 25000, is_active: true },
  { id: 'es-03', code: 'LUNCH', name: 'Cơm trưa văn phòng', service_type: 'meal', unit: 'phần', price: 55000, is_active: true },
  { id: 'es-04', code: 'PRINT_BW', name: 'In trắng đen', service_type: 'printing', unit: 'trang', price: 500, is_active: true },
  { id: 'es-05', code: 'PRINT_COLOR', name: 'In màu', service_type: 'printing', unit: 'trang', price: 2000, is_active: true },
  { id: 'es-06', code: 'LOCKER', name: 'Tủ khóa cá nhân', service_type: 'other', unit: 'ngày', price: 20000, is_active: true },
  { id: 'es-07', code: 'SMOOTHIE', name: 'Sinh tố trái cây', service_type: 'drink', unit: 'ly', price: 40000, is_active: false },
];

// ── Booking Services ──
export interface BookingService {
  id: string; booking_id: string; extra_service_id: string;
  quantity: number; unit_price: number; line_total: number;
}

export const bookingServices: BookingService[] = [
  { id: 'bs-01', booking_id: 'bk-0001', extra_service_id: 'es-01', quantity: 1, unit_price: 35000, line_total: 35000 },
  { id: 'bs-02', booking_id: 'bk-0004', extra_service_id: 'es-03', quantity: 1, unit_price: 50000, line_total: 50000 },
  { id: 'bs-03', booking_id: 'bk-0005', extra_service_id: 'es-02', quantity: 1, unit_price: 25000, line_total: 25000 },
];

// ── Cancellation Policies ──
export interface CancellationPolicy {
  id: string; name: string; rule_type: 'GRACE_HOURS' | 'BEFORE_START_DAYS';
  min_value: number; max_value: number; refund_percent: number;
  is_active: boolean; branch_id: string | null; workspace_type_id: string | null;
}

export const cancellationPolicies: CancellationPolicy[] = [
  { id: 'cp-01', name: 'Hủy trong 1 giờ', rule_type: 'GRACE_HOURS', min_value: 0, max_value: 1, refund_percent: 100, is_active: true, branch_id: null, workspace_type_id: null },
  { id: 'cp-02', name: 'Hủy trước 2 ngày', rule_type: 'BEFORE_START_DAYS', min_value: 2, max_value: 999, refund_percent: 100, is_active: true, branch_id: null, workspace_type_id: null },
  { id: 'cp-03', name: 'Hủy trước 1 ngày', rule_type: 'BEFORE_START_DAYS', min_value: 1, max_value: 2, refund_percent: 50, is_active: true, branch_id: null, workspace_type_id: null },
  { id: 'cp-04', name: 'Hủy muộn', rule_type: 'BEFORE_START_DAYS', min_value: 0, max_value: 1, refund_percent: 0, is_active: true, branch_id: null, workspace_type_id: null },
];

// ── Booking Cancellations ──
export interface BookingCancellation {
  id: string; booking_id: string; policy_id: string;
  refund_percent: number; refund_amount: number; penalty_amount: number;
  reason: string; cancelled_by: string; cancelled_at: string;
  refund_status: 'none' | 'pending' | 'confirmed' | 'rejected';
}

export const bookingCancellations: BookingCancellation[] = [
  { id: 'bc-01', booking_id: 'bk-0006', policy_id: 'cp-02', refund_percent: 100, refund_amount: 100000, penalty_amount: 0, reason: 'Thay đổi lịch trình', cancelled_by: 'user-0002', cancelled_at: h(-60), refund_status: 'confirmed' },
];

// ── Workspace Maintenance ──
export interface WorkspaceMaintenance {
  id: string; workspace_id: string; start_at: string; end_at: string;
  reason: string; status: 'scheduled' | 'active' | 'done' | 'canceled';
  created_by: string;
}

export const workspaceMaintenances: WorkspaceMaintenance[] = [
  { id: 'wm-01', workspace_id: 'ws-0005', start_at: h(-24), end_at: h(24), reason: 'Sửa chữa ghế và bàn', status: 'active', created_by: 'user-0003' },
  { id: 'wm-02', workspace_id: 'ws-0009', start_at: h(72), end_at: h(80), reason: 'Bảo trì máy chiếu', status: 'scheduled', created_by: 'user-0003' },
];

// ── Audit Logs ──
export interface AuditLog {
  id: string; actor_user_id: string; actor_role: string;
  action: string; target_table: string; target_id: string;
  metadata: Record<string, unknown>; created_at: string;
  ip_address: string;
}

export const auditLogs: AuditLog[] = [
  { id: 'al-01', actor_user_id: 'user-0001', actor_role: 'customer', action: 'CREATE_BOOKING', target_table: 'bookings', target_id: 'bk-0001', metadata: { workspace: 'HD-01' }, created_at: h(-3), ip_address: '192.168.1.45' },
  { id: 'al-02', actor_user_id: 'user-0003', actor_role: 'staff', action: 'CHECKIN', target_table: 'checkin_logs', target_id: 'ci-0001', metadata: { booking_code: 'WH-A3K7P2' }, created_at: h(-2), ip_address: '10.0.0.12' },
  { id: 'al-03', actor_user_id: 'user-0004', actor_role: 'admin', action: 'UPDATE_PRICE', target_table: 'price_policies', target_id: 'pp-08', metadata: { old_price: 55000, new_price: 60000 }, created_at: h(-10), ip_address: '10.0.0.1' },
  { id: 'al-04', actor_user_id: 'user-0003', actor_role: 'staff', action: 'CONFIRM_PAYMENT', target_table: 'payments', target_id: 'pay-0004', metadata: { method: 'cash', amount: 1450000 }, created_at: h(-71.5), ip_address: '10.0.0.12' },
  { id: 'al-05', actor_user_id: 'user-0002', actor_role: 'customer', action: 'CANCEL_BOOKING', target_table: 'bookings', target_id: 'bk-0006', metadata: { reason: 'Thay đổi lịch trình' }, created_at: h(-60), ip_address: '203.113.152.78' },
];

// ── Helper lookup functions ──
export const getBranch = (id: string) => branches.find(b => b.id === id);
export const getFloor = (id: string) => floors.find(f => f.id === id);
export const getWorkspace = (id: string) => workspaces.find(w => w.id === id);
export const getUser = (id: string) => users.find(u => u.id === id);
export const getWorkspaceType = (id: string) => workspaceTypes.find(t => t.id === id);
export const getFloorsByBranch = (branchId: string) => floors.filter(f => f.branch_id === branchId);
export const getWorkspacesByFloor = (floorId: string) => workspaces.filter(w => w.floor_id === floorId);
export const getBookingsByUser = (userId: string) => bookings.filter(b => b.user_id === userId);
export const getBookingsByBranch = (branchId: string) => bookings.filter(b => b.branch_id === branchId);
export const getPaymentsByBooking = (bookingId: string) => payments.filter(p => p.booking_id === bookingId);
export const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);
