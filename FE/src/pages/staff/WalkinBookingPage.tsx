import React, { useState } from 'react';
import { FiUser, FiClock, FiMapPin, FiCoffee, FiDollarSign, FiSearch, FiPlus, FiCheckCircle } from 'react-icons/fi';
import { users, workspaces, extraServices, getWorkspace, floors, workspaceMaintenances } from '../../data/mockData';
import { formatVND } from '../../utils/formatters';

const WalkinBookingPage: React.FC = () => {
  // Khu vực 1: Khách hàng
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // Khu vực 2: Thời gian & Không gian
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('10:00');
  const [selectedFloorId, setSelectedFloorId] = useState('floor-001');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');

  // Khu vực 3: Dịch vụ
  const [selectedServices, setSelectedServices] = useState<{ id: string; quantity: number }[]>([]);

  // Thanh toán
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);

  // Tìm khách hàng
  const handleSearchUser = () => {
    const found = users.find(u => u.phone === phoneSearch);
    if (found) {
      setSelectedUser(found);
      setIsNewUser(false);
    } else {
      setSelectedUser(null);
      setIsNewUser(true);
    }
  };

  // Tính tiền
  const duration = Math.max(1, parseInt(endHour) - parseInt(startHour));
  const wsPrice = selectedWorkspaceId ? 50000 : 0; // Fixed 50k/h for MVP
  const subtotal = wsPrice * duration;
  const servicesTotal = selectedServices.reduce((sum, s) => {
    const svc = extraServices.find(e => e.id === s.id);
    return sum + (svc ? svc.price * s.quantity : 0);
  }, 0);
  const total = subtotal + servicesTotal;

  const handleConfirm = () => {
    if ((!selectedUser && !newUserName) || !selectedWorkspaceId) return;
    setIsSuccess(true);
  };

  const handleReset = () => {
    setPhoneSearch(''); setSelectedUser(null); setIsNewUser(false); setNewUserName('');
    setStartHour('08:00'); setEndHour('10:00'); setSelectedWorkspaceId('');
    setSelectedServices([]); setPaymentMethod('cash'); setIsSuccess(false);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in text-center space-y-4">
        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <FiCheckCircle className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold font-heading">Tạo đặt chỗ thành công!</h1>
        <p className="text-muted-foreground text-lg">Khách hàng có thể vào vị trí {getWorkspace(selectedWorkspaceId)?.name} ngay bây giờ.</p>
        <button onClick={handleReset} className="btn btn-primary mt-6">Tạo Đơn Khác</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vận hành / Lễ tân</p>
        <h1 className="text-xl font-bold font-heading mt-1">Tạo Booking tại quầy</h1>
        <p className="text-sm text-muted-foreground mt-1">Luồng thao tác nhanh cho khách Walk-in</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-6">
        <div className="space-y-6">
          {/* Khu vực 1: Khách hàng */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 text-lg border-b border-border pb-3"><FiUser className="text-primary" /> 1. Thông tin Khách hàng</h2>
            <div className="mt-4 flex gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder="Nhập Số điện thoại tìm khách" className="input-field !pl-10" onKeyDown={e => e.key === 'Enter' && handleSearchUser()} />
              </div>
              <button onClick={handleSearchUser} className="btn btn-secondary">Kiểm tra</button>
            </div>

            {selectedUser && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 flex justify-between items-center">
                <div>
                  <p className="font-bold text-primary">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <span className="badge badge-success">Khách cũ</span>
              </div>
            )}

            {isNewUser && !selectedUser && (
              <div className="mt-4 p-4 rounded-lg bg-muted border border-border animate-slide-in-up">
                <p className="text-sm font-medium mb-3 text-warning flex items-center gap-2"><FiPlus /> Số điện thoại mới. Vui lòng nhập tên khách:</p>
                <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Họ và tên khách hàng" className="input-field" />
              </div>
            )}
          </div>

          {/* Khu vực 2: Thời gian & Bàn */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 text-lg border-b border-border pb-3"><FiClock className="text-primary" /> 2. Thời gian & Chỗ ngồi</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Giờ bắt đầu (Hôm nay)</label>
                <select value={startHour} onChange={e => setStartHour(e.target.value)} className="input-field">
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Giờ kết thúc</label>
                <select value={endHour} onChange={e => setEndHour(e.target.value)} className="input-field">
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2"><FiMapPin /> Sơ đồ Không gian</label>
                <div className="flex gap-2">
                  {floors.filter(f => f.branch_id === 'branch-0001').map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => setSelectedFloorId(f.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition ${selectedFloorId === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {workspaces.filter(w => w.floor_id === selectedFloorId).map(ws => {
                  const isMaintenance = workspaceMaintenances.some(m => m.workspace_id === ws.id && m.status === 'active');
                  const isSelected = selectedWorkspaceId === ws.id;
                  
                  let btnClass = "p-2 rounded-lg border text-center transition flex flex-col items-center justify-center min-h-[80px] ";
                  if (isMaintenance) {
                    btnClass += "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-70";
                  } else if (isSelected) {
                    btnClass += "border-primary bg-primary/10 ring-2 ring-primary text-primary";
                  } else {
                    btnClass += "border-border hover:border-primary/50 text-foreground";
                  }

                  return (
                    <button 
                      key={ws.id} 
                      disabled={isMaintenance}
                      onClick={() => setSelectedWorkspaceId(ws.id)}
                      className={btnClass}
                    >
                      <p className="font-bold text-sm">{ws.name}</p>
                      {isMaintenance ? (
                        <span className="text-[10px] font-bold mt-1 text-red-500 uppercase tracking-wider">Bảo trì</span>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-1">50k/h</p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-border"></div> Trống</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary/20 border border-primary"></div> Đang chọn</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div> Đang bảo trì</div>
              </div>
            </div>
          </div>

          {/* Khu vực 3: Dịch vụ thêm */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 text-lg border-b border-border pb-3"><FiCoffee className="text-primary" /> 3. Dịch vụ gọi thêm</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {extraServices.slice(0, 4).map(svc => {
                const selected = selectedServices.find(s => s.id === svc.id);
                return (
                  <div key={svc.id} className="p-3 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatVND(svc.price)} / {svc.unit}</p>
                    </div>
                    {selected ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedServices(prev => prev.map(s => s.id === svc.id ? { ...s, quantity: Math.max(0, s.quantity - 1) } : s).filter(s => s.quantity > 0))} className="h-6 w-6 rounded bg-muted flex items-center justify-center">-</button>
                        <span className="text-sm font-medium w-4 text-center">{selected.quantity}</span>
                        <button onClick={() => setSelectedServices(prev => prev.map(s => s.id === svc.id ? { ...s, quantity: s.quantity + 1 } : s))} className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center">+</button>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedServices([...selectedServices, { id: svc.id, quantity: 1 }])} className="btn btn-outline btn-sm py-1 px-2 text-xs">Thêm</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hóa đơn & Thanh toán */}
        <div>
          <div className="rounded-xl border border-border bg-card p-6 sticky top-6">
            <h2 className="font-bold text-lg mb-4">Tóm tắt Hóa đơn</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Thuê chỗ ({duration} giờ)</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              {selectedServices.map(s => {
                const svc = extraServices.find(e => e.id === s.id);
                if (!svc) return null;
                return (
                  <div key={s.id} className="flex justify-between text-muted-foreground">
                    <span>{svc.name} x{s.quantity}</span>
                    <span>{formatVND(svc.price * s.quantity)}</span>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-border flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span className="text-primary">{formatVND(total)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="font-medium text-sm">Hình thức thanh toán</p>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="text-primary" />
                <FiDollarSign className="text-green-500" /> <span className="font-medium">Thu Tiền Mặt</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${paymentMethod === 'momo' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} className="text-primary" />
                <div className="h-5 w-5 bg-pink-500 rounded flex items-center justify-center text-white text-[10px] font-bold">M</div> <span className="font-medium">Quét mã MoMo</span>
              </label>
            </div>

            {paymentMethod === 'momo' && (
              <div className="mb-6 p-4 border border-pink-200 bg-pink-50 rounded-xl text-center">
                <div className="bg-white p-2 rounded-lg inline-block border border-border">
                  {/* Dummy QR */}
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MoMoPaymentDummy" alt="MoMo QR" className="h-32 w-32 object-contain" />
                </div>
                <p className="text-xs text-pink-700 mt-2 font-medium">Mời khách quét mã bằng app MoMo</p>
              </div>
            )}

            <button 
              disabled={(!selectedUser && !newUserName) || !selectedWorkspaceId} 
              onClick={handleConfirm}
              className="btn btn-primary w-full h-12 text-base shadow-lg shadow-primary/25"
            >
              Xác nhận & {paymentMethod === 'cash' ? 'Thu Tiền' : 'Hoàn Tất'}
            </button>
            {((!selectedUser && !newUserName) || !selectedWorkspaceId) && (
              <p className="text-xs text-center text-destructive mt-2">Vui lòng điền khách hàng và chọn chỗ ngồi</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkinBookingPage;
