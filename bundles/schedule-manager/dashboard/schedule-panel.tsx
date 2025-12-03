/// <reference path="../../../shared/types/global.d.ts" />
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
    const newSchedule = [...schedule];
    newSchedule[index].active = !newSchedule[index].active;
    nodecg.Replicant("scheduleData").value = newSchedule;
  };

  return (
    <div style={{ padding: "10px" }}>
      <h3 style={{ marginTop: 0 }}>Schedule Items</h3>
      {schedule.length === 0 ? (
        <div style={{ color: "#888" }}>
          No schedule data. Sync from Google Sheets.
        </div>
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
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold" }}>
                  {item.time} - {item.title}
                </div>
                <div style={{ fontSize: "12px", color: "#ccc" }}>
                  {item.description}
                </div>
              </div>
              <button
                onClick={() => toggleActive(index)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "rgba(0,0,0,0.2)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {item.active ? "Active" : "Inactive"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<SchedulePanel />);
