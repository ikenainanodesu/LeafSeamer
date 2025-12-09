import React, { useEffect, useState } from "react";
import { BankSlot } from "./BankSlot";
import { Preset } from "../../types";

export const Bank: React.FC = () => {
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    const rep = nodecg.Replicant<Preset[]>("presets");
    rep.on("change", (val: Preset[]) => {
      if (val) setPresets(val);
    });
  }, []);

  // Create 8 slots
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {[...Array(8)].map((_, i) => {
        const preset = presets.find((p) => p.id === `bank-${i}`);
        return <BankSlot key={i} id={`bank-${i}`} index={i} preset={preset} />;
      })}
    </div>
  );
};
