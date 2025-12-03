/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ScoreboardData } from "../../../shared/types/graphics.types";

const Scoreboard = () => {
  const [data, setData] = useState<ScoreboardData>({
    visible: false,
    homeScore: 0,
    awayScore: 0,
  });

  useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal: any) => {
      if (newVal && newVal.scoreboard) {
        setData(newVal.scoreboard);
      }
    });
  }, []);

  if (!data.visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: "50px",
        backgroundColor: "#333",
        color: "white",
        padding: "10px",
        fontFamily: "Roboto, sans-serif",
        display: "flex",
        alignItems: "center",
        borderRadius: "8px",
      }}
    >
      <div style={{ padding: "0 20px", fontSize: "36px", fontWeight: "bold" }}>
        HOME
      </div>
      <div
        style={{
          backgroundColor: "#4caf50",
          padding: "10px 20px",
          fontSize: "48px",
          fontWeight: "bold",
          borderRadius: "4px",
        }}
      >
        {data.homeScore}
      </div>
      <div style={{ padding: "0 20px", fontSize: "24px" }}>VS</div>
      <div
        style={{
          backgroundColor: "#f44336",
          padding: "10px 20px",
          fontSize: "48px",
          fontWeight: "bold",
          borderRadius: "4px",
        }}
      >
        {data.awayScore}
      </div>
      <div style={{ padding: "0 20px", fontSize: "36px", fontWeight: "bold" }}>
        AWAY
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<Scoreboard />);
