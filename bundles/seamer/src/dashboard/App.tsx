/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useCallback } from "react";
import { SeamerCard, Preset } from "../types/seamer.types";
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
    curCardsRep.on("change", (newVal) => {
      setCards(newVal || []);
    });

    // Mixer State
    const mixerRep = nodecg.Replicant<MixerState>(
      "mixerState",
      "mixer-control"
    );
    mixerRep.on("change", (newVal) => setMixerState(newVal || null));

    // VB Matrix Presets
    const presetsRep = nodecg.Replicant<Preset[]>(
      "presets",
      "vb-matrix-control"
    );
    presetsRep.on("change", (newVal) => setPresets(newVal || []));

    // OBS Connections
    const obsConRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      "obs-control"
    );
    obsConRep.on("change", (newVal) => setObsConnections(newVal || []));

    // OBS States
    const obsStateRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      "obs-control"
    );
    obsStateRep.on("change", (newVal) => setObsStates(newVal || {}));
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
          nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
            channelId: action.channelId,
            level: action.level,
          });
          break;
        case "vb-preset":
          nodecg.sendMessageToBundle(
            "loadPreset",
            "vb-matrix-control",
            action.presetId
          );
          break;
        case "obs-transition":
          nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
            id: action.connectionId,
            transition: action.transitionName,
          });
          break;
        case "obs-scene":
          nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
            id: action.connectionId,
            scene: action.sceneName,
          });
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
      style={{ padding: 20, minHeight: "100vh", boxSizing: "border-box" }}
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
