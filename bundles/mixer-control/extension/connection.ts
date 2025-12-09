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
    this.logger.setNodeCG(nodecg);
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

  setFaderLevel(channelId: number, level: number) {
    if (this.tcpClient && this.shouldBeConnected) {
      const index = channelId - 1;
      // Yamaha RCP expects value in 0.01dB steps? No, usually it's raw values or specific scale.
      // Assuming 'level' passed here is the raw value expected by the mixer (e.g. -32768 to 1000)
      // Or if it's dB * 100.
      // Based on logs: "NOTIFY set ... -1640" -> -16.40dB. So it is dB * 100.
      this.tcpClient.write(
        `set "MIXER:Current/InCh/Fader/Level" ${index} 0 ${level}\n`
      );
    }
  }

  setMute(channelId: number, isMuted: boolean) {
    if (this.tcpClient && this.shouldBeConnected) {
      const index = channelId - 1;
      // On = 1 (Unmuted), Off = 0 (Muted)
      const value = isMuted ? 0 : 1;
      this.tcpClient.write(
        `set "MIXER:Current/InCh/Fader/On" ${index} 0 ${value}\n`
      );
    }
  }

  setOutputFaderLevel(outputId: number, level: number) {
    if (this.tcpClient && this.shouldBeConnected) {
      // 1-6: Mix 1-6 (Index 0-5)
      // 7: Stereo L, 8: Stereo R (Both use St/Fader/Level 0 0 usually, or separate?)
      // DM3 Stereo is usually one fader. Let's assume ID 7/8 control the same Stereo Master.
      if (outputId <= 6) {
        const index = outputId - 1;
        this.tcpClient.write(
          `set "MIXER:Current/Mix/Fader/Level" ${index} 0 ${level}\n`
        );
      } else if (outputId === 7 || outputId === 8) {
        this.tcpClient.write(
          `set "MIXER:Current/St/Fader/Level" 0 0 ${level}\n`
        );
      }
    }
  }

  setOutputMute(outputId: number, isMuted: boolean) {
    if (this.tcpClient && this.shouldBeConnected) {
      const value = isMuted ? 0 : 1;
      if (outputId <= 6) {
        const index = outputId - 1;
        this.tcpClient.write(
          `set "MIXER:Current/Mix/Fader/On" ${index} 0 ${value}\n`
        );
      } else if (outputId === 7 || outputId === 8) {
        this.tcpClient.write(`set "MIXER:Current/St/Fader/On" 0 0 ${value}\n`);
      }
    }
  }

  queryOutputRouting(outputId: number) {
    if (this.tcpClient && this.shouldBeConnected) {
      this.logger.info(`Querying routing for Output ${outputId}`);

      // Query all 16 input channels to this output
      for (let i = 0; i < 16; i++) {
        if (outputId <= 6) {
          // Mix 1-6
          const mixIndex = outputId - 1;
          this.tcpClient.write(
            `get "MIXER:Current/InCh/ToMix/On" ${i} ${mixIndex}\n`
          );
          this.tcpClient.write(
            `get "MIXER:Current/InCh/ToMix/Level" ${i} ${mixIndex}\n`
          );
        } else if (outputId === 7 || outputId === 8) {
          // Stereo L/R
          this.tcpClient.write(`get "MIXER:Current/InCh/ToSt/On" ${i} 0\n`);
          this.tcpClient.write(`get "MIXER:Current/InCh/ToSt/Level" ${i} 0\n`);
        }
      }
    }
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
      // Check for Mix Fader Level
      else if (content.includes("MIXER:Current/Mix/Fader/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Fader\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const level = parseInt(match[2]);
          this.stateManager.updateOutput(mixIndex + 1, { faderLevel: level });
        }
      }
      // Check for Mix Name
      else if (content.includes("MIXER:Current/Mix/Label/Name")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Label\/Name"?\s+(\d+)\s+0\s+"?([^"\n]+)"?/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const name = match[2];
          this.stateManager.updateOutput(mixIndex + 1, { name: name });
        }
      }
      // Check for Mix Mute
      else if (content.includes("MIXER:Current/Mix/Fader/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Fader\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const isMuted = onValue === 0;
          this.stateManager.updateOutput(mixIndex + 1, { isMuted: isMuted });
        }
      }
      // Check for Stereo Fader Level
      else if (content.includes("MIXER:Current/St/Fader/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/St\/Fader\/Level"?\s+0\s+0\s+(-?\d+)/
        );
        if (match) {
          const level = parseInt(match[1]);
          // Update both Stereo L (7) and R (8)
          this.stateManager.updateOutput(7, { faderLevel: level });
          this.stateManager.updateOutput(8, { faderLevel: level });
        }
      }
      // Check for Stereo Mute
      else if (content.includes("MIXER:Current/St/Fader/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/St\/Fader\/On"?\s+0\s+0\s+(\d+)/
        );
        if (match) {
          const onValue = parseInt(match[1]);
          const isMuted = onValue === 0;
          this.stateManager.updateOutput(7, { isMuted: isMuted });
          this.stateManager.updateOutput(8, { isMuted: isMuted });
        }
      }
      // Check for InCh ToMix On (Routing)
      else if (content.includes("MIXER:Current/InCh/ToMix/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/On"?\s+(\d+)\s+(\d+)\s+(\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const mixIndex = parseInt(match[2]);
          const onValue = parseInt(match[3]);
          const active = onValue === 1;

          // Update the corresponding output (Mix 1 = outputId 1, etc.)
          const outputId = mixIndex + 1;
          this.updateOutputInputSend(outputId, inputIndex + 1, { active });
        }
      }
      // Check for InCh ToMix Level
      else if (content.includes("MIXER:Current/InCh/ToMix/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/Level"?\s+(\d+)\s+(\d+)\s+(-?\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const mixIndex = parseInt(match[2]);
          const level = parseInt(match[3]);

          // Debug logging
          this.logger.info(
            `Parsed ToMix Level: Input ${inputIndex}, Mix ${mixIndex}, Level ${level}`
          );

          const outputId = mixIndex + 1;
          this.updateOutputInputSend(outputId, inputIndex + 1, { level });
        }
      }
      // Check for InCh ToSt On (Routing to Stereo)
      else if (content.includes("MIXER:Current/InCh/ToSt/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToSt\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const active = onValue === 1;

          // Update both Stereo L (7) and R (8)
          this.updateOutputInputSend(7, inputIndex + 1, { active });
          this.updateOutputInputSend(8, inputIndex + 1, { active });
        }
      }
      // Check for InCh ToSt Level
      else if (content.includes("MIXER:Current/InCh/ToSt/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToSt\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const level = parseInt(match[2]);

          // Debug logging
          this.logger.info(
            `Parsed ToSt Level: Input ${inputIndex}, Level ${level}`
          );

          this.updateOutputInputSend(7, inputIndex + 1, { level });
          this.updateOutputInputSend(8, inputIndex + 1, { level });
        }
      }
    }
  }

  private updateOutputInputSend(
    outputId: number,
    inputId: number,
    data: { active?: boolean; level?: number }
  ) {
    const mixerState = this.stateManager.getMixerState();
    const outputs = mixerState?.outputs;
    if (!outputs) return;

    const output = outputs.find((o: any) => o.id === outputId);
    if (!output) return;

    // Find or create the inputSend entry
    let send = output.inputSends.find((s: any) => s.inputId === inputId);
    if (!send) {
      // Get input name from channels
      const channels = mixerState?.channels;
      const inputChannel = channels?.find((c: any) => c.id === inputId);
      const inputName = inputChannel?.name || `CH${inputId}`;

      send = {
        inputId: inputId,
        inputName: inputName,
        active: false,
        level: -32768,
      };
      output.inputSends.push(send);
    }

    // Update the send data
    if (data.active !== undefined) {
      send.active = data.active;
    }
    if (data.level !== undefined) {
      send.level = data.level;
    }

    // Trigger replicant update
    if (mixerState) {
      mixerState.lastUpdate = Date.now();
    }
  }

  private startHeartbeat() {
    // RCP Heartbeat / Polling
    setInterval(() => {
      if (this.tcpClient && this.shouldBeConnected) {
        // Query Channels 1-16 (Indices 0-15)
        for (let i = 0; i < 16; i++) {
          this.tcpClient.write(`get "MIXER:Current/InCh/Fader/Level" ${i} 0\n`);
          this.tcpClient.write(`get "MIXER:Current/InCh/Label/Name" ${i} 0\n`);
          this.tcpClient.write(`get "MIXER:Current/InCh/Fader/On" ${i} 0\n`); // Mute status
        }

        // Query Mix 1-6 (Indices 0-5)
        for (let i = 0; i < 6; i++) {
          this.tcpClient.write(`get "MIXER:Current/Mix/Fader/Level" ${i} 0\n`);
          this.tcpClient.write(`get "MIXER:Current/Mix/Label/Name" ${i} 0\n`);
          this.tcpClient.write(`get "MIXER:Current/Mix/Fader/On" ${i} 0\n`);
        }
        // Query Stereo L/R (Index 0)
        this.tcpClient.write(`get "MIXER:Current/St/Fader/Level" 0 0\n`);
        this.tcpClient.write(`get "MIXER:Current/St/Fader/On" 0 0\n`);
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
