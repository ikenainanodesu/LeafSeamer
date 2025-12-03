import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { glob } from "glob";
import path from "path";

// Find all HTML files in dashboard and graphics directories
const htmlFiles = glob.sync("bundles/**/{dashboard,graphics}/*.html");

// Create an input object
const input: Record<string, string> = {};
htmlFiles.forEach((file) => {
  // Key: bundles/obs-control/dashboard/obs-dashboard
  // This preserves the structure in the output directory
  const name = path
    .relative(".", file)
    .replace(/\\/g, "/")
    .replace(/\.html$/, "");
  input[name] = path.resolve(__dirname, file);
});

export default defineConfig({
  plugins: [react()],
  root: "./",
  base: "./", // Use relative paths for assets
  build: {
    outDir: "dist/browser",
    emptyOutDir: true,
    rollupOptions: {
      input: input,
    },
  },
  resolve: {
    alias: {
      // Add aliases if needed, e.g. for shared code
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
