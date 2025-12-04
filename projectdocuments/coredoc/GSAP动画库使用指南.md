# GSAP 动画库使用指南

本文档介绍如何使用 LeafSeamer 项目的 GSAP 动画工具库。

## 快速开始

### 导入动画函数

```typescript
import {
  createFadeIn,
  createFadeOut,
  createSlideIn,
  createSlideOut,
  createFadeSlideIn,
  createFadeSlideOut,
  createLowerThirdEntranceAnimation,
  createLowerThirdExitAnimation,
} from "../../../shared/utils/gsap-animations";

import { AnimationDirection } from "../../../shared/types/animation.types";
```

### 基本使用示例

```typescript
// 简单的淡入动画
createFadeIn(element, { duration: 0.5, ease: "power2.out" });

// 从左侧滑入
createSlideIn(element, AnimationDirection.LEFT, {
  duration: 0.6,
  distance: 300,
});

// 组合动画：淡入 + 滑入
createFadeSlideIn(
  element,
  AnimationDirection.LEFT,
  { duration: 0.6, ease: "power2.out" }, // 淡入配置
  { duration: 0.6, ease: "back.out", distance: 300 } // 滑入配置
);
```

---

## API 文档

### 基础动画函数

#### `createFadeIn(element, config?)`

创建淡入动画。

**参数：**

- `element: HTMLElement` - 目标 DOM 元素
- `config?: FadeConfig` - 淡入配置（可选）
  - `duration?: number` - 持续时间（秒），默认 0.5
  - `ease?: EasingType` - 缓动函数，默认 'power2.out'
  - `delay?: number` - 延迟时间（秒），默认 0
  - `from?: number` - 起始透明度，默认 0
  - `to?: number` - 目标透明度，默认 1

**返回：** `gsap.core.Tween`

**示例：**

```typescript
createFadeIn(myElement, {
  duration: 0.8,
  ease: "power3.out",
  delay: 0.2,
});
```

---

#### `createFadeOut(element, config?)`

创建淡出动画。

**参数：** 同 `createFadeIn`，默认值有所不同

- `ease` 默认为 'power2.in'
- `from` 默认为 1，`to` 默认为 0

**返回：** `gsap.core.Tween`

---

#### `createSlideIn(element, direction, config?)`

创建滑入动画。

**参数：**

- `element: HTMLElement` - 目标 DOM 元素
- `direction: AnimationDirection` - 滑入方向
  - `AnimationDirection.LEFT` - 从左侧滑入
  - `AnimationDirection.RIGHT` - 从右侧滑入
  - `AnimationDirection.UP` - 从上方滑入
  - `AnimationDirection.DOWN` - 从下方滑入
- `config?: SlideConfig` - 滑动配置（可选）
  - `duration?: number` - 持续时间（秒），默认 0.6
  - `ease?: EasingType` - 缓动函数，默认 'back.out'
  - `delay?: number` - 延迟时间（秒），默认 0
  - `distance?: number` - 滑动距离（像素），默认 300

**返回：** `gsap.core.Tween`

**示例：**

```typescript
// 从右侧滑入，距离 500px
createSlideIn(myElement, AnimationDirection.RIGHT, {
  duration: 0.8,
  distance: 500,
  ease: "power2.out",
});
```

---

#### `createSlideOut(element, direction, config?)`

创建滑出动画。

**参数：** 同 `createSlideIn`，默认 ease 为 'back.in'

**返回：** `gsap.core.Tween`

---

#### `createScaleIn(element, config?)` / `createScaleOut(element, config?)`

> [!NOTE]
> 缩放动画函数已预留，将来可能会扩展更多功能。

创建缩放进入/退出动画。

**参数：**

- `element: HTMLElement` - 目标 DOM 元素
- `config?: ScaleConfig` - 缩放配置
  - `duration?: number` - 持续时间（秒），默认 0.5
  - `ease?: EasingType` - 缓动函数，默认 'back.out'
  - `from?: number` - 起始缩放比例，默认 0
  - `to?: number` - 目标缩放比例，默认 1
  - `transformOrigin?: string` - 变换原点，默认 'center center'

