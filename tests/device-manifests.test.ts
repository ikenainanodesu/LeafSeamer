import { atemManifest } from "../bundles/seamer-adapter-atem/extension/manifest";
import { mixerManifest } from "../bundles/seamer-adapter-mixer/extension/manifest";
import { obsManifest } from "../bundles/seamer-adapter-obs/extension/manifest";
import { vbManifest } from "../bundles/seamer-adapter-vb/extension/manifest";
import { validateCapabilityManifest } from "../shared/integration/schema";
import { equal, test } from "./test-harness";

const manifests = [atemManifest, mixerManifest, obsManifest, vbManifest];

test("device adapter manifests are valid and uniquely named", () => {
  equal(new Set(manifests.map((manifest) => manifest.integrationId)).size, 4);
  for (const manifest of manifests) {
    equal(validateCapabilityManifest(manifest).length, 0);
    equal(manifest.triggers.length > 0, true);
    equal(manifest.actions.length > 0, true);
  }
});

test("device adapter capabilities use unique ids", () => {
  for (const manifest of manifests) {
    equal(
      new Set(manifest.triggers.map((capability) => capability.id)).size,
      manifest.triggers.length
    );
    equal(
      new Set(manifest.actions.map((capability) => capability.id)).size,
      manifest.actions.length
    );
  }
});
