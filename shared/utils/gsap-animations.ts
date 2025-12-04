/**
 * GSAP 动画工具函数库
 *
 * 提供可复用的动画工具函数，支持在任何组件中使用
 * 所有函数都支持自定义配置，具有合理的默认值
 */

import gsap from "gsap";
import {
  AnimationDirection,
  FadeConfig,
  SlideConfig,
  ScaleConfig,
  LowerThirdAnimationConfig,
  TimelineConfig,
} from "../types/animation.types";

// ==================== 工具函数 ====================

/**
 * 创建 GSAP Timeline
 * @param config - Timeline 配置
 * @returns GSAP Timeline 实例
 *
 * @example
 * const tl = createTimeline({ defaults: { duration: 0.5, ease: 'power2.out' } });
 */
export function createTimeline(config?: TimelineConfig): gsap.core.Timeline {
  return gsap.timeline(config);
}

/**
 * 根据方向计算滑动的属性和值
 * @param direction - 滑动方向
 * @param distance - 滑动距离
 * @returns 包含属性名和值的对象
 */
function getSlideProps(direction: AnimationDirection, distance: number) {
  switch (direction) {
    case AnimationDirection.LEFT:
      return { x: -Math.abs(distance) };
    case AnimationDirection.RIGHT:
      return { x: Math.abs(distance) };
    case AnimationDirection.UP:
      return { y: -Math.abs(distance) };
    case AnimationDirection.DOWN:
      return { y: Math.abs(distance) };
    default:
      return { x: -Math.abs(distance) };
  }
}

// ==================== 基础动画函数 ====================

/**
 * 淡入动画
 * @param element - 目标 DOM 元素
 * @param config - 淡入配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createFadeIn(element, { duration: 0.6, ease: 'power2.out' });
 */
export function createFadeIn(
  element: HTMLElement,
  config: FadeConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.5,
    ease = "power2.out",
    delay = 0,
    from = 0,
    to = 1,
  } = config;

  return gsap.fromTo(
    element,
    { opacity: from },
    { opacity: to, duration, ease, delay }
  );
}

/**
 * 淡出动画
 * @param element - 目标 DOM 元素
 * @param config - 淡出配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createFadeOut(element, { duration: 0.5, ease: 'power2.in' });
 */
export function createFadeOut(
  element: HTMLElement,
  config: FadeConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.5,
    ease = "power2.in",
    delay = 0,
    from = 1,
    to = 0,
  } = config;

  return gsap.fromTo(
    element,
    { opacity: from },
    { opacity: to, duration, ease, delay }
  );
}

/**
 * 滑入动画
 * @param element - 目标 DOM 元素
 * @param direction - 滑入方向
 * @param config - 滑动配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createSlideIn(element, AnimationDirection.LEFT, { duration: 0.6, distance: 300 });
 */
export function createSlideIn(
  element: HTMLElement,
  direction: AnimationDirection = AnimationDirection.LEFT,
  config: SlideConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.6,
    ease = "back.out",
    delay = 0,
    distance = 300,
  } = config;

  const slideProps = getSlideProps(direction, distance);

  return gsap.fromTo(element, slideProps, {
    x: 0,
    y: 0,
    duration,
    ease,
    delay,
  });
}

/**
 * 滑出动画
 * @param element - 目标 DOM 元素
 * @param direction - 滑出方向
 * @param config - 滑动配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createSlideOut(element, AnimationDirection.LEFT, { duration: 0.6, distance: 300 });
 */
export function createSlideOut(
  element: HTMLElement,
  direction: AnimationDirection = AnimationDirection.LEFT,
  config: SlideConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.6,
    ease = "back.in",
    delay = 0,
    distance = 300,
  } = config;

  const slideProps = getSlideProps(direction, distance);

  return gsap.to(element, { ...slideProps, duration, ease, delay });
}

/**
 * 缩放进入动画（预留，将来扩展）
 * @param element - 目标 DOM 元素
 * @param config - 缩放配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createScaleIn(element, { duration: 0.5, from: 0, to: 1 });
 */
