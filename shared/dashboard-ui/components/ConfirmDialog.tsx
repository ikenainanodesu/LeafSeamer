import { useEffect, useId, useRef } from "react";
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
  // 使用 React 生成稳定 ID，将原生 dialog 的名称和描述绑定到对应内容。
  const titleId = useId();
  const messageId = useId();
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
    <dialog
      ref={ref}
      className="leaf-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={onCancel}
    >
      <div className="leaf-section-body">
        <h2 id={titleId} className="leaf-panel-title">{title}</h2>
        <p id={messageId}>{message}</p>
        <div className="leaf-toolbar">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
};
