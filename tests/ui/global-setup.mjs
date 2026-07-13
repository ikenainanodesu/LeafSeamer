import {
  startDashboardServer,
  stopDashboardServer,
} from "../../scripts/serve-dashboard-ui.mjs";

export default async function globalSetup() {
  const server = await startDashboardServer();
  return async () => {
    await stopDashboardServer(server);
  };
}