export function createScaleIn(
  element: HTMLElement,
  config: ScaleConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.5,
    ease = "back.out",
    delay = 0,
    from = 0,
    to = 1,
    transformOrigin = "center center",
  } = config;

  return gsap.fromTo(
    element,
    { scale: from, transformOrigin },
    { scale: to, duration, ease, delay }
  );
}

/**
 * 缩放退出动画（预留，将来扩展）
 * @param element - 目标 DOM 元素
 * @param config - 缩放配置
 * @returns GSAP Tween 实例
 *
 * @example
 * createScaleOut(element, { duration: 0.5, to: 0 });
 */
export function createScaleOut(
  element: HTMLElement,
  config: ScaleConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.5,
    ease = "back.in",
    delay = 0,
    from = 1,
    to = 0,
    transformOrigin = "center center",
  } = config;

  return gsap.fromTo(
    element,
    { scale: from, transformOrigin },
    { scale: to, duration, ease, delay }
  );
}

// ==================== 组合动画函数 ====================

/**
 * 淡入+滑入组合动画
 * @param element - 目标 DOM 元素
 * @param direction - 滑入方向
 * @param fadeConfig - 淡入配置
 * @param slideConfig - 滑入配置
 * @returns GSAP Timeline 实例
 *
 * @example
 * createFadeSlideIn(element, AnimationDirection.LEFT,
 *   { duration: 0.6, ease: 'power2.out' },
 *   { duration: 0.6, ease: 'back.out', distance: 300 }
 * );
 */
export function createFadeSlideIn(
  element: HTMLElement,
  direction: AnimationDirection = AnimationDirection.LEFT,
  fadeConfig: FadeConfig = {},
  slideConfig: SlideConfig = {}
): gsap.core.Timeline {
  const tl = createTimeline();

  const {
    duration: fadeDuration = 0.6,
    ease: fadeEase = "power2.out",
    delay = 0,
  } = fadeConfig;

  const {
    duration: slideDuration = 0.6,
    ease: slideEase = "back.out",
    distance = 300,
  } = slideConfig;

  const slideProps = getSlideProps(direction, distance);

  // 滑动动画
  tl.fromTo(
    element,
    slideProps,
    { x: 0, y: 0, duration: slideDuration, ease: slideEase },
    delay
  );

  // 淡入动画（与滑动同时开始）
  tl.fromTo(
    element,
    { opacity: 0 },
    { opacity: 1, duration: fadeDuration, ease: fadeEase },
    delay
  );

  return tl;
}

/**
 * 淡出+滑出组合动画
 * @param element - 目标 DOM 元素
 * @param direction - 滑出方向
 * @param fadeConfig - 淡出配置
 * @param slideConfig - 滑出配置
 * @returns GSAP Timeline 实例
 *
 * @example
 * createFadeSlideOut(element, AnimationDirection.LEFT,
 *   { duration: 0.5, ease: 'power2.in' },
 *   { duration: 0.6, ease: 'back.in', distance: 300 }
 * );
 */
export function createFadeSlideOut(
  element: HTMLElement,
  direction: AnimationDirection = AnimationDirection.LEFT,
  fadeConfig: FadeConfig = {},
  slideConfig: SlideConfig = {}
): gsap.core.Timeline {
  const tl = createTimeline();

  const {
    duration: fadeDuration = 0.5,
    ease: fadeEase = "power2.in",
    delay = 0,
  } = fadeConfig;

  const {
    duration: slideDuration = 0.6,
    ease: slideEase = "back.in",
    distance = 300,
  } = slideConfig;

  const slideProps = getSlideProps(direction, distance);

  // 滑出动画
  tl.to(
    element,
    { ...slideProps, duration: slideDuration, ease: slideEase },
    delay
  );

  // 淡出动画（与滑出同时开始）
  tl.to(element, { opacity: 0, duration: fadeDuration, ease: fadeEase }, delay);

  return tl;
}

// ==================== 组件专用动画 ====================

