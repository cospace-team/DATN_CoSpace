import React, { useEffect, useState } from 'react';
import {
  FiX, FiMail, FiPhone, FiLinkedin, FiGithub, FiFacebook, FiGlobe, FiLock,
  FiUserPlus, FiUserCheck, FiClock, FiMapPin, FiBriefcase,
} from 'react-icons/fi';
import { connectionApi, CONNECTION_STATE_LABEL, type MemberProfile } from '../../lib/connectionApi';

/** What is already known about the member from the list, shown while the full profile loads. */
export interface MemberPreview {
  userId: string;
  name: string;
  avatar?: string | null;
  profession?: string | null;
  company?: string | null;
  matchScore?: number;
  commonTags?: string[];
  matchReason?: string | null;
}

interface Props {
  member: MemberPreview | null;
  onClose: () => void;
  /** The connection changed (sent, accepted, declined, removed); lists should refresh. */
  onChanged?: (profile: MemberProfile | null) => void;
}

const isImage = (s?: string | null) =>
  !!s && (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/') || s.startsWith('/'));

const Avatar: React.FC<{ src?: string | null; name: string }> = ({ src, name }) =>
  isImage(src) ? (
    <img src={src as string} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-card bg-muted" />
  ) : (
    <div className="h-20 w-20 rounded-2xl ring-4 ring-card bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold">
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );

const ContactRow: React.FC<{ icon: React.ReactNode; href: string; label: string }> = ({ icon, href, label }) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel="noreferrer"
    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors min-w-0"
  >
    <span className="shrink-0 text-primary">{icon}</span>
    <span className="truncate">{label}</span>
  </a>
);

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/**
 * A member's profile as the viewer may see it, with the connection flow: send a request (with a
 * note), withdraw it, accept or decline an incoming one, or remove a connection. Private contact
 * details appear once the two are connected.
 */
const MemberProfileModal: React.FC<Props> = ({ member, onClose, onChanged }) => {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setProfile(null);
    setError('');
    setMessage('');
    if (!member) return;
    let active = true;
    setLoading(true);
    connectionApi.profile(member.userId)
      .then((p) => { if (active) setProfile(p); })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [member?.userId]);

  if (!member) return null;

  const act = async (action: () => Promise<MemberProfile | void>, reloadAfter = false) => {
    setBusy(true);
    setError('');
    try {
      const result = await action();
      const next = result && !reloadAfter ? result : await connectionApi.profile(member.userId);
      setProfile(next);
      onChanged?.(next);
    } catch (e: any) {
      setError(e.message || 'Thao tác không thành công');
    } finally {
      setBusy(false);
    }
  };

  const name = profile?.name || member.name;
  const state = profile?.connectionState ?? 'none';
  const links = profile
    ? [
        profile.email && { icon: <FiMail className="h-4 w-4" />, href: `mailto:${profile.email}`, label: profile.email },
        profile.phone && { icon: <FiPhone className="h-4 w-4" />, href: `tel:${profile.phone}`, label: profile.phone },
        profile.linkedin && { icon: <FiLinkedin className="h-4 w-4" />, href: withScheme(profile.linkedin), label: 'LinkedIn' },
        profile.github && { icon: <FiGithub className="h-4 w-4" />, href: withScheme(profile.github), label: 'GitHub' },
        profile.facebook && { icon: <FiFacebook className="h-4 w-4" />, href: withScheme(profile.facebook), label: 'Facebook' },
        profile.website && { icon: <FiGlobe className="h-4 w-4" />, href: withScheme(profile.website), label: 'Website / Portfolio' },
      ].filter(Boolean) as { icon: React.ReactNode; href: string; label: string }[]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Hồ sơ ${name}`}
      >
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <Avatar src={profile?.avatarUrl || member.avatar} name={name} />
            <div className="flex flex-col items-end gap-1">
              {typeof member.matchScore === 'number' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-sm">
                  {member.matchScore}% phù hợp
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  state === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : state === 'none'
                      ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
              >
                {CONNECTION_STATE_LABEL[state]}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            {(profile?.profession || member.profession) && (
              <span className="flex items-center gap-1">
                <FiBriefcase className="h-3.5 w-3.5" />
                {profile?.profession || member.profession}
                {(profile?.company || member.company) && <> @ <strong className="text-foreground">{profile?.company || member.company}</strong></>}
              </span>
            )}
            {profile?.branchName && (
              <span className="flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" />{profile.branchName}</span>
            )}
          </p>

          {loading && <p className="mt-4 text-xs text-muted-foreground">Đang tải hồ sơ…</p>}

          {(profile?.bio || member.matchReason) && (
            <div className="my-4 p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-2">
              {profile?.bio && <p>"{profile.bio}"</p>}
              {member.matchReason && <p className="italic text-foreground/75">Vì sao nên gặp: {member.matchReason}</p>}
            </div>
          )}

          {(profile?.skills?.length || member.commonTags?.length) ? (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Kỹ năng & chuyên môn</p>
              <div className="flex flex-wrap gap-1.5">
                {(profile?.skills?.length ? profile.skills : member.commonTags || []).map((tag) => (
                  <span
                    key={tag}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                      member.commonTags?.includes(tag)
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/50 text-foreground border-border/60'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Contact */}
          <div className="pt-3 border-t border-border/60">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Thông tin liên hệ</p>
            {profile?.contactVisible ? (
              links.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {links.map((l) => <ContactRow key={l.href} {...l} />)}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Thành viên chưa cập nhật thông tin liên hệ.</p>
              )
            ) : (
              <div className="p-3 rounded-2xl bg-muted/50 border border-dashed border-border text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <FiLock className="h-4 w-4 shrink-0" />
                <span>Thông tin liên hệ sẽ hiển thị khi hai bạn đã kết nối.</span>
              </div>
            )}
          </div>

          {/* Connection actions */}
          <div className="mt-5 space-y-2">
            {profile && state === 'none' && (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder={`Lời nhắn cho ${name} (không bắt buộc)`}
                  className="input-field text-xs resize-none w-full !h-auto py-2.5"
                />
                <button
                  onClick={() => act(() => connectionApi.send(member.userId, message.trim() || undefined))}
                  disabled={busy}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <FiUserPlus className="h-4 w-4" /> Gửi lời mời kết nối
                </button>
              </>
            )}
            {profile && state === 'pending_outgoing' && profile.connectionId && (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <FiClock className="h-4 w-4" /> Đang chờ {name} phản hồi lời mời.
                </p>
                <button
                  onClick={() => act(() => connectionApi.remove(profile.connectionId as string), true)}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  Thu hồi
                </button>
              </div>
            )}
            {profile && state === 'pending_incoming' && profile.connectionId && (
              <>
                {profile.connectionMessage && (
                  <p className="text-xs text-muted-foreground italic">Lời nhắn: "{profile.connectionMessage}"</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => act(() => connectionApi.accept(profile.connectionId as string))}
                    disabled={busy}
                    className="py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FiUserCheck className="h-4 w-4" /> Chấp nhận
                  </button>
                  <button
                    onClick={() => act(() => connectionApi.decline(profile.connectionId as string))}
                    disabled={busy}
                    className="py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              </>
            )}
            {profile && state === 'connected' && profile.connectionId && (
              <button
                onClick={() => window.confirm(`Hủy kết nối với ${name}?`) && act(() => connectionApi.remove(profile.connectionId as string), true)}
                disabled={busy}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer"
              >
                Hủy kết nối
              </button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;
