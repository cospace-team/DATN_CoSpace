import React, { useEffect, useState } from 'react';
import { useStableCallback } from '../hooks/useStableCallback';

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const secondsUntil = (deadlineMs: number) => Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));

interface HoldCountdownProps {
  /** When the hold runs out; null while there is no hold yet (shows the full duration, no ticking). */
  deadlineMs: number | null;
  /** Shown while there is no deadline yet. */
  idleSeconds?: number;
  /** Called once when the countdown reaches zero. */
  onExpire?: () => void;
  /** Class for the badge; the urgent class replaces it in the last three minutes. */
  className: string;
  urgentClassName: string;
  children: (time: string) => React.ReactNode;
}

/**
 * Live "mm:ss" hold timer. It owns the once-a-second state so only this badge re-renders each
 * tick, not the whole checkout page around it.
 */
export const HoldCountdown: React.FC<HoldCountdownProps> = ({
  deadlineMs,
  idleSeconds = 15 * 60,
  onExpire,
  className,
  urgentClassName,
  children,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => (deadlineMs == null ? idleSeconds : secondsUntil(deadlineMs)));
  const handleExpire = useStableCallback(() => onExpire?.());

  useEffect(() => {
    if (deadlineMs == null) {
      setSecondsLeft(idleSeconds);
      return;
    }
    const tick = () => {
      const remaining = secondsUntil(deadlineMs);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        handleExpire();
      }
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(timer);
  }, [deadlineMs, idleSeconds, handleExpire]);

  return (
    <div className={secondsLeft < 180 ? urgentClassName : className} role="timer" aria-live="off">
      {children(formatCountdown(secondsLeft))}
    </div>
  );
};
