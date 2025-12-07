/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LowerThirdData, ScoreboardData } from "@shared/types/graphics.types";

interface GraphicsData {
  lowerThird: LowerThirdData;
  scoreboard: ScoreboardData;
}

const GraphicsControl = () => {
  const [data, setData] = useState<GraphicsData | null>(null);

  useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal: any) => {
      if (newVal) {
        setData(newVal);
      }
    });
  }, []);

  const updateLowerThird = (updates: Partial<LowerThirdData>) => {
    if (!data) return;
    nodecg.Replicant("graphicsData").value = {
      ...data,
      lowerThird: { ...data.lowerThird, ...updates },
    };
  };

  const updateScoreboard = (updates: Partial<ScoreboardData>) => {
    if (!data) return;
    nodecg.Replicant("graphicsData").value = {
      ...data,
      scoreboard: { ...data.scoreboard, ...updates },
    };
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          marginBottom: "30px",
          border: "1px solid #555",
          padding: "15px",
          borderRadius: "4px",
        }}
      >
        <h3>Lower Third</h3>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Line 1
          </label>
          <input
            type="text"
            value={data.lowerThird.line1}
            onChange={(e) => updateLowerThird({ line1: e.target.value })}
            style={{
              width: "100%",
              padding: "5px",
              backgroundColor: "#424242",
              color: "white",
              border: "1px solid #666",
            }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Line 2
          </label>
          <input
            type="text"
            value={data.lowerThird.line2}
            onChange={(e) => updateLowerThird({ line2: e.target.value })}
            style={{
              width: "100%",
              padding: "5px",
              backgroundColor: "#424242",
              color: "white",
              border: "1px solid #666",
            }}
          />
        </div>
        <button
          onClick={() =>
            updateLowerThird({ visible: !data.lowerThird.visible })
          }
          style={{
            padding: "8px 16px",
            backgroundColor: data.lowerThird.visible ? "#f44336" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {data.lowerThird.visible ? "Hide" : "Show"}
        </button>
      </div>

      <div
        style={{
          border: "1px solid #555",
          padding: "15px",
          borderRadius: "4px",
        }}
      >
        <h3>Scoreboard</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "15px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h4>Home</h4>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>
              {data.scoreboard.homeScore}
            </div>
            <button
              onClick={() =>
                updateScoreboard({ homeScore: data.scoreboard.homeScore + 1 })
              }
            >
              +
            </button>
            <button
              onClick={() =>
                updateScoreboard({
                  homeScore: Math.max(0, data.scoreboard.homeScore - 1),
                })
              }
            >
              -
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <h4>Away</h4>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>
              {data.scoreboard.awayScore}
            </div>
            <button
              onClick={() =>
                updateScoreboard({ awayScore: data.scoreboard.awayScore + 1 })
              }
            >
              +
            </button>
            <button
              onClick={() =>
                updateScoreboard({
                  awayScore: Math.max(0, data.scoreboard.awayScore - 1),
                })
              }
            >
              -
            </button>
          </div>
        </div>
        <button
          onClick={() =>
            updateScoreboard({ visible: !data.scoreboard.visible })
          }
          style={{
            padding: "8px 16px",
            backgroundColor: data.scoreboard.visible ? "#f44336" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {data.scoreboard.visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<GraphicsControl />);
