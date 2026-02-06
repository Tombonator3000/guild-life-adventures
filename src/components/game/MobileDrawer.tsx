import { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  title?: string;
  children: React.ReactNode;
}

export function MobileDrawer({ isOpen, onClose, side, title, children }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`
          relative flex flex-col h-full bg-parchment shadow-2xl
          w-72 max-w-[85vw]
          ${side === 'left' ? 'mr-auto border-r-2 border-wood-light' : 'ml-auto border-l-2 border-wood-light'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-b from-wood-dark to-wood border-b-2 border-wood-light flex-shrink-0">
          {title && (
            <span className="font-display text-sm text-parchment font-bold">{title}</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-parchment/80 hover:text-parchment ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
