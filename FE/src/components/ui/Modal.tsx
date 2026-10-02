import React, { useEffect, useId, useRef } from "react";
import { FiX } from "react-icons/fi";
import { cn } from "../../lib/utils";

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Width of the panel, e.g. "max-w-lg". */
  className?: string;
}

/**
 * Dialog shell shared by the management pages. Render it only while it is open
 * (`{open && <Modal …/>}`); mounting it moves focus into the dialog, locks page scroll and closes
 * on Escape or a backdrop click, and unmounting hands focus back to whatever opened it.
 */
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, className = "max-w-md" }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm motion-safe:animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-h-[90vh] flex-col rounded-2xl border border-border bg-card shadow-2xl outline-none motion-safe:animate-scale-in",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-base font-bold font-heading text-foreground text-balance">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn btn-ghost btn-sm !min-h-[32px] !p-2">
            <FiX className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>
  );
};
