import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (typeof dialog.showModal === "function") {
        try {
          if (!dialog.open) dialog.showModal();
          return;
        } catch {
          dialog.setAttribute("open", "");
          return;
        }
      }
      dialog.setAttribute("open", "");
      return;
    }
    if (typeof dialog.close === "function") {
      try {
        if (dialog.open) dialog.close();
      } catch {
        dialog.removeAttribute("open");
        return;
      }
    }
    dialog.removeAttribute("open");
  }, [open]);
  return (
    <dialog ref={ref} className="leaf-dialog" onCancel={onCancel}>
      <div className="leaf-section-body">
        <h2 className="leaf-panel-title">{title}</h2>
        <p>{message}</p>
        <div className="leaf-toolbar">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
};
