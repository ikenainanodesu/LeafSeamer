/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LowerThirdData } from "../../../shared/types/graphics.types";

const LowerThird = () => {
  const [data, setData] = useState<LowerThirdData>({
    visible: false,
    line1: "",
    line2: "",
  });

  useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal: any) => {
      if (newVal && newVal.lowerThird) {
        setData(newVal.lowerThird);
      }
    });
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100px",
        left: "100px",
        opacity: data.visible ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#1e88e5",
          color: "white",
          padding: "10px 20px",
          fontSize: "32px",
          fontWeight: "bold",
          display: "inline-block",
        }}
      >
        {data.line1}
      </div>
      <br />
      <div
        style={{
          backgroundColor: "white",
          color: "#333",
          padding: "5px 20px",
          fontSize: "24px",
          display: "inline-block",
        }}
      >
        {data.line2}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<LowerThird />);
