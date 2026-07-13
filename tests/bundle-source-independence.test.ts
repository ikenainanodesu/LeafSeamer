import fs from "node:fs";
import path from "node:path";
import { deepEqual, equal, test } from "./test-harness";
import { CORE_SNAPSHOT_TARGETS } from "../scripts/sync-bundle-core";

const projectRoot = path.resolve(__dirname, "..");
const expectedTargets = [
  "atem-control",
  "logger-system",
  "obs-control",
  "schedule-manager",
  "seamer",
  "seamer-adapter-atem",
  "seamer-adapter-mixer",
  "seamer-adapter-obs",
  "seamer-adapter-schedule",
  "seamer-adapter-vb",
  "vb-matrix-control",
];

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });

test("core snapshot target list is explicit and stable", () => {
  deepEqual(CORE_SNAPSHOT_TARGETS, expectedTargets);
});

test("bundle source does not import repository shared directories", () => {
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const bundleDir = path.join(projectRoot, "bundles", bundle);
    for (const file of sourceFiles(bundleDir)) {
      if (file.includes(`${path.sep}src${path.sep}_leaf-core${path.sep}`)) continue;
      const source = fs.readFileSync(file, "utf8");
      equal(/from\s+["'][^"']*\.\.\/[^"']*shared\//.test(source), false);
    }
  }
});
