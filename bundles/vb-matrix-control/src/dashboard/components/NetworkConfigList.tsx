import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { NetworkConfig } from "../../types";
import { Button, ConfirmDialog, IconButton, PanelHeader } from "../_leaf-ui/components";

const NetworkConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<NetworkConfig[]>([]);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  useEffect(() => {
    const rep = nodecg.Replicant<NetworkConfig[]>("networkConfigs", {
      defaultValue: [],
    });

    // 首次加载数据
    rep.on("change", (newVal: NetworkConfig[]) => {
      if (newVal) {
        setConfigs(newVal);
      }
    });

    const hostRep = nodecg.Replicant<{ ips: string[] }>("hostInfo");
    hostRep.on("change", (val: { ips: string[] }) => {
      if (val && val.ips) setLocalIPs(val.ips);
    });
  }, []);

  const handleAdd = () => {
    const newConfig: NetworkConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Matrix ${configs.length + 1}`,
      ip: "127.0.0.1",
      port: 6980,
      streamName: "Command1",
    };
    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs); // 乐观更新
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  const handleUpdate = (id: string, updates: Partial<NetworkConfig>) => {
    const newConfigs = configs.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    setConfigs(newConfigs);
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  const handleRemove = (id: string) => {
    const newConfigs = configs.filter((c) => c.id !== id);
    setConfigs(newConfigs);
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  return (
    <div className="vb-shell vb-shell--compact">
      <PanelHeader
        kicker="VBAN Matrix"
        title="Network Configuration"
        target={localIPs.length > 0 ? localIPs.join(" · ") : "No local IPs"}
        status={`${configs.length} Configs`}
        statusTone={configs.length > 0 ? "success" : "warning"}
      />

      <div className="config-list">
        {configs.length === 0 && (
          <div className="empty-panel">No network configurations.</div>
        )}
        {configs.map((config) => (
          <NetworkConfigCard
            key={config.id}
            config={config}
            onUpdate={(updates) => handleUpdate(config.id, updates)}
            onRemove={() => setPendingRemovalId(config.id)}
          />
        ))}
      </div>

      <Button tone="primary" onClick={handleAdd}>
        <Plus size={15} aria-hidden="true" />
        Add Configuration
      </Button>

      <ConfirmDialog
        open={pendingRemovalId !== null}
        title="Remove Connection"
        message="This removes the selected Matrix connection from this NodeCG instance."
        confirmLabel="Remove Connection"
        onCancel={() => setPendingRemovalId(null)}
        onConfirm={() => {
          if (pendingRemovalId !== null) handleRemove(pendingRemovalId);
          setPendingRemovalId(null);
        }}
      />
    </div>
  );
};

const NetworkConfigCard: React.FC<{
  config: NetworkConfig;
  onUpdate: (updates: Partial<NetworkConfig>) => void;
  onRemove: () => void;
}> = ({ config, onUpdate, onRemove }) => {
  return (
    <article className="network-card">
      <IconButton
        onClick={onRemove}
        className="network-remove"
        tone="danger"
        label={`Remove connection ${config.name}`}
        icon={<Trash2 size={15} aria-hidden="true" />}
      />

      <div>
        <label className="field field--name">
          <span>Connection Name</span>
          <input
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="vb-input"
            placeholder="Connection Name"
          />
        </label>

        <div className="network-fields">
          <label className="field">
            <span>IP</span>
            <input
              type="text"
              value={config.ip}
              onChange={(e) => onUpdate({ ip: e.target.value })}
              className="vb-input"
            />
          </label>
          <label className="field">
            <span>Port</span>
            <input
              type="number"
              value={config.port}
              onChange={(e) =>
                onUpdate({ port: parseInt(e.target.value) || 0 })
              }
              className="vb-input"
            />
          </label>
          <label className="field">
            <span>Stream</span>
            <input
              type="text"
              value={config.streamName}
              onChange={(e) => onUpdate({ streamName: e.target.value })}
              className="vb-input"
            />
          </label>

          <PingTestButton configId={config.id} />
        </div>
      </div>
    </article>
  );
};

const PingTestButton: React.FC<{ configId: string }> = ({ configId }) => {
  const [flashState, setFlashState] = React.useState<
    "idle" | "success" | "error"
  >("idle");
  const [testing, setTesting] = React.useState(false);

  const runPingTest = async () => {
    if (testing) return;
    setTesting(true);

    for (let i = 0; i < 5; i++) {
      let success = false;
      try {
        // 向此连接发送 Ping。
        // 使用事务 ID 或指定消息。
        // 当前采用更简单的方式：若实现定向 Ping，则监听对应成功事件。
        // 或仅依赖全局 "pingSuccess"，但未更新前无法轻易区分连接。
        // 假定管理器会在 pingSuccess 中发送 { connectionId, version }。

        const promise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            nodecg.unlisten("pingSuccess", listener);
            reject(new Error("Timeout"));
          }, 500);

          const listener = (data: any) => {
            // 字符串数据为旧格式；对象数据则检查 connectionId。
            // 开发期为向后兼容，未发送 ID 时是否接受任意结果？
            // 计划由管理器发送 { connectionId, result }。
            if (data && data.connectionId === configId) {
              clearTimeout(timeout);
              nodecg.unlisten("pingSuccess", listener);
              resolve();
            }
          };
          nodecg.listenFor("pingSuccess", listener);
        });

        nodecg.sendMessage("ping", configId);
        await promise;
        success = true;
        setFlashState("success");
      } catch (e) {
        setFlashState("error");
      }

      await new Promise((r) => setTimeout(r, 200));
      setFlashState("idle");
      if (i < 4) await new Promise((r) => setTimeout(r, 800));
    }

    setTesting(false);
  };

  const buttonClass = `ping-button ping-button--${flashState}`;

  return (
    <button
      onClick={runPingTest}
      disabled={testing}
      className={buttonClass}
    >
      {testing
        ? flashState === "success"
          ? "OK"
          : flashState === "error"
            ? "Fail"
            : "..."
        : "Ping"}
    </button>
  );
};

export default NetworkConfigList;
