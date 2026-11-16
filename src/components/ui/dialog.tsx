import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/helpers/classname-helper';

export function ModalDialog({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-lg',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B3322]/45 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full rounded-3xl bg-[#F7F5EE] border border-[#D7DEB0] shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto',
          maxWidthClass
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          {title ? (
            <h2 className="text-lg font-semibold text-[#2B3322]">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#FEFAE0] border border-[#D7DEB0] text-[#2B3322] inline-flex items-center justify-center hover:bg-[#E9EDC9] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
