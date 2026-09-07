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
      className={`fixed transition-all flex flex-col bg-slate-900/95 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden ${
        isMaximized
          ? 'top-14 bottom-16 left-4 right-4'
          : 'top-20 left-12 right-12 bottom-20 md:left-64 md:right-12'
      }`}
    >
      {/* Window Title Bar */}
      <div className="h-10 bg-slate-950/80 border-b border-slate-800 px-4 flex items-center justify-between select-none cursor-move">
        <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-200 tracking-wide">
          {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
          <span>{title}</span>
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
      <div className="flex-1 overflow-auto p-4 bg-slate-950/40">
        {children}
      </div>
    </div>
  );
};
