import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  active: boolean;
}

const SchedulePanel = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const scheduleRep = nodecg.Replicant<ScheduleItem[]>("scheduleData");
    scheduleRep.on("change", (newVal: any) => {
      if (newVal) {
        setSchedule(newVal);
      }
    });
  }, []);

  const toggleActive = (index: number) => {
    const newSchedule = schedule.map((item, itemIndex) =>
      itemIndex === index ? { ...item, active: !item.active } : item
    );
    nodecg.Replicant("scheduleData").value = newSchedule;
  };

  const updateItem = (
    index: number,
    field: keyof Omit<ScheduleItem, "id" | "active">,
    value: string
  ) => {
    nodecg.Replicant("scheduleData").value = schedule.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );
  };

  const addItem = () => {
    nodecg.Replicant("scheduleData").value = [
      ...schedule,
      {
        id: crypto.randomUUID(),
        time: "",
        title: "New item",
        description: "",
        active: true,
      },
    ];
  };

  const removeItem = (id: string) => {
    nodecg.Replicant("scheduleData").value = schedule.filter(
      (item) => item.id !== id
    );
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
                  onChange={(event) =>
                    updateItem(index, "time", event.target.value)
                  }
                />
                <input
                  aria-label="Title"
                  value={item.title}
                  placeholder="Title"
                  onChange={(event) =>
                    updateItem(index, "title", event.target.value)
                  }
                />
                <input
                  aria-label="Description"
                  value={item.description}
                  placeholder="Description"
                  onChange={(event) =>
                    updateItem(index, "description", event.target.value)
                  }
                  style={{ gridColumn: "1 / -1" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => toggleActive(index)}>
                  {item.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => removeItem(item.id)}>Delete</button>
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
