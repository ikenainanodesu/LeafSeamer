import { expect, test, type Page } from "@playwright/test";
import { installNodecgStub, type NodecgSeed, type NodecgStubOptions } from "./nodecg-stub";

const fixedTimestamp = 1_710_000_000_000;
const widths = [320, 480, 768] as const;

const atemSwitcher = { alias: "Studio ATEM", connected: true, ip: "192.168.10.20" };
const atemState = {
  aux: { 0: 1, 1: 2 },
  connected: true,
  inTransition: false,
  macros: { 1: "OPEN", 2: "CLOSE" },
  previewInput: 2,
  programInput: 1,
  sources: { 1: "CAM 1", 2: "CAM 2", 3: "PLAYOUT" },
  transitionPosition: 0,
  transitionRate: 25,
};
const mixerState = {
  channels: [{ faderLevel: 0, id: 1, isMuted: false, name: "Host", patch: "Input 1" }],
  connected: true,
  lastUpdate: fixedTimestamp,
  outputs: [{ faderLevel: 0, id: 1, inputSends: [], isMuted: false, name: "Program" }],
};
const obsConnection = { host: "127.0.0.1", id: "obs-1", name: "Studio OBS", passwordConfigured: true, port: "4455" };
const obsState = {
  connected: true,
  currentScene: "CAM 1",
  currentTransition: "Fade",
  isRecording: false,
  isStreaming: false,
  scenes: [{ index: 0, name: "CAM 1" }, { index: 1, name: "CAM 2" }],
  status: "connected",
  transitions: ["Fade", "Cut"],
};
const matrixConfig = { id: "matrix-1", ip: "192.168.10.42", name: "Studio Matrix", port: 6980, streamName: "Command1" };
const matrixDevices = [
  { connectionId: "matrix-1", inputs: 2, name: "VAIO", outputs: 0, pointDevice: "VAIO", suid: "vaio" },
  { connectionId: "matrix-1", inputs: 0, name: "A1", outputs: 2, pointDevice: "A1", suid: "a1" },
];
const matrixPoint = {
  connectionId: "matrix-1",
  exists: true,
  gain: 0,
  inputChannel: 1,
  inputDevice: "VAIO",
  key: "matrix-1|VAIO|1|A1|1",
  mute: false,
  outputChannel: 1,
  outputDevice: "A1",
  updatedAt: fixedTimestamp,
};

const scheduleSeed = {
  scheduleData: [
    {
      active: true,
      description: "Program open",
      externalId: "",
      id: "",
      metadata: {},
      plannedAt: null,
      revision: "1",
      sourceId: "local",
      state: "ready",
      time: "14:00",
      title: "Opening",
      triggerMappings: [],
    },
    {
      active: true,
      description: "Second local item",
      externalId: "local-two",
      id: "local-two",
      metadata: {},
      plannedAt: null,
      revision: "1",
      sourceId: "local",
      state: "ready",
      time: "14:30",
      title: "Interview",
      triggerMappings: [],
    },
    {
      active: false,
      description: "Synced from adapter",
      externalId: "external-1",
      id: "external-1",
      metadata: {},
      plannedAt: null,
      revision: "4",
      sourceId: "external",
      state: "ready",
      time: "15:00",
      title: "External rundown",
      triggerMappings: [],
    },
  ],
};

const seamerCard = {
  actions: [{ channelId: 1, id: "action-1", level: -1200, type: "mixer-fader" }],
  id: "card-1",
  title: "Program Open",
};
const dynamicTrigger = {
  action: { capabilityId: "start-recording", integrationId: "automation", parameters: { profile: "studio" } },
  condition: { capabilityId: "on-air", integrationId: "automation", parameters: { source: "CAM 1" } },
  delay: 250,
  enabled: true,
  id: "dynamic-trigger",
  name: "Dynamic Trigger",
};
const legacyTrigger = {
  action: { channelId: 1, module: "mixer", property: "isMuted", value: true },
  condition: { channelId: 1, module: "mixer", operator: "gt", property: "faderLevel", value: -10 },
  delay: 0,
  enabled: true,
  id: "legacy-trigger",
  name: "Legacy Trigger",
};
const seamerSeed = {
  seamerCards: [seamerCard],
  seamerIntegrations: {
    automation: {
      available: true,
      id: "automation",
      label: "Automation",
      manifest: {
        actions: [{ displayName: "Start recording", id: "start-recording", parameters: [{ defaultValue: "studio", displayName: "Profile", id: "profile", type: "string" }] }],
        apiVersion: "1",
        displayName: "Automation",
        integrationId: "automation",
        triggers: [{ displayName: "On air", id: "on-air", parameters: [{ defaultValue: "CAM 1", displayName: "Source", id: "source", type: "string" }] }],
      },
      state: {},
    },
  },
  seamerTriggers: [legacyTrigger, dynamicTrigger],
};

