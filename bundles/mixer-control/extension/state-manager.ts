import NodeCG from "nodecg/types";
// State Manager for Mixer Control
import { MixerState, MixerChannel } from "../../../shared/types/mixer.types";
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
        lastUpdate: 0,
      },
    });
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
}
