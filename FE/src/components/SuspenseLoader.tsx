import React from 'react';
import { Spinner } from './ui/Spinner';

interface SuspenseLoaderProps {
  label?: string;
  /** Use when the loader fills the whole viewport instead of a content area. */
  fullScreen?: boolean;
}

export const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({
  label = 'Đang tải dữ liệu...',
  fullScreen = false,
}) => {
  return (
    <div
      className={`flex w-full items-center justify-center ${fullScreen ? 'min-h-screen bg-background' : 'min-h-[50vh]'}`}
    >
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

export default SuspenseLoader;
