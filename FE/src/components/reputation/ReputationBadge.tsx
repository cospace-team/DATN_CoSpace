import React from 'react';
import { FiShield } from 'react-icons/fi';

/** Colour band of a reputation score; thresholds follow the backend defaults (50 limited, 30 blocked). */
export const reputationTone = (score: number) =>
  score >= 80
    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
    : score >= 50
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
      : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30';

interface ReputationBadgeProps {
  score: number | null | undefined;
  onClick?: () => void;
}

/** Small "Uy tín 90/100" pill; clickable when staff can open the customer's history. */
export const ReputationBadge: React.FC<ReputationBadgeProps> = ({ score, onClick }) => {
  if (score == null) return null;
  const className = `inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${reputationTone(score)}`;
  const content = (
    <>
      <FiShield className="h-3 w-3" /> Uy tín {score}/100
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} cursor-pointer hover:opacity-80`} title="Xem lịch sử điểm uy tín">
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  );
};
