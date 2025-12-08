import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ command, mode }) => {
  // 从环境变量获取bundle名称
  const bundleName = process.env.BUNDLE_NAME;

  if (!bundleName) {
    throw new Error("BUNDLE_NAME environment variable is required");
  }

  const bundlePath = path.resolve(__dirname, "bundles", bundleName);
  const extensionDir = path.join(bundlePath, "extension");
  const entryFile = path.join(extensionDir, "index.ts");

  return {
    build: {
      lib: {
        entry: entryFile,
        formats: ["cjs"], // NodeCG extension 需要 CommonJS 格式
        fileName: () => "index.js",
      },
      outDir: extensionDir,
      emptyOutDir: false, // 不清空输出目录
      sourcemap: mode === "development", // 仅开发环境生成 sourcemap
      minify: false,
      rollupOptions: {
        external: [
          // NodeCG 相关
          "nodecg/types",
          "nodecg",
          /^@nodecg\/.*/,

          // Node.js 内置模块
          /^node:.*/,
          "fs",
          "path",
          "util",
          "events",
          "stream",
          "buffer",
          "child_process",
          "crypto",
          "os",
          "net",
          "dgram",

          // 第三方依赖（不打包进 bundle）
          "node-osc",
          "obs-websocket-js",
          "archiver",
          "async",
          "googleapis",
        ],
        output: {
          // 确保输出为 CommonJS 格式
          format: "cjs",
          exports: "auto",
          // 保留原始文件结构（不使用 hash）
          entryFileNames: "index.js",
        },
      },
    },
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
  };
});
