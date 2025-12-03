import { Client, Server } from "node-osc";
import * as net from "net";
import NodeCG from "nodecg/types";
import { StateManager } from "./state-manager";
import { createLogger } from "../../../shared/utils/logger";
import { MixerConnectionSettings } from "../../../shared/types/mixer.types";

export class ConnectionManager {
  private nodecg: NodeCG.ServerAPI;
  private stateManager: StateManager;
  private udpClient: Client | null = null;
  private udpServer: Server | null = null;
  private tcpClient: net.Socket | null = null;
  private logger = createLogger("MixerConnection");
  private config: any;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private shouldBeConnected = false;
  private buffer = ""; // Buffer for TCP data

  constructor(nodecg: NodeCG.ServerAPI, stateManager: StateManager) {
    this.nodecg = nodecg;
    this.stateManager = stateManager;
    this.config = nodecg.bundleConfig;
  }

  async connect(params?: {
    ip: string;
    port: number;
    protocol: "udp" | "tcp";
  }) {
    this.shouldBeConnected = true;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Get settings from Replicant
    const settingsRep = this.nodecg.Replicant<MixerConnectionSettings>(
      "mixerConnectionSettings"
    );
    const settings = settingsRep.value;

    const ip =
      params?.ip ||
      settings?.ip ||
      this.config.mixer?.defaultIP ||
      "192.168.0.128";
    const port =
      params?.port ||
      (settings?.port ? parseInt(settings.port) : undefined) ||
      this.config.mixer?.defaultPort ||
      49280; // Yamaha RCP default port
    const protocol = params?.protocol || settings?.protocol || "tcp"; // RCP uses TCP

    // Update Replicant if params are provided
    if (params) {
      settingsRep.value = {
        ip: params.ip,
        port: params.port.toString(),
        protocol: params.protocol,
      };
    }

    this.logger.info(`Connecting to mixer at ${ip}:${port} via ${protocol}`);

    try {
      // Yamaha RCP is TCP based
      this.connectTCP(ip, port);
    } catch (error: any) {
      this.logger.error("Failed to connect to mixer", error);
      this.stateManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    }
  }

  private connectTCP(ip: string, port: number) {
    this.closeConnections();

    this.tcpClient = new net.Socket();

    this.tcpClient.connect(port, ip, () => {
      this.logger.info("TCP Connected (RCP)");
      this.stateManager.setConnected(true);
      this.startHeartbeat();
    });

    this.tcpClient.on("data", (data) => {
      this.buffer += data.toString();

      // Process complete lines
      let lineEnd;
      while ((lineEnd = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.substring(0, lineEnd).trim();
        this.buffer = this.buffer.substring(lineEnd + 1);
        if (line) {
          this.handleRCPMessage(line);
        }
      }
    });

    this.tcpClient.on("close", () => {
      this.logger.warn("TCP Connection closed");
      this.stateManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    });

    this.tcpClient.on("error", (err) => {
      this.logger.error("TCP Connection error", err);
      this.stateManager.setConnected(false);
    });
  }

  private closeConnections() {
    if (this.udpClient) {
      this.udpClient.close();
      this.udpClient = null;
    }
    if (this.udpServer) {
      this.udpServer.close();
      this.udpServer = null;
    }
    if (this.tcpClient) {
      this.tcpClient.destroy();
      this.tcpClient = null;
    }
  }

  disconnect() {
    this.shouldBeConnected = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.closeConnections();
    this.stateManager.setConnected(false);
    this.logger.info("Manually disconnected from mixer");
  }

  private handleRCPMessage(line: string) {
    this.logger.info(`RCP RX: ${line}`);

    // Example RCP lines from logs:
    // OK get MIXER:Current/InCh/Fader/Level 0 0 -1630
    // OK get MIXER:Current/InCh/Label/Name 0 0 "Main_L"
    // NOTIFY set MIXER:Current/InCh/Fader/Level 0 0 -1640 "-16.40"

    if (line.startsWith("OK") || line.startsWith("NOTIFY")) {
      // Remove OK/NOTIFY prefix to simplify
      const content = line.replace(/^(OK|NOTIFY)\s+/, "");

      // Check for Fader Level
      if (content.includes("MIXER:Current/InCh/Fader/Level")) {
        // Regex to capture: (get|set)? "path"? ch 0 value
        // Matches: "get MIXER... 0 0 -1630" or "set MIXER... 0 0 -1640 ..."
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Fader\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const chIndex = parseInt(match[1]); // 0-based
          const value = parseInt(match[2]);
          this.stateManager.updateChannel(chIndex + 1, { faderLevel: value });
          this.logger.info(`Updated CH${chIndex + 1} fader: ${value}`);
        }
      }
      // Check for Name
      else if (content.includes("MIXER:Current/InCh/Label/Name")) {
        // Regex to capture: (get|set)? "path"? ch 0 "Name"
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Label\/Name"?\s+(\d+)\s+0\s+"([^"]+)"/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const name = match[2];
          this.stateManager.updateChannel(chIndex + 1, { name: name });
          this.logger.info(`Updated CH${chIndex + 1} name: ${name}`);
        }
      }
      // Check for Mute (On)
      else if (content.includes("MIXER:Current/InCh/Fader/On")) {
        // 0 = Muted (Off), 1 = Unmuted (On)
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Fader\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const isMuted = onValue === 0;
          this.stateManager.updateChannel(chIndex + 1, { isMuted: isMuted });
          this.logger.info(`Updated CH${chIndex + 1} muted: ${isMuted}`);
        }
      }
      // Check for Input Source (Guessing path, logging will confirm)
      else if (
        content.includes("MIXER:Current/InCh/Patch/InChSource") ||
        content.includes("MIXER:Current/InCh/Input/Source")
      ) {
        // Try to capture whatever is at the end
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/(?:Patch\/InChSource|Input\/Source)"?\s+(\d+)\s+0\s+"?([^"\s]+)"?/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const source = match[2];
          this.stateManager.updateChannel(chIndex + 1, { inputSource: source });
          this.logger.info(`Updated CH${chIndex + 1} source: ${source}`);
        }
      }
    }
  }

  private startHeartbeat() {
    // RCP Heartbeat / Polling
    setInterval(() => {
      if (this.tcpClient && this.shouldBeConnected) {
        // Query Channel 1 (Index 0)
        this.tcpClient.write('get "MIXER:Current/InCh/Fader/Level" 0 0\n');
        this.tcpClient.write('get "MIXER:Current/InCh/Label/Name" 0 0\n');
        this.tcpClient.write('get "MIXER:Current/InCh/Fader/On" 0 0\n'); // Mute status
        // Try guessing input source paths
        // this.tcpClient.write('get "MIXER:Current/InCh/Patch/InChSource" 0 0\n');
      }
    }, 5000);
  }

  private scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.logger.info("Scheduling mixer reconnect in 5s...");
      this.reconnectInterval = setInterval(() => {
        this.logger.info("Attempting to reconnect to mixer...");
        // Retrieve latest settings to reconnect
        const settingsRep = this.nodecg.Replicant<MixerConnectionSettings>(
          "mixerConnectionSettings"
        );
        const settings = settingsRep.value;
        if (settings) {
          this.connect();
        }
      }, 5000);
    }
  }
}