---

### 组合动画函数

#### `createFadeSlideIn(element, direction, fadeConfig?, slideConfig?)`

创建淡入+滑入组合动画（同时执行）。

**参数：**

- `element: HTMLElement` - 目标 DOM 元素
- `direction: AnimationDirection` - 滑入方向，默认 LEFT
- `fadeConfig?: FadeConfig` - 淡入配置
- `slideConfig?: SlideConfig` - 滑入配置

**返回：** `gsap.core.Timeline`

**示例：**

```typescript
createFadeSlideIn(
  myElement,
  AnimationDirection.LEFT,
  { duration: 0.6, ease: "power2.out" },
  { duration: 0.8, ease: "back.out", distance: 400 }
);
```

---

#### `createFadeSlideOut(element, direction, fadeConfig?, slideConfig?)`

创建淡出+滑出组合动画（同时执行）。

**参数：** 同 `createFadeSlideIn`

**返回：** `gsap.core.Timeline`

---

### 组件专用动画

#### `createLowerThirdEntranceAnimation(line1Element, line2Element, config?)`

创建 Lower Third 字幕条的入场动画。

**特点：**

- line1 和 line2 依次从左侧滑入并淡入
- line2 延迟指定时间后开始动画

**参数：**

- `line1Element: HTMLElement` - line1 DOM 元素
- `line2Element: HTMLElement` - line2 DOM 元素
- `config?: LowerThirdAnimationConfig` - 动画配置
  - `fadeConfig?: FadeConfig` - 淡入配置
  - `slideConfig?: SlideConfig` - 滑入配置
  - `line2Delay?: number` - line2 延迟时间（秒），默认 0.2

**返回：** `gsap.core.Timeline`

**示例：**

```typescript
createLowerThirdEntranceAnimation(line1Ref.current, line2Ref.current, {
  fadeConfig: { duration: 0.6, ease: "power2.out" },
  slideConfig: { duration: 0.6, ease: "back.out", distance: 300 },
  line2Delay: 0.2,
});
```

---

#### `createLowerThirdExitAnimation(line1Element, line2Element, config?)`

创建 Lower Third 字幕条的离场动画。

**特点：**

- line2 先滑出并淡出
- line1 延迟指定时间后滑出并淡出

**参数：** 同 `createLowerThirdEntranceAnimation`

**返回：** `gsap.core.Timeline`

---

## 添加新动画

如果你需要添加新的动画效果，请遵循以下步骤：

### 1. 定义类型（如果需要）

在 `shared/types/animation.types.ts` 中添加新的配置接口：

```typescript
/**
 * 新动画配置
 */
export interface NewAnimationConfig {
  /** 动画持续时间（秒） */
  duration?: number;
  /** 缓动函数 */
  ease?: EasingType;
  /** 延迟时间（秒） */
  delay?: number;
  // 添加你的自定义参数
  customParam?: number;
}
```

### 2. 实现动画函数

在 `shared/utils/gsap-animations.ts` 中添加新的动画函数：

```typescript
/**
 * 新动画效果
 * @param element - 目标 DOM 元素
 * @param config - 动画配置
 * @returns GSAP Tween 或 Timeline 实例
 *
 * @example
 * createNewAnimation(element, { duration: 0.5, customParam: 100 });
 */
export function createNewAnimation(
  element: HTMLElement,
  config: NewAnimationConfig = {}
): gsap.core.Tween {
  const {
    duration = 0.5,
    ease = "power2.out",
    delay = 0,
    customParam = 50,
  } = config;

  return gsap.to(element, {
    // 你的动画属性
    customProperty: customParam,
    duration,
    ease,
    delay,
  });
}
```

### 3. 导出和使用

函数会自动被导出（因为使用了 `export`），在其他文件中导入使用：

