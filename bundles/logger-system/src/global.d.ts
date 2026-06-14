import { NodeCG } from "nodecg/types/browser";

declare global {
  const nodecg: NodeCG;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