/**
 * Lower Third 入场动画
 * line1 和 line2 依次从左侧滑入并淡入
 *
 * @param line1Element - line1 DOM 元素
 * @param line2Element - line2 DOM 元素
 * @param config - 动画配置
 * @returns GSAP Timeline 实例
 *
 * @example
 * createLowerThirdEntranceAnimation(line1Ref.current, line2Ref.current, {
 *   fadeConfig: { duration: 0.6, ease: 'power2.out' },
 *   slideConfig: { duration: 0.6, ease: 'back.out', distance: 300 },
 *   line2Delay: 0.2
 * });
 */
export function createLowerThirdEntranceAnimation(
  line1Element: HTMLElement,
  line2Element: HTMLElement,
  config: LowerThirdAnimationConfig = {}
): gsap.core.Timeline {
  const {
    fadeConfig = { duration: 0.6, ease: "power2.out" },
    slideConfig = { duration: 0.6, ease: "back.out", distance: 300 },
    line2Delay = 0.2,
  } = config;

  const tl = createTimeline();

  // Line1 入场：滑入 + 淡入
  const line1SlideProps = getSlideProps(
    AnimationDirection.LEFT,
    slideConfig.distance || 300
  );

  tl.fromTo(
    line1Element,
    line1SlideProps,
    {
      x: 0,
      y: 0,
      duration: slideConfig.duration,
      ease: slideConfig.ease,
    },
    0
  ).fromTo(
    line1Element,
    { opacity: 0 },
    {
      opacity: 1,
      duration: fadeConfig.duration,
      ease: fadeConfig.ease,
    },
    0
  );

  // Line2 入场：滑入 + 淡入（延迟开始）
  tl.fromTo(
    line2Element,
    line1SlideProps,
    {
      x: 0,
      y: 0,
      duration: slideConfig.duration,
      ease: slideConfig.ease,
    },
    line2Delay
  ).fromTo(
    line2Element,
    { opacity: 0 },
    {
      opacity: 1,
      duration: fadeConfig.duration,
      ease: fadeConfig.ease,
    },
    line2Delay
  );

  return tl;
}

/**
 * Lower Third 离场动画
 * line2 先滑出并淡出，然后 line1 滑出并淡出
 *
 * @param line1Element - line1 DOM 元素
 * @param line2Element - line2 DOM 元素
 * @param config - 动画配置
 * @returns GSAP Timeline 实例
 *
 * @example
 * createLowerThirdExitAnimation(line1Ref.current, line2Ref.current, {
 *   fadeConfig: { duration: 0.5, ease: 'power2.in' },
 *   slideConfig: { duration: 0.6, ease: 'back.in', distance: 300 },
 *   line2Delay: 0.3
 * });
 */
export function createLowerThirdExitAnimation(
  line1Element: HTMLElement,
  line2Element: HTMLElement,
  config: LowerThirdAnimationConfig = {}
): gsap.core.Timeline {
  const {
    fadeConfig = { duration: 0.5, ease: "power2.in" },
    slideConfig = { duration: 0.6, ease: "back.in", distance: 300 },
    line2Delay = 0.3, // line1 相对于 line2 的延迟
  } = config;

  const tl = createTimeline();

  // Line2 离场：滑出 + 淡出（先走）
  const slideProps = getSlideProps(
    AnimationDirection.LEFT,
    slideConfig.distance || 300
  );

  tl.to(
    line2Element,
    {
      ...slideProps,
      duration: slideConfig.duration,
      ease: slideConfig.ease,
    },
    0
  ).to(
    line2Element,
    {
      opacity: 0,
      duration: fadeConfig.duration,
      ease: fadeConfig.ease,
    },
    0
  );

  // Line1 离场：滑出 + 淡出（延迟开始）
  tl.to(
    line1Element,
    {
      ...slideProps,
      duration: slideConfig.duration,
      ease: slideConfig.ease,
    },
    line2Delay
  ).to(
    line1Element,
    {
      opacity: 0,
      duration: fadeConfig.duration,
      ease: fadeConfig.ease,
    },
    line2Delay
  );

  return tl;
}
