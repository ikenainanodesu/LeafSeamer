import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { glob } from "glob";

export default defineConfig(({ command, mode }) => {
  // 从环境变量获取bundle名称
  const bundleName = process.env.BUNDLE_NAME;

  if (!bundleName) {
    throw new Error("BUNDLE_NAME environment variable is required");
  }

  const bundlePath = path.resolve(__dirname, "bundles", bundleName);
  const srcDir = path.join(bundlePath, "src");

  // 自动发现所有 HTML 入口文件
  const dashboardEntries = glob.sync("dashboard/**/*.html", {
    cwd: srcDir,
    absolute: true,
  });

  const graphicsEntries = glob.sync("graphics/**/*.html", {
    cwd: srcDir,
    absolute: true,
  });

  const input: Record<string, string> = {};

  // 处理所有HTML入口
  [...dashboardEntries, ...graphicsEntries].forEach((entry) => {
    // 获取相对于src的路径
    const relativeToSrc = path.relative(srcDir, entry);
    // 例如: dashboard/mixer-connection.html -> dashboard/mixer-connection
    const name = relativeToSrc.replace(/\\\\/g, "/").replace(/\\.html$/, "");
    input[name] = entry;
  });

  if (Object.keys(input).length === 0) {
    console.warn(`Warning: No HTML entry points found in ${bundleName}/src`);
  }

  return {
    root: srcDir,
    base: "./",
    plugins: [react()],
    build: {
      outDir: bundlePath, // 输出到bundle根目录
      emptyOutDir: false, // 不清空输出目录(因为extension编译文件也在这里)
      sourcemap: mode === "development", // 仅开发环境生成sourcemap
      minify: mode === "production",
      rollupOptions: {
        input,
        output: {
          // 将JS/CSS资源输出到assets目录
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
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