const pages: Array<{ name: string; path: string; seed: NodecgSeed }> = [
  { name: "atem-connection", path: "/bundles/atem-control/dashboard/atem-connection.html", seed: { "atem:switchers": [atemSwitcher] } },
  { name: "atem-control", path: "/bundles/atem-control/dashboard/atem-control.html", seed: { "atem:state:192.168.10.20": atemState, "atem:switchers": [atemSwitcher] } },
  { name: "mixer-connection", path: "/bundles/mixer-control/dashboard/mixer-connection.html", seed: { mixerConnectionSettings: { ip: "127.0.0.1", port: "9000", protocol: "udp" }, mixerState } },
  { name: "mixer-panel", path: "/bundles/mixer-control/dashboard/mixer-panel.html", seed: { mixerState } },
  { name: "obs-connection", path: "/bundles/obs-control/dashboard/obs-connection.html", seed: { obsConnections: [obsConnection], obsStates: { "obs-1": obsState } } },
  { name: "obs-control", path: "/bundles/obs-control/dashboard/obs-control-panel.html", seed: { obsConnections: [obsConnection], obsStates: { "obs-1": obsState }, obsStreamSettings: { "obs-1": { keyConfigured: true, passwordConfigured: false, server: "rtmp://example.invalid/live", useAuth: false, username: "" } } } },
  { name: "vb-network", path: "/bundles/vb-matrix-control/dashboard/network-config.html", seed: { hostInfo: { ips: ["192.168.10.10"] }, networkConfigs: [matrixConfig] } },
  { name: "vb-control", path: "/bundles/vb-matrix-control/dashboard/control-panel.html", seed: { activePatches: [], availableDevices: matrixDevices, matrixPoints: [matrixPoint], networkConfigs: [matrixConfig], presets: [] } },
  { name: "logger", path: "/bundles/logger-system/dashboard/log-viewer.html", seed: { availableBundles: ["seamer"], lastLogCleanupAt: 0, logCleanupPeriodMs: 3_600_000, recentLogs: [{ bundle: "seamer", category: "runtime", level: "info", message: "Ready", timestamp: fixedTimestamp }] } },
  { name: "schedule", path: "/bundles/schedule-manager/dashboard/schedule-panel.html", seed: scheduleSeed },
  { name: "seamer", path: "/bundles/seamer/dashboard/seamer.html", seed: seamerSeed },
  { name: "backup", path: "/bundles/backup-system/dashboard/backup-control.html", seed: { backupList: [] } },
];

const setupDashboard = async (page: Page, seed: NodecgSeed, options?: NodecgStubOptions) => {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  await installNodecgStub(page, seed, options);
  return failures;
};

const expectNoRuntimeFailures = (failures: string[]) => expect(failures).toEqual([]);

