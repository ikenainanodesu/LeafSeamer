import gsap from "gsap";

// Lower Third 只保留自身使用的两组动画，避免依赖仓库级工具。
export const createLowerThirdEntranceAnimation = (
  line1: HTMLElement,
  line2: HTMLElement,
  _config?: unknown
) =>
  gsap
    .timeline()
    .fromTo(
      line1,
      { x: -300, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: "back.out" }
    )
    .fromTo(
      line2,
      { x: -300, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: "back.out" },
      0.2
    );

export const createLowerThirdExitAnimation = (
  line1: HTMLElement,
  line2: HTMLElement,
  _config?: unknown
) =>
  gsap
    .timeline()
    .to(line2, { x: -300, opacity: 0, duration: 0.5, ease: "back.in" })
    .to(
      line1,
      { x: -300, opacity: 0, duration: 0.5, ease: "back.in" },
      0.3
    );
