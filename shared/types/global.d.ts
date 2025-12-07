import { NodeCG } from "nodecg/types/browser";

declare global {
  const nodecg: NodeCG;
}

// 允许导入 CSS 文件
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
