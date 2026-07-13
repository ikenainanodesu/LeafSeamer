import type { PropsWithChildren } from "react";
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
  const titleId = `seamer-editor-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="seamer-modal-backdrop" role="presentation">
      <section
        className="seamer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
