"use client";

import { useBackHandler } from "@/lib/navigation/backButton";

/**
 * Small confirmation dialog for destructive actions (e.g. deleting).
 * Rendered above sheets (z-40). Tapping outside, "Cancelar" or the Android
 * back button cancels.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useBackHandler(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-8"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-xs rounded-3xl bg-surface-elevated p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-surface py-3 font-medium text-foreground transition-transform active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-priority-high py-3 font-medium text-white transition-transform active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