```typescript
import { createNewAnimation } from "../../../shared/utils/gsap-animations";

createNewAnimation(myElement, { duration: 0.8, customParam: 200 });
```

---

## 常见动画模式

### 序列动画（依次执行）

```typescript
const tl = createTimeline();

tl.add(createFadeIn(element1, { duration: 0.5 }))
  .add(createFadeIn(element2, { duration: 0.5 }))
  .add(createFadeIn(element3, { duration: 0.5 }));
```

### 并行动画（同时执行）

```typescript
const tl = createTimeline();

tl.add(createFadeIn(element1, { duration: 0.5 }), 0)
  .add(createFadeIn(element2, { duration: 0.5 }), 0)
  .add(createFadeIn(element3, { duration: 0.5 }), 0);
```

### 延迟序列动画

```typescript
const tl = createTimeline();

tl.add(createFadeSlideIn(element1, AnimationDirection.LEFT), 0)
  .add(createFadeSlideIn(element2, AnimationDirection.LEFT), 0.2) // 延迟 0.2 秒
  .add(createFadeSlideIn(element3, AnimationDirection.LEFT), 0.4); // 延迟 0.4 秒
```

---

## 最佳实践

### 1. 使用类型定义

始终使用 TypeScript 类型来获得更好的 IDE 支持和类型安全：

```typescript
import {
  AnimationDirection,
  FadeConfig,
} from "../../../shared/types/animation.types";

const fadeConfig: FadeConfig = {
  duration: 0.6,
  ease: "power2.out",
};
```

### 2. 复用配置

对于相同的动画配置，可以定义常量复用：

```typescript
const FADE_IN_CONFIG: FadeConfig = {
  duration: 0.6,
  ease: "power2.out",
};

createFadeIn(element1, FADE_IN_CONFIG);
createFadeIn(element2, FADE_IN_CONFIG);
```

### 3. 性能优化

- 避免在循环中创建大量动画
- 使用 `will-change` CSS 属性提示浏览器优化
- 动画结束后清理不需要的 Timeline

```typescript
const tl = createLowerThirdEntranceAnimation(...);

tl.eventCallback('onComplete', () => {
  // 动画完成后的清理工作
  console.log('Animation complete!');
});
```

### 4. 响应式设计

根据屏幕尺寸调整动画参数：

```typescript
const isMobile = window.innerWidth < 768;

createSlideIn(element, AnimationDirection.LEFT, {
  distance: isMobile ? 200 : 400, // 移动端使用更短的距离
  duration: isMobile ? 0.4 : 0.6, // 移动端使用更短的时间
});
```

---

## 常用缓动函数参考

| 缓动函数      | 适用场景         |
| ------------- | ---------------- |
| `power2.out`  | 通用淡入、滑入   |
| `power2.in`   | 通用淡出、滑出   |
| `back.out`    | 有弹性的进入效果 |
| `back.in`     | 有弹性的退出效果 |
| `elastic.out` | 强烈的弹性效果   |
| `bounce.out`  | 弹跳效果         |
| `circ.out`    | 圆形缓动         |
| `expo.out`    | 指数缓动         |
| `none`        | 线性，无缓动     |

---

## 故障排除

### 动画不执行

1. 确认元素存在且可见
2. 检查 GSAP 是否正确导入
3. 确认 ref 已正确绑定到 DOM 元素

### TypeScript 错误

确保正确导入类型：

```typescript
import { AnimationDirection } from "../../../shared/types/animation.types";
```

### 动画冲突

避免同时对同一元素的同一属性创建多个动画，使用 Timeline 管理复杂动画序列。

---

## 相关资源

- [GSAP 官方文档](https://gsap.com/docs/v3/)
- [GSAP Ease Visualizer](https://gsap.com/docs/v3/Eases) - 可视化缓动函数
- [项目使用的 GSAP 版本信息](../bundles/graphics-package/package.json)
