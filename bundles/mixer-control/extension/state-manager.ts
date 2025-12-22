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
    // We can do this immutably too to be consistent
    this.mixerStateRep.value = {
      ...this.mixerStateRep.value,
      connected: false,
    };

    this.mixerChannelsRep = nodecg.Replicant<MixerChannel[]>("mixerChannels", {
      defaultValue: [],
    });

    // Initialize default channels if empty
    if (this.mixerStateRep.value.channels.length === 0) {
      const channels = Array.from({ length: 32 }, (_, i) => ({
        id: i + 1,
        name: `CH ${i + 1}`,
        faderLevel: 0,
        isMuted: false,
        inputSource: `IN ${i + 1}`,
      }));
      this.mixerStateRep.value = { ...this.mixerStateRep.value, channels };
    }

    // Initialize default outputs if empty
    if (
      !this.mixerStateRep.value.outputs ||
      this.mixerStateRep.value.outputs.length === 0
    ) {
      const outputs = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: i < 6 ? `Mix ${i + 1}` : i === 6 ? "Stereo L" : "Stereo R",
        faderLevel: -32768,
        isMuted: true,
        inputSends: [],
      }));
      this.mixerStateRep.value = { ...this.mixerStateRep.value, outputs };
    }
  }

  setConnected(connected: boolean) {
    if (this.mixerStateRep.value.connected !== connected) {
      this.mixerStateRep.value = {
        ...this.mixerStateRep.value,
        connected,
        lastUpdate: getCurrentTimestamp(),
      };
    }
  }

  updateChannel(channelId: number, data: Partial<MixerChannel>) {
    const currentChannels = this.mixerStateRep.value.channels || [];
    const index = currentChannels.findIndex((c: any) => c.id === channelId);

    if (index !== -1) {
      const newChannels = [...currentChannels];
      newChannels[index] = { ...newChannels[index], ...data };

      this.mixerStateRep.value = {
        ...this.mixerStateRep.value,
        channels: newChannels,
        lastUpdate: getCurrentTimestamp(),
      };
    }
  }

  updateOutput(outputId: number, data: Partial<MixerOutput>) {
    const currentOutputs = this.mixerStateRep.value.outputs || [];
    const index = currentOutputs.findIndex((o: any) => o.id === outputId);

    if (index !== -1) {
      const newOutputs = [...currentOutputs];
      newOutputs[index] = { ...newOutputs[index], ...data };

      this.mixerStateRep.value = {
        ...this.mixerStateRep.value,
        outputs: newOutputs,
        lastUpdate: getCurrentTimestamp(),
      };
    }
  }

  updateInputSend(
    outputId: number,
    inputId: number,
    data: { active?: boolean; level?: number; pre?: boolean; pan?: number }
  ) {
    const currentOutputs = this.mixerStateRep.value.outputs || [];
    const outputIndex = currentOutputs.findIndex((o: any) => o.id === outputId);
    if (outputIndex === -1) return;

    const currentOutput = currentOutputs[outputIndex];
    const currentSends = currentOutput.inputSends || [];
    let sendIndex = currentSends.findIndex((s: any) => s.inputId === inputId);

    let newSends = [...currentSends];

    // If sends doesn't exist, Create it
    if (sendIndex === -1) {
      // Need channel name lookup?
      const inputChannel = (this.mixerStateRep.value.channels || []).find(
        (c: any) => c.id === inputId
      );
      const inputName = inputChannel?.name || `CH${inputId}`;

      const newSend = {
        inputId: inputId,
        inputName: inputName,
        active: data.active !== undefined ? data.active : false,
        level: data.level !== undefined ? data.level : -32768,
        pre: data.pre !== undefined ? data.pre : false, // Default Post
        pan: data.pan !== undefined ? data.pan : 0, // Default Center
      };

      newSends.push(newSend);
    } else {
      // Update existing
      newSends[sendIndex] = { ...newSends[sendIndex], ...data };
    }

    // Update Output with new Sends, then update State
    const newOutputs = [...currentOutputs];
    newOutputs[outputIndex] = {
      ...newOutputs[outputIndex],
      inputSends: newSends,
    };

    this.mixerStateRep.value = {
      ...this.mixerStateRep.value,
      outputs: newOutputs,
      lastUpdate: getCurrentTimestamp(),
    };
  }

  getMixerState() {
    return this.mixerStateRep.value;
  }
}
