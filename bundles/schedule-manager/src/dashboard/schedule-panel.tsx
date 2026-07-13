import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Plus, Trash2 } from "lucide-react";
import type { PlaylistItem } from "../types/schedule.types";
import {
  Button,
  ConfirmDialog,
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./schedule-dashboard.css";

const SchedulePanel = () => {
  const [schedule, setSchedule] = useState<PlaylistItem[]>([]);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  useEffect(() => {
    const scheduleRep = nodecg.Replicant<PlaylistItem[]>("scheduleData");
    scheduleRep.on("change", (newVal: any) => {
      if (newVal) {
        setSchedule(newVal);
      }
    });
  }, []);

  const persistLocalItems = (items: PlaylistItem[]) => {
    nodecg.sendMessage(
      "replaceSchedule",
      items
        .filter((item) => item.sourceId === "local")
        .map(({ id, time, title, description, active }) => ({
          id,
          time,
          title,
          description,
          active,
        }))
    );
  };

  const toggleActive = (index: number) => {
    if (schedule[index]?.sourceId !== "local") {
      return;
    }

    const newSchedule = schedule.map((item, itemIndex) =>
      itemIndex === index ? { ...item, active: !item.active } : item
    );
    persistLocalItems(newSchedule);
  };

  const updateItem = (
    index: number,
    field: "time" | "title" | "description",
    value: string
  ) => {
    if (schedule[index]?.sourceId !== "local") {
      return;
    }

    persistLocalItems(schedule.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    persistLocalItems([
      ...schedule,
      {
        id: crypto.randomUUID(),
        sourceId: "local",
        externalId: crypto.randomUUID(),
        revision: String(Date.now()),
        time: "",
        plannedAt: null,
        title: "New item",
        description: "",
        state: "ready",
        active: true,
        metadata: {},
        triggerMappings: [],
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (schedule.find((item) => item.id === id)?.sourceId !== "local") {
      return;
    }

    persistLocalItems(schedule.filter(
      (item) => item.id !== id
    ));
  };

  const localCount = schedule.filter((item) => item.sourceId === "local").length;
  const externalCount = schedule.length - localCount;

  return (
    <div className="schedule-shell leaf-panel">
      <PanelHeader
        kicker="Schedule Manager"
        title="Schedule Items"
        target={`${localCount} local · ${externalCount} external`}
        status={`${schedule.length} Items`}
        statusTone={schedule.length > 0 ? "success" : "neutral"}
        actions={
          <Button tone="primary" onClick={addItem}>
            <Plus size={15} aria-hidden="true" />
            Add Item
          </Button>
        }
      />
      {schedule.length === 0 ? (
        <div className="schedule-empty">No schedule items yet.</div>
      ) : (
        <ul className="schedule-list">
          {schedule.map((item, index) => {
            const isLocal = item.sourceId === "local";

            return (
              <li
                key={item.id}
                className="schedule-item"
                data-active={item.active}
                data-source={isLocal ? "local" : "external"}
              >
                <div className="schedule-fields">
                  <input
                    className="leaf-input"
                    aria-label="Time"
                    value={item.time}
                    placeholder="Time"
                    disabled={!isLocal}
                    onChange={(event) =>
                      updateItem(index, "time", event.target.value)
                    }
                  />
                  <input
                    className="leaf-input"
                    aria-label="Title"
                    value={item.title}
                    placeholder="Title"
                    disabled={!isLocal}
                    onChange={(event) =>
                      updateItem(index, "title", event.target.value)
                    }
                  />
                  <input
                    className="leaf-input schedule-description"
                    aria-label="Description"
                    value={item.description}
                    placeholder="Description"
                    disabled={!isLocal}
                    onChange={(event) =>
                      updateItem(index, "description", event.target.value)
                    }
                  />
                  <div className="schedule-meta">
                    <span>Source: {item.sourceId}</span>
                    <span>State: {item.state}</span>
                  </div>
                </div>
                <div className="schedule-actions">
                  <label className="schedule-active-control">
                    <input
                      type="checkbox"
                      checked={item.active}
                      disabled={!isLocal}
                      onChange={() => toggleActive(index)}
                    />
                    <span>Active</span>
                  </label>
                  {isLocal ? (
                    <IconButton
                      tone="danger"
                      label="Delete schedule item"
                      icon={<Trash2 size={15} aria-hidden="true" />}
                      onClick={() => setPendingRemovalId(item.id)}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={pendingRemovalId !== null}
        title="Delete Schedule Item"
        message="This permanently removes the selected local schedule item."
        confirmLabel="Delete Item"
        onCancel={() => setPendingRemovalId(null)}
        onConfirm={() => {
          if (pendingRemovalId !== null) {
            removeItem(pendingRemovalId);
          }
          setPendingRemovalId(null);
        }}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <SchedulePanel />
  </PanelErrorBoundary>
);
