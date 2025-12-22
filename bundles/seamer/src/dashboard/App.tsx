/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useCallback } from "react";
import { SeamerCard, Preset, AtemControlAction } from "../types/seamer.types";
import { v4 as uuidv4 } from "uuid";
import Card from "./components/Card";
import EditCardModal from "./components/EditCardModal";
import { MixerState } from "../../../../shared/types/mixer.types";
import {
  OBSConnectionSettings,
  OBSState,
} from "../../../../shared/types/obs.types";

const App = () => {
  const [cards, setCards] = useState<SeamerCard[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCard, setCurrentCard] = useState<SeamerCard | null>(null);

  // External Data for Selectors
  const [mixerState, setMixerState] = useState<MixerState | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [obsConnections, setObsConnections] = useState<OBSConnectionSettings[]>(
    []
  );
  const [obsStates, setObsStates] = useState<Record<string, OBSState>>({});

  useEffect(() => {
    // Seamer Cards Replicant
    const curCardsRep = nodecg.Replicant<SeamerCard[]>("seamerCards", {
      defaultValue: [],
    });
    curCardsRep.on("change", (newVal: SeamerCard[]) => {
      setCards(newVal || []);
    });

    // Mixer State
    const mixerRep = nodecg.Replicant<MixerState>(
      "mixerState",
      "mixer-control"
    );
    mixerRep.on("change", (newVal: MixerState) =>
      setMixerState(newVal || null)
    );

    // VB Matrix Presets
    const presetsRep = nodecg.Replicant<Preset[]>(
      "presets",
      "vb-matrix-control"
    );
    presetsRep.on("change", (newVal: Preset[]) => setPresets(newVal || []));

    // OBS Connections
    const obsConRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      "obs-control"
    );
    obsConRep.on("change", (newVal: OBSConnectionSettings[]) =>
      setObsConnections(newVal || [])
    );

    // OBS States
    const obsStateRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      "obs-control"
    );
    obsStateRep.on("change", (newVal: Record<string, OBSState>) =>
      setObsStates(newVal || {})
    );
  }, []);

  const saveCard = (card: SeamerCard) => {
    // Update or Add
    nodecg.Replicant("seamerCards").value = cards.some((c) => c.id === card.id)
      ? cards.map((c) => (c.id === card.id ? card : c))
      : [...cards, card];
    setIsEditing(false);
    setCurrentCard(null);
  };

  const deleteCard = (id: string) => {
    if (confirm("Delete this card?")) {
      nodecg.Replicant("seamerCards").value = cards.filter((c) => c.id !== id);
    }
  };

  const runCard = (card: SeamerCard) => {
    console.log("Running Card:", card.title);
    card.actions.forEach((action) => {
      switch (action.type) {
        case "mixer-fader":
          // Need to cast or check subFunction
          // We know it is MixerControlAction locally, but type is strictly string "mixer-fader"
          const mixerAction = action as any; // Quick cast to access new fields
          const subFunc = mixerAction.subFunction || "fader";

          if (subFunc === "fader") {
            nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
              channelId: action.channelId,
              level: action.level,
            });
          } else if (subFunc === "send") {
            if (
              mixerAction.sendInputId !== undefined &&
              mixerAction.sendOutputId !== undefined
            ) {
              const basePayload = {
                inputId: mixerAction.sendInputId,
                outputId: mixerAction.sendOutputId,
              };

              // Send Level
              if (mixerAction.sendLevel !== undefined) {
                nodecg.sendMessageToBundle(
                  "setMixerInputSendLevel",
                  "mixer-control",
                  {
                    ...basePayload,
                    level: mixerAction.sendLevel,
                  }
                );
              }

              // Send On/Off
              if (mixerAction.sendOn !== undefined) {
                nodecg.sendMessageToBundle(
                  "setMixerInputSendActive",
                  "mixer-control",
                  {
                    ...basePayload,
                    active: mixerAction.sendOn,
                  }
                );
              }

              // Send Pre/Post
              if (mixerAction.sendPre !== undefined) {
                nodecg.sendMessageToBundle(
                  "setMixerInputSendPre",
                  "mixer-control",
                  {
                    ...basePayload,
                    pre: mixerAction.sendPre,
                  }
                );
              }

              // Send Pan
              if (mixerAction.sendPan !== undefined) {
                nodecg.sendMessageToBundle(
                  "setMixerInputSendPan",
                  "mixer-control",
                  {
                    ...basePayload,
                    pan: mixerAction.sendPan,
                  }
                );
              }
            }
          }
          break;
        case "vb-preset":
          nodecg.sendMessageToBundle(
            "loadPreset",
            "vb-matrix-control",
            action.presetId
          );
          break;
        case "obs-action":
          if (action.connectionId) {
            // If transition is specified, set it first
            if (action.transitionName) {
              nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
                id: action.connectionId,
                transition: action.transitionName,
              });
            }
            // If scene is specified, set it next (after small delay or immediately?)
            // Immediate should be fine as they are separate calls.
            if (action.sceneName) {
              nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
                id: action.connectionId,
                scene: action.sceneName,
              });
            }
          }
          break;
        case "atem-action":
          const atemAction = action as AtemControlAction;
          if (!atemAction.switcherIp) return;

          if (atemAction.functionType === "macro") {
            if (atemAction.macroIndex !== undefined) {
              nodecg.sendMessageToBundle("atem:runMacro", "atem-control", {
                ip: atemAction.switcherIp,
                macroIndex: atemAction.macroIndex,
              });
            }
          } else if (atemAction.functionType === "source") {
            const ip = atemAction.switcherIp;
            const target = atemAction.target || "preview";
            const source = atemAction.sourceId;

            if (source === undefined) return;

            if (target === "output") {
              // Aux 0
              nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
                ip,
                auxId: 0,
                source,
              });
            } else if (target === "webcam") {
              // Aux 1
              nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
                ip,
                auxId: 1,
                source,
              });
            } else if (target === "preview") {
              nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
                ip,
                type: "preview",
                source,
              });
            } else if (target === "program") {
              const transition = atemAction.transition || "cut";
              if (transition === "cut") {
                nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
                  ip,
                  type: "program",
                  source,
                });
              } else {
                // Auto: Set PVW then Auto
                nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
                  ip,
                  type: "preview",
                  source,
                });
                setTimeout(() => {
                  nodecg.sendMessageToBundle("atem:auto", "atem-control", {
                    ip,
                  });
                }, 100);
              }
            }
          }
          break;
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    // Check for JSON files
    for (const file of files) {
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          // Simple validation
          if (json.comments || json.actions || Array.isArray(json)) {
            // Determine if it's a single card or array
            if (Array.isArray(json)) {
              // assume array of cards? or array of actions?
              // Let's assume user dragged a "Card JSON".
            } else if (json.title && json.actions) {
              // Standard Card
              const newCard = { ...json, id: uuidv4() }; // New ID to avoid collision
              nodecg.Replicant("seamerCards").value = [...cards, newCard];
            }
          }
        } catch (err) {
          console.error("Invalid JSON", err);
        }
      }
    }
  };

  return (
    <div
      className="seamer-app"
      style={{ padding: 20, minHeight: "auto", boxSizing: "border-box" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h2>Seamer Workspace</h2>
        <button
          onClick={() => {
            setCurrentCard({ id: uuidv4(), title: "New Card", actions: [] });
            setIsEditing(true);
          }}
          style={{ padding: "10px 20px", fontSize: "1.1em", cursor: "pointer" }}
        >
          + Add Empty Card
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 20,
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onRun={() => runCard(card)}
            onEdit={() => {
              setCurrentCard(card);
              setIsEditing(true);
            }}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
        {/* Placeholder for visual consistency if empty */}
        {cards.length === 0 && (
          <div
            style={{
              border: "2px dashed #666",
              borderRadius: 8,
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Drag JSON here or click Add
          </div>
        )}
      </div>

      {isEditing && currentCard && (
        <EditCardModal
          initialCard={currentCard}
          onSave={saveCard}
          onCancel={() => {
            setIsEditing(false);
            setCurrentCard(null);
          }}
          mixerState={mixerState}
          presets={presets}
          obsConnections={obsConnections}
          obsStates={obsStates}
        />
      )}
    </div>
  );
};

export default App;
