import React, { useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';

interface WindowProps {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({
  id,
  title,
  icon: Icon,
  isOpen,
  onClose,
  onFocus,
  zIndex = 10,
  children,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{ zIndex }}
        className="fixed bottom-16 left-4 bg-slate-900/90 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-semibold cursor-pointer hover:border-cyan-500 transition-all backdrop-blur-md"
      >
        {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onFocus}
      style={{ zIndex }}
        className={`fixed flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-xl transition-all sm:rounded-2xl ${
        isMaximized
          ? 'top-14 bottom-16 left-1 right-1 sm:left-4 sm:right-4'
          : 'top-16 bottom-[4.5rem] left-1 right-1 sm:top-20 sm:bottom-20 sm:left-6 sm:right-6 md:left-64 md:right-6'
      }`}
    >
      {/* Window Title Bar */}
      <div className="flex h-10 shrink-0 cursor-move select-none items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/80 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 truncate text-xs font-bold tracking-wide text-slate-200">
          {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
          <span className="truncate">{title}</span>
        </div>

        {/* Window Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-red-400 hover:text-red-200 hover:bg-red-900/50 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Content Body */}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-slate-950/40 p-3 sm:p-4">
        {children}
      </div>
    </div>
  );
};
