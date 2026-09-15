import React from 'react';
import { FiX, FiMail, FiPhone, FiEyeOff, FiMessageCircle } from 'react-icons/fi';

export interface PartnerSuggestion {
  id: string;
  name: string;
  profession: string;
  company: string;
  avatar: string;
  matchScore: number;
  commonTags: string[];
  contactPublic: boolean;
  email: string;
  phone: string;
  bio: string;
  linkedin: string;
  github: string;
  [key: string]: any;
}

interface PartnerDetailsModalProps {
  partner: PartnerSuggestion | null;
  onClose: () => void;
  renderAvatar: (avatarString: string | undefined, name: string, sizeClass?: string, textClass?: string) => React.ReactNode;
  onConnect: (partner: PartnerSuggestion) => void;
}

export const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  partner,
  onClose,
  renderAvatar,
  onConnect,
}) => {
  if (!partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
      <div className="bg-card rounded-3xl max-w-lg w-full border border-border shadow-2xl overflow-hidden animate-scale-in relative">
        {/* Header Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          {/* Partner Avatar & % Match */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            {renderAvatar(
              partner.avatar,
              partner.name,
              'h-20 w-20 ring-4 ring-card',
              'text-3xl'
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-sm">
              {partner.matchScore}% Match
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-foreground">{partner.name}</h3>
            <p className="text-xs font-medium text-muted-foreground">
              {partner.profession} @{' '}
              <strong className="text-foreground">{partner.company}</strong>
            </p>
          </div>

          {/* Bio */}
          <div className="my-4 p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
            "{partner.bio}"
          </div>

          {/* Skills */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Điểm chung & Kỹ năng:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {partner.commonTags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Info if Public */}
          {partner.contactPublic ? (
            <div className="space-y-2.5 pt-3 border-t border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground">Thông tin liên hệ:</p>
              <div className="flex items-center gap-3 text-xs">
                <FiMail className="text-primary h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${partner.email}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {partner.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <FiPhone className="text-emerald-500 h-4 w-4 shrink-0" />
                <a
                  href={`tel:${partner.phone}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {partner.phone}
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-dashed border-border text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <FiEyeOff className="h-4 w-4" />
              <span>Đối tác chọn ẩn thông tin liên hệ trực tiếp</span>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => onConnect(partner)}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiMessageCircle className="h-4 w-4" /> Gửi lời chào kết nối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
