import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedItems?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  affectedItems,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md border border-[#2C3B52] bg-[#111722] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#233044] pb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${
                variant === 'danger' ? 'text-[#EF4444]' : 'text-[#2DD4BF]'
              }`}
            />
            <h2
              id="confirm-modal-title"
              className="font-display text-lg font-semibold text-[#F3F4F6]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="p-1 text-[#9CA3AF] hover:bg-[#1C212B] hover:text-[#F3F4F6] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#D1D5DB]">
          {description}
        </p>

        {affectedItems && affectedItems.length > 0 && (
          <div className="mt-4 border border-[#233044] bg-[#090D14] p-3">
            <p className="text-xs font-medium text-[#9CA3AF] mb-1.5">
              Affected items ({affectedItems.length}):
            </p>
            <ul className="max-h-32 overflow-y-auto space-y-1 text-xs text-[#E5E7EB] font-mono-tabular">
              {affectedItems.map((item, idx) => (
                <li key={idx} className="truncate">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#2C3B52] bg-[#162030] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:bg-[#1F2430] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              variant === 'danger'
                ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                : 'bg-[#2DD4BF] text-[#090D14] hover:bg-[#5EEAD4]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
