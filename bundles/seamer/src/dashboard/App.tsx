import React, { useEffect, useState, useCallback } from "react";
import {
  AtemIntegrationState,
  MixerIntegrationState,
  OBSIntegrationState,
  SeamerCard,
  SeamerIntegrations,
  VBIntegrationState,
} from "../types/seamer.types";
import { v4 as uuidv4 } from "uuid";
import Card from "./components/Card";
import EditCardModal from "./components/EditCardModal";
import TriggerPage from "./trigger/TriggerPage";

const App = () => {
  const [activeTab, setActiveTab] = useState<"workspace" | "triggers">(
    "workspace"
  );
  const [cards, setCards] = useState<SeamerCard[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCard, setCurrentCard] = useState<SeamerCard | null>(null);

  const [integrations, setIntegrations] = useState<SeamerIntegrations>({});

  useEffect(() => {
    // Seamer Cards Replicant
    const curCardsRep = nodecg.Replicant<SeamerCard[]>("seamerCards", {
      defaultValue: [],
    });
    curCardsRep.on("change", (newVal: SeamerCard[]) => {
      setCards(newVal || []);
    });

    const integrationsRep =
      nodecg.Replicant<SeamerIntegrations>("seamerIntegrations");
    integrationsRep.on("change", (newValue: SeamerIntegrations) => {
      setIntegrations(newValue || {});
    });
  }, []);

  const mixerIntegration = integrations.mixer?.state as
    | MixerIntegrationState
    | undefined;
  const vbIntegration = integrations.vb?.state as VBIntegrationState | undefined;
  const obsIntegration = integrations.obs?.state as
    | OBSIntegrationState
    | undefined;
  const atemIntegration = integrations.atem?.state as
    | AtemIntegrationState
    | undefined;
  const mixerState = mixerIntegration?.mixerState || null;
  const presets = vbIntegration?.presets || [];
  const vbDevices = vbIntegration?.devices || [];
  const obsConnections = obsIntegration?.connections || [];
  const obsStates = obsIntegration?.states || {};
  const atemSwitchers = atemIntegration?.switchers || [];
  const atemStates = atemIntegration?.states || {};

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
    nodecg.sendMessage("runSeamerCard", card);
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
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <h2 style={{ margin: 0 }}>Seamer Workspace</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setActiveTab("workspace")}
              style={{
                padding: "5px 15px",
                background: activeTab === "workspace" ? "#444" : "transparent",
                color: activeTab === "workspace" ? "#fff" : "#888",
                border: "1px solid #444",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveTab("triggers")}
              style={{
                padding: "5px 15px",
                background: activeTab === "triggers" ? "#444" : "transparent",
                color: activeTab === "triggers" ? "#fff" : "#888",
                border: "1px solid #444",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Seamer Trigger
            </button>
          </div>
        </div>

        {activeTab === "workspace" && (
          <button
            onClick={() => {
              setCurrentCard({ id: uuidv4(), title: "New Card", actions: [] });
              setIsEditing(true);
            }}
            style={{
              padding: "10px 20px",
              fontSize: "1.1em",
              cursor: "pointer",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
          >
            + Add Empty Card
          </button>
        )}
      </header>

      {activeTab === "workspace" ? (
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
      ) : (
        <TriggerPage
          mixerState={mixerState}
          obsConnections={obsConnections}
          obsStates={obsStates}
          vbDevices={vbDevices}
          atemSwitchers={atemSwitchers}
          integrations={integrations}
        />
      )}

      {isEditing && currentCard && activeTab === "workspace" && (
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
          atemSwitchers={atemSwitchers}
          atemStates={atemStates}
          integrations={integrations}
        />
      )}
    </div>
  );
};

export default App;