for (const panel of pages) {
  for (const width of widths) {
    test(`${panel.name} fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      const failures = await setupDashboard(page, panel.seed);
      await page.goto(panel.path);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page.locator("#root")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toBeVisible();
      await expect(page).toHaveScreenshot(`${panel.name}-${width}.png`, { fullPage: true });
      expectNoRuntimeFailures(failures);
    });
  }
}

test("Schedule keeps external entries read-only and persists only local fields", async ({ page }) => {
  const failures = await setupDashboard(page, scheduleSeed);
  await page.goto("/bundles/schedule-manager/dashboard/schedule-panel.html");
  const localItem = page.locator(".schedule-item").filter({ hasText: "Source: local" }).first();
  const externalItem = page.locator(".schedule-item").filter({ hasText: "Source: external" });
  await expect(externalItem.getByRole("button", { name: "Delete schedule item" })).toHaveCount(0);
  for (const input of await externalItem.locator("input").all()) await expect(input).toBeDisabled();
  await localItem.getByLabel("Title").fill("Opening revised");
  const payload = await page.evaluate(() => {
    const calls = (window as any).__nodecgTest.calls;
    return calls.filter((call: any) => call.message === "replaceSchedule").at(-1).payload;
  });
  expect(payload).toEqual([
    { active: true, description: "Program open", id: "", time: "14:00", title: "Opening revised" },
    { active: true, description: "Second local item", id: "local-two", time: "14:30", title: "Interview" },
  ]);
  expectNoRuntimeFailures(failures);
});

test("Schedule deletes the empty local id and restores focus after cancel and confirm", async ({ page }) => {
  const failures = await setupDashboard(page, scheduleSeed);
  await page.goto("/bundles/schedule-manager/dashboard/schedule-panel.html");
  const localItem = page.locator(".schedule-item").filter({ hasText: "Source: local" }).first();
  const deleteButton = localItem.getByRole("button", { name: "Delete schedule item" });
  await deleteButton.click();
  const dialog = page.locator("dialog.leaf-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteButton).toBeFocused();
  await deleteButton.click();
  await dialog.getByRole("button", { name: "Delete Item" }).click();
  await expect(page.getByRole("button", { name: "Add Item" })).toBeFocused();
  const payload = await page.evaluate(() => {
    const calls = (window as any).__nodecgTest.calls;
    return calls.filter((call: any) => call.message === "replaceSchedule").at(-1).payload;
  });
  expect(payload).toEqual([{ active: true, description: "Second local item", id: "local-two", time: "14:30", title: "Interview" }]);
  expectNoRuntimeFailures(failures);
});

test("Seamer tabs, card execution, modal focus, and trigger contracts remain intact", async ({ page }) => {
  const failures = await setupDashboard(page, seamerSeed);
  await page.goto("/bundles/seamer/dashboard/seamer.html");
  const workspace = page.getByRole("tab", { name: "Workspace" });
  const triggers = page.getByRole("tab", { name: "Triggers" });
  await workspace.focus();
  await page.keyboard.press("ArrowRight");
  await expect(triggers).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(workspace).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(triggers).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(workspace).toHaveAttribute("aria-selected", "true");

  const card = page.locator("article.seamer-card").filter({ hasText: "Program Open" });
  await card.getByRole("button", { name: "Run" }).click();
  const runPayload = await page.evaluate(() => (window as any).__nodecgTest.calls.find((call: any) => call.message === "runSeamerCard").payload);
  expect(runPayload).toEqual(seamerCard);

  const editButton = card.getByRole("button", { name: "Edit card" });
  await editButton.click();
  const dialog = page.getByRole("dialog", { name: "Edit Card" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(editButton).toBeFocused();

  await triggers.click();
  await expect(page.locator("article.seamer-trigger").filter({ hasText: "Legacy Trigger" })).toContainText("Mixer CH1");
  const dynamicArticle = page.locator("article.seamer-trigger").filter({ hasText: "Dynamic Trigger" });
  await expect(dynamicArticle).toContainText("automation.on-air");
  await dynamicArticle.getByRole("button", { name: "Edit trigger" }).click();
  const triggerDialog = page.getByRole("dialog", { name: "Edit Trigger" });
  await triggerDialog.getByLabel("Name").fill("Dynamic Trigger Updated");
  await triggerDialog.getByRole("button", { name: "Save" }).click();
  const savedTriggers = await page.evaluate(() => (window as any).nodecg.Replicant("seamerTriggers").value);
  expect(savedTriggers).toEqual([legacyTrigger, { ...dynamicTrigger, name: "Dynamic Trigger Updated" }]);
  expectNoRuntimeFailures(failures);
});

test("Backup protects L3 creation and reports pending, error, and success states", async ({ page }) => {
  const failures = await setupDashboard(page, { backupList: [] }, { pendingMessages: ["createBackup"] });
  await page.goto("/bundles/backup-system/dashboard/backup-control.html");
  const create = page.getByRole("button", { name: "Create Backup" });
  await page.locator("label.backup-level", { hasText: "L3 Secret" }).locator("input").check();
  await expect(create).toBeDisabled();
  await page.getByLabel("I understand that this backup contains encrypted secret data.").check();
  const passphrase = page.getByLabel("Separate Passphrase");
  await passphrase.fill("12345678901");
  await expect(create).toBeDisabled();
  await passphrase.fill("123456789012");
  await expect(create).toBeEnabled();

  await create.click();
  await expect(page.getByRole("button", { name: "Creating Backup" })).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("[aria-live='polite']")).toContainText("Backup creation in progress.");
  const payload = await page.evaluate(() => (window as any).__nodecgTest.calls.find((call: any) => call.message === "createBackup").payload);
  expect(payload).toEqual({ includeSecrets: true, levels: ["L0", "L1", "L3"], secretPassphrase: "123456789012" });
  await page.evaluate(() => (window as any).__nodecgTest.reject("createBackup", "disk full"));
  await expect(page.getByRole("alert")).toContainText("Backup failed: disk full");
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();

  await create.click();
  await page.evaluate(() => (window as any).__nodecgTest.resolve("createBackup"));
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Backup" })).toBeEnabled();
  expectNoRuntimeFailures(failures);
});
