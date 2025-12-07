/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { LowerThirdData } from "@shared/types/graphics.types";
import {
  createLowerThirdEntranceAnimation,
  createLowerThirdExitAnimation,
} from "@shared/utils/gsap-animations";
import "./lower-third.css";

const LowerThird = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<LowerThirdData>({
    visible: false,
    line1: "",
    line2: "",
  });

  // NodeCG Replicant 数据同步
  useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal: any) => {
      if (newVal && newVal.lowerThird) {
        setData(newVal.lowerThird);
      }
    });
  }, []);

  // 设置初始状态
  useEffect(() => {
    if (line1Ref.current && line2Ref.current) {
      gsap.set([line1Ref.current, line2Ref.current], { opacity: 0 });
    }
  }, []);

  // GSAP 动画控制
  useGSAP(
    () => {
      if (!line1Ref.current || !line2Ref.current) return;

      if (data.visible) {
        // 使用工具函数创建入场动画
        createLowerThirdEntranceAnimation(line1Ref.current, line2Ref.current, {
          fadeConfig: { duration: 0.6, ease: "power2.out" },
          slideConfig: { duration: 0.6, ease: "back.out", distance: 300 },
          line2Delay: 0.2,
        });
      } else {
        // 使用工具函数创建离场动画
        createLowerThirdExitAnimation(line1Ref.current, line2Ref.current, {
          fadeConfig: { duration: 0.5, ease: "power2.in" },
          slideConfig: { duration: 0.6, ease: "back.in", distance: 300 },
          line2Delay: 0.3,
        });
      }
    },
    {
      scope: containerRef,
      dependencies: [data.visible], // 依赖 visible 状态变化时重新执行
    }
  );

  return (
    <div ref={containerRef} className="lower-third-container">
      <div ref={line1Ref} className="lower-third-line1">
        {data.line1}
      </div>
      <br />
      <div ref={line2Ref} className="lower-third-line2">
        {data.line2}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<LowerThird />);
