import React from 'react';
import { FiUsers, FiSearch, FiX, FiChevronDown, FiMessageCircle } from 'react-icons/fi';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { PartnerSuggestion } from './partnerTypes';
import ConnectionsPanel from '../../../components/network/ConnectionsPanel';
import type { MemberPreview } from '../../../components/network/MemberProfileModal';

interface ProfileNetworkTabProps {
  networkFilterMode: 'best' | 'all';
  setNetworkFilterMode: (mode: 'best' | 'all') => void;
  visiblePartnersCount: number;
  setVisiblePartnersCount: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTagFilter: string | null;
  setSelectedTagFilter: (tag: string | null) => void;
  partnersList: PartnerSuggestion[];
  sortedAndFilteredPartners: PartnerSuggestion[];
  isLoadingPartners: boolean;
  renderAvatar: (
    avatarString: string | undefined,
    name: string,
    sizeClass?: string,
    textClass?: string
  ) => React.ReactNode;
  onSelectPartner: (partner: PartnerSuggestion) => void;
  onConnect: (partner: PartnerSuggestion) => void;
  connectionsReloadKey: number;
  onOpenMember: (member: MemberPreview) => void;
  onConnectionsChanged: () => void;
}

const CONNECT_LABEL: Record<string, string> = {
  pending_outgoing: 'Đã gửi lời mời',
  pending_incoming: 'Phản hồi lời mời',
  connected: 'Đã kết nối',
};

export const ProfileNetworkTab: React.FC<ProfileNetworkTabProps> = ({
  networkFilterMode,
  setNetworkFilterMode,
  visiblePartnersCount,
  setVisiblePartnersCount,
  searchQuery,
  setSearchQuery,
  selectedTagFilter,
  setSelectedTagFilter,
  partnersList,
  sortedAndFilteredPartners,
  isLoadingPartners,
  renderAvatar,
  onSelectPartner,
  onConnect,
  connectionsReloadKey,
  onOpenMember,
  onConnectionsChanged,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <ConnectionsPanel reloadKey={connectionsReloadKey} onOpenMember={onOpenMember} onChanged={onConnectionsChanged} />

      {/* Network Header & Search / Filters */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FiUsers className="text-indigo-500" /> Mạng lưới Đối tác & Đồng nghiệp
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Thuật toán đối sánh Jaccard dựa trên kỹ năng & lĩnh vực thực tế từ Database
          </p>
        </div>

        {/* Filter Mode & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Filter Tabs: Best Matches vs All */}
          <div className="flex items-center p-1 bg-muted/60 rounded-2xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => {
                setNetworkFilterMode('best');
                setVisiblePartnersCount(6);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                networkFilterMode === 'best'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⭐ Phù hợp nhất
            </button>
            <button
              type="button"
              onClick={() => {
                setNetworkFilterMode('all');
                setVisiblePartnersCount(6);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                networkFilterMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌐 Tất cả ({partnersList.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, chuyên môn, skill..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            />
          </div>

          {selectedTagFilter && (
            <button
              type="button"
              onClick={() => setSelectedTagFilter(null)}
              className="px-3 py-2 bg-muted text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground border border-border flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Xóa lọc: {selectedTagFilter} <FiX className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Partner Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoadingPartners &&
          [...Array(4)].map((_, i) => (
            <div
              key={`partner-skeleton-${i}`}
              className="bg-card border border-border rounded-3xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-4/5 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          ))}

        {!isLoadingPartners &&
          sortedAndFilteredPartners.slice(0, visiblePartnersCount).map(partner => {
            let badgeColor =
              'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
            if (partner.matchScore >= 80) {
              badgeColor =
                'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800';
            } else if (partner.matchScore >= 60) {
              badgeColor =
                'bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800';
            }

            return (
              <div
                key={partner.id}
                className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between relative group"
              >
                {/* Top Header: Avatar & Match Score */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    {renderAvatar(partner.avatar, partner.name, 'h-14 w-14', 'text-xl')}
                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {partner.name}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        {partner.profession}
                      </p>
                      <p className="text-[11px] font-semibold text-primary/90 mt-0.5">
                        @{partner.company}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs shrink-0 ${badgeColor}`}
                  >
                    {partner.matchScore}% Match
                  </div>
                </div>

                {/* Partner Bio */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 bg-muted/30 p-3 rounded-2xl border border-border/40">
                  "{partner.bio}"
                </p>

                {/* Common Tags */}
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                    Kỹ năng tương đồng:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.commonTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTagFilter(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          selectedTagFilter === tag
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-foreground border-border/60 hover:bg-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => onSelectPartner(partner)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => onConnect(partner)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      partner.connectionState && partner.connectionState !== 'none'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <FiMessageCircle className="h-3.5 w-3.5" />
                    {CONNECT_LABEL[partner.connectionState || ''] || 'Kết nối'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Expand / View More Button */}
      {!isLoadingPartners && sortedAndFilteredPartners.length > visiblePartnersCount && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setVisiblePartnersCount(prev => prev + 6)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold text-xs transition-all shadow-xs hover:shadow cursor-pointer"
          >
            <span>
              Xem thêm đối tác khác (còn{' '}
              {sortedAndFilteredPartners.length - visiblePartnersCount} người)
            </span>
            <FiChevronDown className="h-4 w-4 text-primary" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingPartners && sortedAndFilteredPartners.length === 0 && (
        <div className="text-center py-16 bg-card rounded-3xl border border-border px-4">
          <FiUsers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-foreground">Không tìm thấy đối tác phù hợp</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {networkFilterMode === 'best'
              ? 'Chưa có đối tác nào đạt độ tương đồng trên 50%. Hãy cập nhật thêm kỹ năng ở hồ sơ của bạn hoặc chuyển sang xem tất cả thành viên.'
              : 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tag.'}
          </p>
          {networkFilterMode === 'best' && (
            <button
              type="button"
              onClick={() => setNetworkFilterMode('all')}
              className="mt-4 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
            >
              Xem tất cả thành viên trong mạng lưới
            </button>
          )}
        </div>
      )}
    </div>
  );
};
