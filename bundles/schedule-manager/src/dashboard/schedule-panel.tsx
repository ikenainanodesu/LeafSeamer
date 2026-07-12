import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { PlaylistItem } from "../types/schedule.types";

const SchedulePanel = () => {
  const [schedule, setSchedule] = useState<PlaylistItem[]>([]);

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
    persistLocalItems(schedule.filter(
      (item) => item.id !== id
    ));
  };

  return (
    <div style={{ padding: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Schedule Items</h3>
        <button onClick={addItem}>Add Item</button>
      </div>
      {schedule.length === 0 ? (
        <div style={{ color: "#888" }}>No schedule items yet.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {schedule.map((item, index) => (
            <li
              key={item.id}
              style={{
                marginBottom: "10px",
                padding: "10px",
                backgroundColor: item.active ? "#388e3c" : "#424242",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr",
                  gap: 6,
                  flex: 1,
                }}
              >
                <input
                  aria-label="Time"
                  value={item.time}
                  placeholder="Time"
                  disabled={item.sourceId !== "local"}
                  onChange={(event) =>
                    updateItem(index, "time", event.target.value)
                  }
                />
                <input
                  aria-label="Title"
                  value={item.title}
                  placeholder="Title"
                  disabled={item.sourceId !== "local"}
                  onChange={(event) =>
                    updateItem(index, "title", event.target.value)
                  }
                />
                <input
                  aria-label="Description"
                  value={item.description}
                  placeholder="Description"
                  disabled={item.sourceId !== "local"}
                  onChange={(event) =>
                    updateItem(index, "description", event.target.value)
                  }
                  style={{ gridColumn: "1 / -1" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => toggleActive(index)} disabled={item.sourceId !== "local"}>
                  {item.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => removeItem(item.id)} disabled={item.sourceId !== "local"}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<SchedulePanel />);
