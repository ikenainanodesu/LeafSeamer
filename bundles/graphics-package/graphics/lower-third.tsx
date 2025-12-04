/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { LowerThirdData } from "../../../shared/types/graphics.types";

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

  // GSAP 动画控制
  useGSAP(
    () => {
      if (!line1Ref.current || !line2Ref.current) return;

      if (data.visible) {
        // 入场动画 - 从左侧滑入并淡入
        const tl = gsap.timeline();

        tl.fromTo(
          line1Ref.current,
          {
            x: -300,
            opacity: 0,
          },
          {
            x: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
          }
        ).fromTo(
          line2Ref.current,
          {
            x: -300,
            opacity: 0,
          },
          {
            x: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
          },
          "<0.2" // 晚于 line1 0.5 秒 (相对于 line1 开始时间)
        );
      } else {
        // 离场动画 - 出现动画的倒放 (Line 2 先走, Line 1 晚 0.5 秒走)
        const tl = gsap.timeline();

        tl.to(line1Ref.current, {
          x: -300,
          opacity: 0,
          duration: 0.6, // 保持与入场时长一致
          ease: "power2.in", // 倒放通常使用相反的 ease, out -> in
        }).to(
          line2Ref.current,
          {
            x: -300,
            opacity: 0,
            duration: 0.6,
            ease: "power2.in",
          },
          "<0.3" // 晚于 line2 0.5 秒
        );
      }
    },
    {
      scope: containerRef,
      dependencies: [data.visible], // 依赖 visible 状态变化时重新执行
    }
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        bottom: "100px",
        left: "100px",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <div
        ref={line1Ref}
        style={{
          backgroundColor: "#1e88e5",
          color: "white",
          padding: "10px 20px",
          fontSize: "32px",
          fontWeight: "bold",
          display: "inline-block",
          opacity: 0, // 初始不可见,由 GSAP 控制
        }}
      >
        {data.line1}
      </div>
      <br />
      <div
        ref={line2Ref}
        style={{
          backgroundColor: "white",
          color: "#333",
          padding: "5px 20px",
          fontSize: "24px",
          display: "inline-block",
          opacity: 0, // 初始不可见,由 GSAP 控制
        }}
      >
        {data.line2}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<LowerThird />);
