import { useEffect, useRef } from "react";
import type { KeyboardEvent, PropsWithChildren } from "react";
import { Button } from "../_leaf-ui/components";

interface EditorDialogFrameProps extends PropsWithChildren {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}

export const EditorDialogFrame = ({
  title,
  onCancel,
  onSave,
  saveDisabled = false,
  children,
}: EditorDialogFrameProps) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const titleId = `seamer-editor-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  onCancelRef.current = onCancel;

  const getFocusableElements = (): HTMLElement[] => {
    const dialog = dialogRef.current;
    if (!dialog) return [];
    return Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    );
  };

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const [firstFocusable] = getFocusableElements();
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      requestAnimationFrame(() => {
        const previousFocus = previousFocusRef.current;
        if (previousFocus?.isConnected) {
          previousFocus.focus();
          return;
        }
        document
          .querySelector<HTMLButtonElement>(
            ".seamer-add-card, .seamer-trigger-toolbar button"
          )
          ?.focus();
      });
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelRef.current();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    const dialog = dialogRef.current;
    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;
    if (
      event.shiftKey &&
      (activeElement === firstFocusable || !dialog.contains(activeElement))
    ) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === lastFocusable || !dialog.contains(activeElement))
    ) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  return (
    <div className="seamer-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="seamer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="seamer-modal-header">
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className="seamer-modal-body">{children}</div>
        <footer className="seamer-modal-actions leaf-toolbar">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="primary" onClick={onSave} disabled={saveDisabled}>
            Save
          </Button>
        </footer>
      </section>
    </div>
  );
};
