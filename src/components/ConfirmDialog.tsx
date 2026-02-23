"use client";

import { useEffect, useRef, useId, type RefObject } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  returnFocusRef,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const messageId = useId();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }

      if (e.key === "Tab") {
        const focusableEls = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableEls || focusableEls.length === 0) return;

        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open && returnFocusRef?.current) {
      returnFocusRef.current.focus();
    }
  }, [open, returnFocusRef]);

  if (!open) return null;

  const confirmColors =
    variant === "danger"
      ? "bg-red-500 text-white hover:bg-red-600"
      : "bg-primary text-white hover:bg-primary-dark";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-animate flex items-center justify-center z-[90]"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={messageId}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl p-6 max-w-sm mx-4 w-full shadow-xl animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p id={messageId} className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
