// 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。
import type { PanelHeaderProps } from "./types";

export const PanelHeader = ({ kicker, title, target, status, statusTone, actions }: PanelHeaderProps) => (
  <header className="leaf-panel-header">
    <div>
      <div className="leaf-panel-kicker">{kicker}</div>
      <h1 className="leaf-panel-title">{title}</h1>
      {target ? <div className="leaf-panel-target">{target}</div> : null}
    </div>
    <div className="leaf-toolbar">
      <span className="leaf-status" data-tone={statusTone}>{status}</span>
      {actions}
    </div>
  </header>
);
