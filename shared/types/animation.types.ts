/**
 * GSAP 动画配置类型定义
 *
 * 此文件包含所有动画相关的 TypeScript 类型和接口定义
 * 用于确保动画配置的类型安全和 IDE 自动补全支持
 */

/**
 * 动画方向枚举
 */
export enum AnimationDirection {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
}

/**
 * 常用 GSAP 缓动函数类型
 * 提供 IDE 自动补全支持
 */
export type EasingType =
  | "none"
  | "power1.in"
  | "power1.out"
  | "power1.inOut"
  | "power2.in"
  | "power2.out"
  | "power2.inOut"
  | "power3.in"
  | "power3.out"
  | "power3.inOut"
  | "power4.in"
  | "power4.out"
  | "power4.inOut"
  | "back.in"
  | "back.out"
  | "back.inOut"
  | "elastic.in"
  | "elastic.out"
  | "elastic.inOut"
  | "bounce.in"
  | "bounce.out"
  | "bounce.inOut"
  | "circ.in"
  | "circ.out"
  | "circ.inOut"
  | "expo.in"
  | "expo.out"
  | "expo.inOut"
  | "sine.in"
  | "sine.out"
  | "sine.inOut"
  | string; // 允许自定义缓动函数

/**
 * 淡入淡出动画配置
 */
export interface FadeConfig {
  /** 动画持续时间（秒） */
  duration?: number;
  /** 缓动函数 */
  ease?: EasingType;
  /** 延迟时间（秒） */
  delay?: number;
  /** 起始透明度（0-1） */
  from?: number;
  /** 目标透明度（0-1） */
  to?: number;
}

/**
 * 滑动动画配置
 */
export interface SlideConfig {
  /** 动画持续时间（秒） */
  duration?: number;
  /** 缓动函数 */
  ease?: EasingType;
  /** 延迟时间（秒） */
  delay?: number;
  /** 滑动距离（像素）- 正数向右/下，负数向左/上 */
  distance?: number;
  /** 滑动方向 */
  direction?: AnimationDirection;
}

/**
 * 缩放动画配置
 * 预留接口，用于将来扩展
 */
export interface ScaleConfig {
  /** 动画持续时间（秒） */
  duration?: number;
  /** 缓动函数 */
  ease?: EasingType;
  /** 延迟时间（秒） */
  delay?: number;
  /** 起始缩放比例 */
  from?: number;
  /** 目标缩放比例 */
  to?: number;
  /** 变换原点（例如: "center center", "top left"） */
  transformOrigin?: string;
}

/**
 * 旋转动画配置
 * 预留接口，用于将来扩展
 */
export interface RotateConfig {
  /** 动画持续时间（秒） */
  duration?: number;
  /** 缓动函数 */
  ease?: EasingType;
  /** 延迟时间（秒） */
  delay?: number;
  /** 旋转角度（度） */
  rotation?: number;
  /** 变换原点（例如: "center center", "top left"） */
  transformOrigin?: string;
}

/**
 * Lower Third 入场/离场动画配置
 */
export interface LowerThirdAnimationConfig {
  /** 淡入淡出配置 */
  fadeConfig?: FadeConfig;
  /** 滑动配置 */
  slideConfig?: SlideConfig;
  /** line2 相对于 line1 的延迟时间（秒） */
  line2Delay?: number;
}

/**
 * GSAP Timeline 配置
 */
export interface TimelineConfig {
  /** 默认动画持续时间 */
  defaults?: {
    duration?: number;
    ease?: EasingType;
  };
  /** 是否暂停 */
  paused?: boolean;
  /** 延迟时间 */
  delay?: number;
  /** 重复次数（-1 为无限重复） */
  repeat?: number;
  /** 重复延迟 */
  repeatDelay?: number;
  /** 是否悠悠球效果（来回播放） */
  yoyo?: boolean;
}
