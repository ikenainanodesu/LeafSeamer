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
        // 入场动画配置
        const fadeInConfig = {
          duration: 0.6, // 淡入持续时间
          ease: "power2.out", // 淡入缓动函数
        };

        const slideInConfig = {
          duration: 0.6, // 滑入持续时间
          ease: "back.out", // 滑入缓动函数
          distance: -300, // 滑入距离
        };

        const line2Delay = 0.2; // line2 相对于 line1 的延迟时间

        // 创建入场动画时间线
        const tl = gsap.timeline();

        // Line1 入场: 分别控制滑动和淡入
        tl.fromTo(
          line1Ref.current,
          { x: slideInConfig.distance },
          {
            x: 0,
            duration: slideInConfig.duration,
            ease: slideInConfig.ease,
          },
          0 // 从时间线开始
        ).fromTo(
          line1Ref.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: fadeInConfig.duration,
            ease: fadeInConfig.ease,
          },
          0 // 与滑动同时开始
        );

        // Line2 入场: 分别控制滑动和淡入
        tl.fromTo(
          line2Ref.current,
          { x: slideInConfig.distance },
          {
            x: 0,
            duration: slideInConfig.duration,
            ease: slideInConfig.ease,
          },
          line2Delay // 延迟开始
        ).fromTo(
          line2Ref.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: fadeInConfig.duration,
            ease: fadeInConfig.ease,
          },
          line2Delay // 与 line2 滑动同时开始
        );
      } else {
        // 离场动画配置
        const fadeOutConfig = {
          duration: 0.5, // 淡出持续时间
          ease: "power2.in", // 淡出缓动函数
        };

        const slideOutConfig = {
          duration: 0.6, // 滑出持续时间
          ease: "back.in", // 滑出缓动函数
          distance: -300, // 滑出距离
        };

        const line1Delay = 0.3; // line1 相对于 line2 的延迟时间

        // 创建离场动画时间线
        const tl = gsap.timeline();

        // Line2 离场: 分别控制滑动和淡出
        tl.to(
          line2Ref.current,
          {
            x: slideOutConfig.distance,
            duration: slideOutConfig.duration,
            ease: slideOutConfig.ease,
          },
          0 // 从时间线开始
        ).to(
          line2Ref.current,
          {
            opacity: 0,
            duration: fadeOutConfig.duration,
            ease: fadeOutConfig.ease,
          },
          0 // 与滑动同时开始
        );

        // Line1 离场: 分别控制滑动和淡出
        tl.to(
          line1Ref.current,
          {
            x: slideOutConfig.distance,
            duration: slideOutConfig.duration,
            ease: slideOutConfig.ease,
          },
          line1Delay // 延迟开始
        ).to(
          line1Ref.current,
          {
            opacity: 0,
            duration: fadeOutConfig.duration,
            ease: fadeOutConfig.ease,
          },
          line1Delay // 与 line1 滑动同时开始
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
