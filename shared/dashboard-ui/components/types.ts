import type { ReactNode } from "react";

export type LeafTone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface ToastItem {
  id: string;
  message: string;
  tone: Exclude<LeafTone, "primary">;
}

export interface PanelHeaderProps {
  kicker: string;
  title: string;
  target?: string;
  status: string;
  statusTone: Exclude<LeafTone, "primary">;
  actions?: ReactNode;
}
