import React, { useState, useEffect } from "react";
import type { AtemSwitcherInfo, AtemState } from "@shared/types/atem.types";

declare const nodecg: any;

interface AtemPanelProps {
  switchers: AtemSwitcherInfo[];
  onRemove?: () => void;
}

const AtemPanel: React.FC<AtemPanelProps> = ({ switchers, onRemove }) => {
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [state, setState] = useState<AtemState | null>(null);

  // Auto-select first if none selected and switchers available
  useEffect(() => {
    if (!selectedIp && switchers.length > 0) {
      setSelectedIp(switchers[0].ip);
    }
  }, [switchers]);

  // Track state of selected switcher
  useEffect(() => {
    if (!selectedIp) {
      setState(null);
      return;
    }

    const stateRep = nodecg.Replicant(`atem:state:${selectedIp}`);
    const updateState = (newVal: AtemState) => {
      setState(newVal);
    };

    // Load initial value
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

  const handleSourceChange = (
    type: "program" | "preview",
    sourceId: number
  ) => {
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
    nodecg.sendMessage("atem:runMacro", { ip: selectedIp, macroIndex: id });
  };

  const onDragStart = (e: React.DragEvent, sourceId: number) => {
    e.dataTransfer.setData("sourceId", sourceId.toString());
  };

  const onDrop = (e: React.DragEvent, type: "program" | "preview") => {
    const sourceId = parseInt(e.dataTransfer.getData("sourceId"));
    if (!isNaN(sourceId)) {
      handleSourceChange(type, sourceId);
    }
  };

  const filterSources = (
    sources: { [id: number]: string },
    forDropdown: boolean = false
  ) => {
    const alwaysExcluded = [
      "dir", // Keep 'dir' excluded? Assuming yes unless requested.
    ];

    // Items to exclude from the visual drag-and-drop source list, but might want in dropdowns?
    // User request: "output/webcamout drop-down box to increase optional source: pgm, pvw, recording status, streaming status, audio status"
    // So for dropdowns, we allow these. For drag-and-drop list, we probably still want to hide them to avoid clutter?
    // Let's assume for the drag-and-drop list we still hide them.
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

      // Check always excluded first
      if (alwaysExcluded.some((ex) => lowerName.includes(ex))) return false;

      if (forDropdown) {
        // For dropdowns, we generally allow everything except 'alwaysExcluded'.
        // Wait, the user specifically ASKED to ADD these.
        // Before, they were excluded. Now we stop excluding them for dropdowns.
        // Are there other things we should exclude?
        // The previous code excluded ALL of `hiddenInList` + `alwaysExcluded`.
        // Now for dropdowns, we basically allow everything provided by ATEM sources, possibly excluding 'dir'.
        return true;
      } else {
        // For the source palette (drag source), we probably still want to hide special outputs and statuses
        // to keep it clean, as they are usually destinations or internal states, not inputs you drag to PGM/PVW normally.
        // (Though you CAN route PGM to PGM... effectively no-op or feedback loop?)
        // Let's keep the filter for the list.
        return !hiddenInList.some((ex) => lowerName.includes(ex));
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!switchers.length) {
    return <div>No switchers available.</div>;
  }

  return (
    <div
      style={{
        padding: "20px",
        background: "#222",
        marginBottom: "20px",
        borderRadius: "8px",
        border: "1px solid #444",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <label style={{ color: "white" }}>Select Switcher: </label>
          <select
            value={selectedIp}
            onChange={(e) => setSelectedIp(e.target.value)}
            style={{
              padding: 5,
              background: "#333",
              color: "white",
              border: "1px solid #555",
            }}
          >
            {switchers.map((s) => (
              <option key={s.ip} value={s.ip}>
                {s.alias || s.ip} {s.connected ? "(Connected)" : "(Offline)"}
              </option>
            ))}
          </select>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              background: "#d32f2f",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Remove Page
          </button>
        )}
      </div>

      {state ? (
        <>
          <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
            {/* PVW Card */}
            <div
              style={{
                flex: 1,
                background: "#0a0",
                padding: 20,
                borderRadius: 8,
                height: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: "white",
              }}
              onDrop={(e) => onDrop(e, "preview")}
              onDragOver={onDragOver}
            >
              <h3>PREVIEW</h3>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>
                {state.sources[state.previewInput] ||
                  `Input ${state.previewInput}`}
              </div>
            </div>

            {/* Transition Control */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleCut}
                style={{
                  padding: "15px 30px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                CUT
              </button>
              <button
                onClick={handleAuto}
                style={{
                  padding: "15px 30px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                AUTO
              </button>

              {/* Auto Transition Settings */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "#444",
                  padding: 10,
                  borderRadius: 4,
                  color: "white",
                }}
              >
                <div style={{ fontSize: 12, marginBottom: 5 }}>
                  Duration (frames)
                </div>
                <input
                  type="range"
                  min="1"
                  max="125" // Approx 2.5s @ 50fps
                  value={state.transitionRate || 25}
                  onChange={(e) =>
                    handleTransitionRate(parseInt(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
                <input
                  type="number"
                  min="1"
                  max="250"
                  value={state.transitionRate || 25}
                  onChange={(e) =>
                    handleTransitionRate(parseInt(e.target.value))
                  }
                  style={{
                    width: 50,
                    marginTop: 5,
                    background: "#222",
                    color: "white",
                    border: "1px solid #555",
                    textAlign: "center",
                  }}
                />
              </div>

              {state.inTransition && (
                <div style={{ color: "white" }}>Transitioning...</div>
              )}
            </div>

            {/* PGM Card */}
            <div
              style={{
                flex: 1,
                background: "#a00",
                padding: 20,
                borderRadius: 8,
                height: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: "white",
              }}
              onDrop={(e) => onDrop(e, "program")}
              onDragOver={onDragOver}
            >
              <h3>PROGRAM</h3>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>
                {state.sources[state.programInput] ||
                  `Input ${state.programInput}`}
              </div>
            </div>
          </div>

          {/* Aux Outputs */}
          <div style={{ marginBottom: 20, color: "white" }}>
            <h3>Outputs</h3>
            <div style={{ display: "flex", gap: 20 }}>
              {/* Output (Aux 0) */}
              <div>
                <label style={{ display: "block", marginBottom: 5 }}>
                  Output
                </label>
                <select
                  value={state.aux ? state.aux[0] : 0}
                  onChange={(e) => handleAuxSource(0, parseInt(e.target.value))}
                  style={{
                    padding: 5,
                    background: "#333",
                    color: "white",
                    border: "1px solid #555",
                  }}
                >
                  <option value={0}>Select Source...</option>
                  {filterSources(state.sources, true).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Webcam Out (Aux 1) */}
              <div>
                <label style={{ display: "block", marginBottom: 5 }}>
                  Webcam Out
                </label>
                <select
                  value={state.aux ? state.aux[1] : 0}
                  onChange={(e) => handleAuxSource(1, parseInt(e.target.value))}
                  style={{
                    padding: 5,
                    background: "#333",
                    color: "white",
                    border: "1px solid #555",
                  }}
                >
                  <option value={0}>Select Source...</option>
                  {filterSources(state.sources, true).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20, color: "white" }}>
            <h3>Sources (Drag to PGM/PVW)</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {filterSources(state.sources, false).map(([id, name]) => (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => onDragStart(e, parseInt(id))}
                  onClick={() => handleSourceChange("preview", parseInt(id))} // Default click to preview
                  style={{
                    padding: "10px 20px",
                    background: "#444",
                    borderRadius: 4,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>

          <div style={{ color: "white" }}>
            <h3>Macros</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {Object.entries(state.macros).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => handleRunMacro(parseInt(id))}
                  style={{
                    padding: "10px 20px",
                    background: "#0056b3",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              ))}
              {Object.keys(state.macros).length === 0 && (
                <div>No macros found</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: "white" }}>Connecting to switcher state...</div>
      )}
    </div>
  );
};

export default AtemPanel;
