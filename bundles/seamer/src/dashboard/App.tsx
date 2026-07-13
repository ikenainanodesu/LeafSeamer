import React, { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  AtemIntegrationState,
  MixerIntegrationState,
  OBSIntegrationState,
  SeamerCard,
  SeamerIntegrations,
  VBIntegrationState,
} from "../types/seamer.types";
import { Button, ConfirmDialog, PanelHeader } from "./_leaf-ui/components";
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
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<SeamerIntegrations>({});
  const cardDeleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addCardRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // 监听 Seamer 卡片 Replicant。
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
    // 按卡片 ID 更新或追加。
    nodecg.Replicant("seamerCards").value = cards.some((item) => item.id === card.id)
      ? cards.map((item) => (item.id === card.id ? card : item))
      : [...cards, card];
    setIsEditing(false);
    setCurrentCard(null);
  };

  const deleteCard = (id: string) => {
    nodecg.Replicant("seamerCards").value = cards.filter(
      (card) => card.id !== id
    );
  };

  const runCard = (card: SeamerCard) => {
    nodecg.sendMessage("runSeamerCard", card);
  };

  const createEmptyCard = () => {
    setCurrentCard({ id: uuidv4(), title: "New Card", actions: [] });
    setIsEditing(true);
  };

  const restoreCardDeleteFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const trigger = cardDeleteTriggerRef.current;
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }
      addCardRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);

    // 仅处理 JSON MIME 类型或 .json 扩展名文件。
    for (const file of files) {
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          // 保留现有的轻量校验和数组导入语义。
          if (json.comments || json.actions || Array.isArray(json)) {
            if (Array.isArray(json)) {
              // 数组导入行为保持为空。
            } else if (json.title && json.actions) {
              // 导入卡片始终生成新 ID，避免冲突。
              const newCard = { ...json, id: uuidv4() };
              nodecg.Replicant("seamerCards").value = [...cards, newCard];
            }
          }
        } catch (error) {
          console.error("Invalid JSON", error);
        }
      }
    }
  };

  return (
    <div
      className="seamer-app"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <PanelHeader
        kicker="Seamer"
        title={activeTab === "workspace" ? "Workspace" : "Triggers"}
        target={`${Object.keys(integrations).length} integrations`}
        status={`${cards.length} Cards`}
        statusTone="neutral"
        actions={
          activeTab === "workspace" ? (
            <span ref={addCardRef}>
              <Button tone="primary" onClick={createEmptyCard}>
                Add Card
              </Button>
            </span>
          ) : undefined
        }
      />

      <div className="seamer-tabs" role="tablist" aria-label="Seamer views">
        <button
          type="button"
          className="seamer-tab"
          role="tab"
          aria-selected={activeTab === "workspace"}
          onClick={() => setActiveTab("workspace")}
        >
          Workspace
        </button>
        <button
          type="button"
          className="seamer-tab"
          role="tab"
          aria-selected={activeTab === "triggers"}
          onClick={() => setActiveTab("triggers")}
        >
          Triggers
        </button>
      </div>

      {activeTab === "workspace" ? (
        <main className="seamer-card-grid" role="tabpanel">
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onRun={() => runCard(card)}
              onEdit={() => {
                setCurrentCard(card);
                setIsEditing(true);
              }}
              onDelete={(event) => {
                cardDeleteTriggerRef.current = event.currentTarget;
                setPendingCardId(card.id);
              }}
            />
          ))}
          {cards.length === 0 ? (
            <div className="seamer-empty-state">
              Drag JSON here or add a card.
            </div>
          ) : null}
        </main>
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

      {isEditing && currentCard && activeTab === "workspace" ? (
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
      ) : null}

      <ConfirmDialog
        open={pendingCardId !== null}
        title="Delete card"
        message="This card will be removed from the workspace."
        confirmLabel="Delete"
        onCancel={() => {
          setPendingCardId(null);
          restoreCardDeleteFocus();
        }}
        onConfirm={() => {
          const cardId = pendingCardId;
          cardDeleteTriggerRef.current = null;
          setPendingCardId(null);
          if (cardId !== null) {
            deleteCard(cardId);
          }
          requestAnimationFrame(() =>
            addCardRef.current?.querySelector<HTMLButtonElement>("button")?.focus()
          );
        }}
      />
    </div>
  );
};

export default App;
