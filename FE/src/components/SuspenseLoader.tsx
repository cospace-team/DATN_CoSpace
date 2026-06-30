import React from 'react';

export const SuspenseLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
};

export default SuspenseLoader;
