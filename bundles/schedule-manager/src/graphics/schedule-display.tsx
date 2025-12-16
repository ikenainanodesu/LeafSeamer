/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  active: boolean;
}

const ScheduleDisplay = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const scheduleRep = nodecg.Replicant<ScheduleItem[]>("scheduleData");
    scheduleRep.on("change", (newVal: any) => {
      if (newVal) {
        setSchedule(newVal);
      }
    });
  }, []);

  const activeItems = schedule.filter((item) => item.active);

  return (
    <div
      style={{
        width: "1920px",
        height: "1080px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.8)", // Semi-transparent background for overlay
        color: "white",
      }}
    >
      <h1
        style={{
          fontSize: "64px",
          marginBottom: "40px",
          borderBottom: "4px solid #f44336",
          paddingBottom: "10px",
        }}
      >
        UPCOMING SCHEDULE
      </h1>
      <div style={{ width: "80%" }}>
        {activeItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
              padding: "20px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#ff9800",
                width: "200px",
              }}
            >
              {item.time}
            </div>
            <div style={{ flex: 1, marginLeft: "40px" }}>
              <div style={{ fontSize: "48px", fontWeight: "bold" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "32px", color: "#ddd" }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ScheduleDisplay />);
