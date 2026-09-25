import React, { useEffect, useState } from 'react';
import { FiInbox, FiSend, FiUserCheck } from 'react-icons/fi';
import { connectionApi, type ConnectionItem, type ConnectionOverview } from '../../lib/connectionApi';
import type { MemberPreview } from './MemberProfileModal';

interface Props {
  /** Bump to reload after a change made elsewhere (e.g. in the profile modal). */
  reloadKey: number;
  onOpenMember: (member: MemberPreview) => void;
  onChanged: () => void;
}

type Tab = 'incoming' | 'connected' | 'outgoing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'incoming', label: 'Lời mời', icon: <FiInbox className="h-3.5 w-3.5" /> },
  { id: 'connected', label: 'Đã kết nối', icon: <FiUserCheck className="h-3.5 w-3.5" /> },
  { id: 'outgoing', label: 'Đã gửi', icon: <FiSend className="h-3.5 w-3.5" /> },
];

const initial = (name: string) => (name || 'U').charAt(0).toUpperCase();

/** Incoming requests (answer inline), existing connections and requests the member sent. */
const ConnectionsPanel: React.FC<Props> = ({ reloadKey, onOpenMember, onChanged }) => {
  const [data, setData] = useState<ConnectionOverview | null>(null);
  const [tab, setTab] = useState<Tab>('incoming');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    connectionApi.overview()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, [reloadKey]);

  const answer = async (item: ConnectionItem, accept: boolean) => {
    setBusyId(item.id);
    try {
      await (accept ? connectionApi.accept(item.id) : connectionApi.decline(item.id));
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Thao tác không thành công');
    } finally {
      setBusyId(null);
    }
  };

  const items = data ? data[tab] : [];

  return (
    <div className="bg-card rounded-3xl border border-border p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">Kết nối của bạn</h3>
        <div className="flex items-center p-1 bg-muted/60 rounded-2xl border border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                tab === t.id ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon} {t.label}
              {data && data[t.id].length > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  {data[t.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {data && items.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {tab === 'incoming' ? 'Chưa có lời mời nào.' : tab === 'connected' ? 'Bạn chưa kết nối với ai.' : 'Bạn chưa gửi lời mời nào.'}
        </p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
            <button
              type="button"
              onClick={() => onOpenMember({
                userId: item.member.userId,
                name: item.member.name,
                avatar: item.member.avatarUrl,
                profession: item.member.profession,
                company: item.member.company,
              })}
              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
            >
              {item.member.avatarUrl ? (
                <img src={item.member.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
              ) : (
                <span className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initial(item.member.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">{item.member.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {item.message ? `"${item.message}"` : item.member.profession || 'Thành viên CoSpace'}
                </span>
              </span>
            </button>
            {tab === 'incoming' && (
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => answer(item, true)}
                  className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold cursor-pointer"
                >
                  Chấp nhận
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => answer(item, false)}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-bold cursor-pointer"
                >
                  Từ chối
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConnectionsPanel;
