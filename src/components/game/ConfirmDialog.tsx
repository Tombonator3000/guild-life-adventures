/**
 * Confirmation dialog for expensive actions (purchases > 100g, housing changes, etc.)
 */

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  cost?: number;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  cost,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative parchment-panel p-5 w-full max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0" />
            <h3 className="font-display text-lg text-card-foreground">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-card-foreground mb-3">{message}</p>

        {cost !== undefined && cost > 0 && (
          <div className="bg-destructive/10 rounded px-3 py-2 mb-3">
            <p className="text-sm text-destructive font-display">
              Cost: {cost}g
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-display text-muted-foreground hover:text-foreground border border-border rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-display gold-button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing confirmation state in components
 */
import { useState, useCallback } from 'react';

interface PendingAction {
  title: string;
  message: string;
  cost?: number;
  confirmLabel?: string;
  action: () => void;
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingAction | null>(null);

  const confirm = useCallback((opts: PendingAction) => {
    setPending(opts);
  }, []);

  const handleConfirm = useCallback(() => {
    if (pending) {
      pending.action();
      setPending(null);
    }
  }, [pending]);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  const dialog = pending ? (
    <ConfirmDialog
      title={pending.title}
      message={pending.message}
      cost={pending.cost}
      confirmLabel={pending.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
