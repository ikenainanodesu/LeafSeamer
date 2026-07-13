// 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。
import { useEffect, useRef, useState, type PropsWithChildren } from "react";

interface DisclosureProps extends PropsWithChildren {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  storageKey?: string;
}

export const Disclosure = ({ title, summary, defaultOpen = false, storageKey, children }: DisclosureProps) => {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const details = ref.current;
    if (!details || !storageKey) return;
    try {
      const stored = globalThis.localStorage?.getItem(storageKey);
      const initialOpen = stored === "open" ? true : stored === "closed" ? false : defaultOpen;
      details.open = initialOpen;
      setOpen(initialOpen);
    } catch {
      details.open = defaultOpen;
      setOpen(defaultOpen);
    }
  }, [defaultOpen, storageKey]);
  return (
    <details
      ref={ref}
      className="leaf-section"
      open={open}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        setOpen(nextOpen);
        if (!storageKey) return;
        try {
          globalThis.localStorage?.setItem(storageKey, nextOpen ? "open" : "closed");
        } catch {
          return;
        }
      }}
    >
      <summary className="leaf-section-header">
        <strong>{title}</strong>
        {summary ? <span className="leaf-panel-target">{summary}</span> : null}
      </summary>
      <div className="leaf-section-body">{children}</div>
    </details>
  );
};
