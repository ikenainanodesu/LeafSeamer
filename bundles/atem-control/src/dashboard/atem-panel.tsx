import React, { useEffect, useState } from "react";
import type { AtemState, AtemSwitcherInfo } from "../types/atem.types";
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";
import { Button, Disclosure, ToastRegion, useToast } from "./_leaf-ui/components";

declare const nodecg: any;

interface AtemPanelProps {
  switchers: AtemSwitcherInfo[];
  onRemove?: () => void;
}

const AtemPanel: React.FC<AtemPanelProps> = ({ switchers, onRemove }) => {
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [state, setState] = useState<AtemState | null>(null);
  const { items: toasts, pushToast } = useToast();

  useEffect(() => {
    if (!selectedIp && switchers.length > 0) {
      setSelectedIp(switchers[0].ip);
    }
  }, [selectedIp, switchers]);

  useEffect(() => {
    if (!selectedIp) {
      setState(null);
      return;
    }

    const stateRep = nodecg.Replicant(`atem:state:${selectedIp}`);
    const updateState = (newVal: AtemState) => {
      setState(newVal);
    };

    nodecg.readReplicant(`atem:state:${selectedIp}`, (val: AtemState) => {
      if (val) setState(val);
    });

    stateRep.on("change", updateState);
    return () => {
      stateRep.removeListener("change", updateState);
    };
  }, [selectedIp]);

  const handleCut = () => {
    if (!selectedIp) return;
    nodecg.sendMessage("atem:cut", { ip: selectedIp });
  };

  const handleAuto = () => {
    if (!selectedIp) return;
    nodecg.sendMessage("atem:auto", { ip: selectedIp });
  };

  const handleSourceChange = (type: "program" | "preview", sourceId: number) => {
    if (!selectedIp) return;
    nodecg.sendMessage("atem:setSource", {
      ip: selectedIp,
      type,
      source: sourceId,
    });
  };

  const handleTransitionRate = (rate: number) => {
    if (!selectedIp) return;
    nodecg.sendMessage("atem:setTransitionRate", {
      ip: selectedIp,
      rate,
    });
  };

  const handleAuxSource = (auxId: number, sourceId: number) => {
    if (!selectedIp) return;
    nodecg.sendMessage("atem:setAuxSource", {
      ip: selectedIp,
      auxId,
      source: sourceId,
    });
  };

  const handleRunMacro = (id: number) => {
    if (!selectedIp) return;
    void sendAuthenticatedCommand("atem-control", "atem.runMacro", {
      ip: selectedIp,
      macroIndex: id,
    }).catch((error) =>
      pushToast(error instanceof Error ? error.message : String(error), "danger")
    );
  };

  const onDragStart = (event: React.DragEvent, sourceId: number) => {
    event.dataTransfer.setData("sourceId", sourceId.toString());
  };

  const onDrop = (event: React.DragEvent, type: "program" | "preview") => {
    const sourceId = parseInt(event.dataTransfer.getData("sourceId"));
    if (!isNaN(sourceId)) {
      handleSourceChange(type, sourceId);
    }
  };

  const filterSources = (sources: Record<number, string>, forDropdown = false) => {
    const alwaysExcluded = ["dir"];
    const hiddenInList = [
      "webcam out",
      "output",
      "mvw",
      "recording status",
      "streaming status",
      "audio status",
      "pgm",
      "pvw",
    ];

    return Object.entries(sources).filter(([_, name]) => {
      const lowerName = name.toLowerCase();
      if (alwaysExcluded.some((excluded) => lowerName.includes(excluded))) return false;
      return forDropdown || !hiddenInList.some((hidden) => lowerName.includes(hidden));
    });
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  if (!switchers.length) {
    return <div className="atem-empty-state">No switchers available.</div>;
  }

  return (
    <section className="atem-panel">
      <div className="atem-panel-toolbar">
        <label className="leaf-field">
          <span>Switcher</span>
          <select
            className="leaf-input"
            value={selectedIp}
            onChange={(event) => setSelectedIp(event.target.value)}
          >
            {switchers.map((switcher) => (
              <option key={switcher.ip} value={switcher.ip}>
                {switcher.alias || switcher.ip} {switcher.connected ? "(Connected)" : "(Offline)"}
              </option>
            ))}
          </select>
        </label>
        {onRemove ? (
          <Button tone="danger" onClick={onRemove}>
            Remove Page
          </Button>
        ) : null}
      </div>

      {state ? (
        <>
          <div className="atem-live-grid">
            <div
              className="atem-bus atem-bus--preview"
              onDrop={(event) => onDrop(event, "preview")}
              onDragOver={onDragOver}
            >
              <span>Preview</span>
              <strong>{state.sources[state.previewInput] || `Input ${state.previewInput}`}</strong>
            </div>

            <div className="atem-transition">
              <Button onClick={handleCut}>CUT</Button>
              <Button tone="primary" onClick={handleAuto}>AUTO</Button>
              <label className="leaf-field atem-transition-rate">
                <span>Duration (frames)</span>
                <input
                  type="range"
                  min="1"
                  max="125"
                  value={state.transitionRate || 25}
                  onChange={(event) => handleTransitionRate(parseInt(event.target.value))}
                />
                <input
                  className="leaf-input"
                  type="number"
                  min="1"
                  max="250"
                  value={state.transitionRate || 25}
                  onChange={(event) => handleTransitionRate(parseInt(event.target.value))}
                />
              </label>
              {state.inTransition ? <div className="atem-transitioning">Transitioning...</div> : null}
            </div>

            <div
              className="atem-bus atem-bus--program"
              onDrop={(event) => onDrop(event, "program")}
              onDragOver={onDragOver}
            >
              <span>Program</span>
              <strong>{state.sources[state.programInput] || `Input ${state.programInput}`}</strong>
            </div>
          </div>

          <Disclosure title="Outputs" defaultOpen storageKey={`atem.${selectedIp}.outputs`}>
            <div className="atem-output-grid">
              {[{ index: 0, label: "Output" }, { index: 1, label: "Webcam Out" }].map((output) => (
                <label className="leaf-field" key={output.index}>
                  <span>{output.label}</span>
                  <select
                    className="leaf-input"
                    value={state.aux ? state.aux[output.index] : 0}
                    onChange={(event) => handleAuxSource(output.index, parseInt(event.target.value))}
                  >
                    <option value={0}>Select Source</option>
                    {filterSources(state.sources, true).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Disclosure>
          <Disclosure title="Sources" summary="Drag to Program or Preview" storageKey={`atem.${selectedIp}.sources`}>
            <div className="atem-source-grid">
              {filterSources(state.sources, false).map(([id, name]) => (
                <button
                  className="leaf-button"
                  draggable
                  key={id}
                  onDragStart={(event) => onDragStart(event, parseInt(id))}
                  onClick={() => handleSourceChange("preview", parseInt(id))}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          </Disclosure>
          <Disclosure title="Macros" summary={`${Object.keys(state.macros).length} available`} storageKey={`atem.${selectedIp}.macros`}>
            <div className="atem-macro-grid">
              {Object.entries(state.macros).map(([id, name]) => (
                <Button key={id} onClick={() => handleRunMacro(parseInt(id))}>{String(name)}</Button>
              ))}
              {Object.keys(state.macros).length === 0 ? <div>No macros found.</div> : null}
            </div>
          </Disclosure>
        </>
      ) : (
        <div className="atem-empty-state">Connecting to switcher state...</div>
      )}
      <ToastRegion items={toasts} />
    </section>
  );
};

export default AtemPanel;
