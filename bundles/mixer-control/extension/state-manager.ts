import NodeCG from "nodecg/types";
// State Manager for Mixer Control
import {
  MixerState,
  MixerChannel,
  MixerOutput,
} from "../../../shared/types/mixer.types";
import { getCurrentTimestamp } from "../../../shared/utils/timestamp";

export class StateManager {
  private nodecg: NodeCG.ServerAPI;
  private mixerStateRep: any;
  private mixerChannelsRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.mixerStateRep = nodecg.Replicant<MixerState>("mixerState", {
      defaultValue: {
        connected: false,
        channels: [],
        outputs: [],
        lastUpdate: 0,
      },
    });

    // Force disconnected state on startup
    this.mixerStateRep.value.connected = false;

    this.mixerChannelsRep = nodecg.Replicant<MixerChannel[]>("mixerChannels", {
      defaultValue: [],
    });
    // Initialize default channels if empty
    if (this.mixerStateRep.value.channels.length === 0) {
      this.mixerStateRep.value.channels = Array.from(
        { length: 32 },
        (_, i) => ({
          id: i + 1,
          name: `CH ${i + 1}`,
          faderLevel: 0,
          isMuted: false,
          inputSource: `IN ${i + 1}`,
        })
      );
    }

    // Initialize default outputs if empty
    if (
      !this.mixerStateRep.value.outputs ||
      this.mixerStateRep.value.outputs.length === 0
    ) {
      this.mixerStateRep.value.outputs = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: i < 6 ? `Mix ${i + 1}` : i === 6 ? "Stereo L" : "Stereo R",
        faderLevel: -32768,
        isMuted: true,
        inputSends: [],
      }));
    }
  }

  setConnected(connected: boolean) {
    if (this.mixerStateRep.value.connected !== connected) {
      this.mixerStateRep.value.connected = connected;
      this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
    }
  }

  updateChannel(channelId: number, data: Partial<MixerChannel>) {
    const channels = this.mixerStateRep.value.channels;
    const index = channels.findIndex((c: MixerChannel) => c.id === channelId);

    if (index !== -1) {
      const channel = channels[index];
      let changed = false;

      if (
        data.faderLevel !== undefined &&
        channel.faderLevel !== data.faderLevel
      ) {
        channel.faderLevel = data.faderLevel;
        changed = true;
      }
      if (data.isMuted !== undefined && channel.isMuted !== data.isMuted) {
        channel.isMuted = data.isMuted;
        changed = true;
      }
      if (
        data.inputSource !== undefined &&
        channel.inputSource !== data.inputSource
      ) {
        channel.inputSource = data.inputSource;
        changed = true;
      }

      if (data.name !== undefined && channel.name !== data.name) {
        channel.name = data.name;
        changed = true;
      }

      if (changed) {
        this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
        // Force Replicant update by reassigning (sometimes needed for deep arrays)
        // this.mixerStateRep.value.channels[index] = { ...channel };
        // Or just rely on the proxy. Let's log first.
        // console.log(`StateManager: Updated CH${channelId}`, data);
      }
    } else {
      // console.warn(`StateManager: Channel ${channelId} not found`);
    }
  }

  updateOutput(outputId: number, data: Partial<MixerOutput>) {
    const outputs = this.mixerStateRep.value.outputs;
    if (!outputs) return;

    const index = outputs.findIndex((o: MixerOutput) => o.id === outputId);

    if (index !== -1) {
      const output = outputs[index];
      let changed = false;

      if (
        data.faderLevel !== undefined &&
        output.faderLevel !== data.faderLevel
      ) {
        output.faderLevel = data.faderLevel;
        changed = true;
      }
      if (data.isMuted !== undefined && output.isMuted !== data.isMuted) {
        output.isMuted = data.isMuted;
        changed = true;
      }
      if (data.name !== undefined && output.name !== data.name) {
        output.name = data.name;
        changed = true;
      }
      if (data.inputSends !== undefined) {
        output.inputSends = data.inputSends;
        changed = true;
      }

      if (changed) {
        this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
      }
    }
  }

  updateInputSend(
    outputId: number,
    inputId: number,
    data: { active?: boolean; level?: number; pre?: boolean; pan?: number }
  ) {
    const outputs = this.mixerStateRep.value.outputs;
    if (!outputs) return;

    const outputIndex = outputs.findIndex(
      (o: MixerOutput) => o.id === outputId
    );
    if (outputIndex === -1) return;

    const output = outputs[outputIndex];
    let sendIndex = output.inputSends.findIndex(
      (s: any) => s.inputId === inputId
    );

    let changed = false;

    // If sends doesn't exist, Create it
    if (sendIndex === -1) {
      const channels = this.mixerStateRep.value.channels;
      const inputChannel = channels?.find((c: any) => c.id === inputId);
      const inputName = inputChannel?.name || `CH${inputId}`;

      const newSend = {
        inputId: inputId,
        inputName: inputName,
        active: data.active !== undefined ? data.active : false,
        level: data.level !== undefined ? data.level : -32768,
        pre: data.pre !== undefined ? data.pre : false, // Default Post
        pan: data.pan !== undefined ? data.pan : 0, // Default Center
      };

      // Push to array
      output.inputSends.push(newSend);
      sendIndex = output.inputSends.length - 1;
      changed = true;
    } else {
      // Update existing
      const send = output.inputSends[sendIndex];
      // Init missing properties if they don't exist
      if (send.pre === undefined) send.pre = false;
      if (send.pan === undefined) send.pan = 0;

      if (data.active !== undefined && send.active !== data.active) {
        send.active = data.active;
        changed = true;
      }
      if (data.level !== undefined && send.level !== data.level) {
        send.level = data.level;
        changed = true;
      }
      if (data.pre !== undefined && send.pre !== data.pre) {
        send.pre = data.pre;
        changed = true;
      }
      if (data.pan !== undefined && send.pan !== data.pan) {
        send.pan = data.pan;
        changed = true;
      }
    }

    if (changed) {
      this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();

      // CRITICAL: Force Replicant update for deep nested arrays
      // NodeCG Replicants (using proxies) sometimes miss changes deep in arrays unless we trigger a set
      // Re-assigning the specific send object back to the array helps, or re-assigning the array
      if (sendIndex !== -1) {
        // Re-assign the specific item to ensure the proxy detects the write
        output.inputSends[sendIndex] = { ...output.inputSends[sendIndex] };
      }
    }
  }

  getMixerState() {
    return this.mixerStateRep.value;
  }
}
