import React from 'react';
import { FiLock, FiSettings, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import { Spinner } from '../../../components/ui/Spinner';

interface ProfileSecurityTabProps {
  passwordForm: {
    oldPassword: '';
    newPassword: '';
    confirmNewPassword: '';
  } | {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  };
  setPasswordForm: React.Dispatch<
    React.SetStateAction<{
      oldPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    }>
  >;
  showOldPassword: boolean;
  setShowOldPassword: (val: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (val: boolean) => void;
  isSavingPassword: boolean;
  onPasswordChange: (e: React.FormEvent) => void;
  contactPublic: boolean;
  onToggleContactPublic: (val: boolean) => void;
}

export const ProfileSecurityTab: React.FC<ProfileSecurityTabProps> = ({
  passwordForm,
  setPasswordForm,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  isSavingPassword,
  onPasswordChange,
  contactPublic,
  onToggleContactPublic,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Password Change Form */}
      <div className="lg:col-span-2">
        <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FiLock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Đổi mật khẩu tài khoản</h2>
              <p className="text-xs text-muted-foreground">Đảm bảo tài khoản của bạn luôn được bảo vệ an toàn</p>
            </div>
          </div>

          <form onSubmit={onPasswordChange} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showOldPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showOldPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
                }
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isSavingPassword && <Spinner size="sm" />}
              {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </section>
      </div>

      {/* Privacy & Account Settings */}
      <div className="space-y-6">
        <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FiSettings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Quyền riêng tư</h2>
              <p className="text-xs text-muted-foreground">Tùy chỉnh khả năng hiển thị hồ sơ</p>
            </div>
          </div>

          {/* Public Contact Switch */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Công khai liên hệ</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Cho phép người dùng khác trong CoSpace xem email và số điện thoại của bạn.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={contactPublic}
                  onChange={e => onToggleContactPublic(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
              {contactPublic ? (
                <>
                  <FiCheckCircle className="text-emerald-500 h-3.5 w-3.5 shrink-0" />
                  <span>Thông tin liên hệ của bạn đang hiển thị</span>
                </>
              ) : (
                <>
                  <FiEyeOff className="text-amber-500 h-3.5 w-3.5 shrink-0" />
                  <span>Thông tin liên hệ của bạn đang được ẩn</span>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
