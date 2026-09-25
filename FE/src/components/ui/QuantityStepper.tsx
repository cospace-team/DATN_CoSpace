import React from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

/** − / number / + control for how many of a service to order. */
export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 100,
  disabled = false,
  size = 'sm',
  label = 'Số lượng',
}) => {
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const text = size === 'sm' ? 'text-xs w-7' : 'text-sm w-9';
  const set = (next: number) => {
    if (disabled) return;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-card" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        className={`${box} flex items-center justify-center rounded-l-xl text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed`}
        aria-label="Giảm"
      >
        <FiMinus className="h-3.5 w-3.5" />
      </button>
      <span className={`${text} text-center font-semibold tabular-nums text-foreground`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        className={`${box} flex items-center justify-center rounded-r-xl text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed`}
        aria-label="Tăng"
      >
        <FiPlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
