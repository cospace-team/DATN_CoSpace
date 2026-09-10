import React from "react";
import { cn } from "../../lib/utils";

const sizeMap = {
  sm: "h-3.5 w-3.5 border-2",
  default: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-4",
} as const;

interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizeMap;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "default", className, ...props }) => {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent",
        sizeMap[size],
        className
      )}
      {...props}
    />
  );
};

export default Spinner;
