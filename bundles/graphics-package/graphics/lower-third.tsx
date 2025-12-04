/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { LowerThirdData } from "../../../shared/types/graphics.types";
import {
  createLowerThirdEntranceAnimation,
  createLowerThirdExitAnimation,
} from "../../../shared/utils/gsap-animations";

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
    <div
      ref={containerRef}
      style={{
        position: "absolute", // 定位方式 - 绝对定位(相对于屏幕)
        bottom: "100px", // 底部距离 - 距离屏幕底部100px
        left: "100px", // 左侧距离 - 距离屏幕左侧100px
        fontFamily: "Maple, sans-serif", // 字体族 - Maple字体,备用无衬线字体
      }}
    >
      <div
        ref={line1Ref}
        style={{
          backgroundColor: "#1e88e5", // 背景颜色 - 蓝色主题色
          color: "white", // 文字颜色 - 白色
          padding: "10px 20px", // 内边距 - 上下10px, 左右20px
          fontSize: "64px", // 字体大小 - 32像素(主标题)
          fontWeight: "bold", // 字体粗细 - 加粗
          display: "inline-block", // 显示方式 - 行内块元素(宽度自适应内容)
          opacity: 0, // 初始透明度 - 0(完全透明,由 GSAP 动画控制)
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
          fontSize: "48px",
          fontWeight: "bold",
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
