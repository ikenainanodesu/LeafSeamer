// 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。
import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem } from "./types";

let nextToastId = 0;

export const ToastRegion = ({ items }: { items: ToastItem[] }) => (
  <div className="leaf-toast-region" aria-live="polite" aria-atomic="false">
    {items.map((item) => <div className="leaf-toast" data-tone={item.tone} key={item.id}>{item.message}</div>)}
  </div>
);

export const useToast = () => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Set<number>>(new Set());
  useEffect(() => () => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    timersRef.current.clear();
  }, []);
  const pushToast = useCallback((message: string, tone: ToastItem["tone"] = "danger") => {
    const id = globalThis.crypto?.randomUUID?.() ?? `leaf-toast-${nextToastId++}`;
    setItems((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      setItems((current) => current.filter((item) => item.id !== id));
    }, 5000);
    timersRef.current.add(timer);
  }, []);
  return { items, pushToast };
};
