import NodeCG from "nodecg/types";
import { Atem, Enums } from "atem-connection";
import {
  AtemSwitcherInfo,
  AtemState as SharedAtemState,
  DiscoveredSwitcher,
} from "@shared/types/atem.types";

// TODO: Use a proper discovery library if needed. For now simulating or basic IP.
// 'atem-connection' checks availability but doesn't do mdns discovery itself directly without helper?
// Actually 'atem-connection' has ChildProcess/Threaded options but strict discovery is often separate.
// We'll focus on direct IP connection first as requested "IP input box".

interface AtemManager {
  atem: Atem;
  ip: string;
  metrics: SharedAtemState;
  connected: boolean;
}

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const log = nodecg.log;
  log.info("ATEM Control extension starting...");

  const switchersRep = nodecg.Replicant<AtemSwitcherInfo[]>("atem:switchers", {
    defaultValue: [],
  });
  // const discoveredRep = nodecg.Replicant<DiscoveredSwitcher[]>('atem:discovered', { defaultValue: [] });

  // Map to store active ATEM instances
  const managers = new Map<string, AtemManager>();

  // Helper to get or create replicant for specific switcher state
  const getStateReplicant = (ip: string) => {
    return nodecg.Replicant<SharedAtemState>(`atem:state:${ip}`, {
      defaultValue: {
        programInput: 0,
        previewInput: 0,
        inTransition: false,
        transitionPosition: 0,
        transitionRate: 25, // Default approx 1s
        aux: {},
        sources: {},
        macros: {},
      },
      persistent: false,
    });
  };

  function updateSwitcherStatus(ip: string, connected: boolean) {
    if (!switchersRep.value) return;
    const idx = switchersRep.value.findIndex(
      (s: AtemSwitcherInfo) => s.ip === ip
    );
    if (idx !== -1) {
      if (switchersRep.value[idx].connected !== connected) {
        switchersRep.value[idx].connected = connected;
        // Trigger change
        switchersRep.value = [...switchersRep.value];
      }
    }
  }

  function createAtemManager(ip: string) {
    if (managers.has(ip)) return managers.get(ip)!;

    const atem = new Atem();
    log.info(`Creating new ATEM Manager for ${ip}`);
    const manager: AtemManager = {
      atem,
      ip,
      connected: false,
      metrics: {
        programInput: 0,
        previewInput: 0,
        inTransition: false,
        transitionPosition: 0,
        transitionRate: 25,
        aux: {},
        sources: {},
        macros: {},
      },
    };

    const stateRep = getStateReplicant(ip);

    atem.on("connected", () => {
      log.info(`ATEM connected: ${ip}`);
      manager.connected = true;
      updateSwitcherStatus(ip, true);

      // Initial fetch if needed, but atem-connection pushes state
      updateState(manager);
    });

    atem.on("disconnected", () => {
      log.info(`ATEM disconnected: ${ip}`);
      manager.connected = false;
      updateSwitcherStatus(ip, false);
    });

    atem.on("stateChanged", (state: any, paths: any) => {
      updateState(manager);
    });

    managers.set(ip, manager);

    atem.connect(ip).catch((e: any) => {
      log.error(`Failed to connect to ${ip}:`, e);
      updateSwitcherStatus(ip, false);
    });

    return manager;
  }

  function updateState(manager: AtemManager) {
    const stateRep = getStateReplicant(manager.ip);
    const atemState = manager.atem.state;

    if (!atemState) return;

    // Extract relevant info
    // Assuming ME 1 (index 0) for now as primary
    const me = atemState.video.mixEffects[0];

    const sources: { [id: number]: string } = {};
    if (atemState.inputs) {
      for (const [id, input] of Object.entries(atemState.inputs)) {
        if (!input) continue;
        // @ts-ignore
        sources[Number(id)] =
          input.shortName || input.longName || `Source ${id}`;
      }
    }

    const macros: { [id: number]: string } = {};
    if (atemState.macro && atemState.macro.macroProperties) {
      for (const [id, macro] of Object.entries(
        atemState.macro.macroProperties
      )) {
        // @ts-ignore
        if (macro.isUsed && macro.name) {
          // @ts-ignore
          macros[Number(id)] = macro.name;
        }
      }
    }

    // Extract mix settings (mix effect 0)
    let transitionRate = 25; // Default
    if (
      me &&
      (me as any).transitionSettings &&
      (me as any).transitionSettings.mix
    ) {
      transitionRate = (me as any).transitionSettings.mix.rate;
    }

    // Extract aux
    const aux: { [id: number]: number } = {};
    if (atemState.video && (atemState.video as any).auxilliaries) {
      // array of aux inputs
      (atemState.video as any).auxilliaries.forEach(
        (sourceId: number, index: number) => {
          aux[index] = sourceId;
        }
      );
    }

    const newState: SharedAtemState = {
      programInput: me ? me.programInput : 0,
      previewInput: me ? me.previewInput : 0,
      inTransition: me ? (me as any).inTransition : false,
      transitionPosition: me ? (me as any).transitionPosition : 0,
      transitionRate,
      aux,
      sources,
      macros,
    };

    stateRep.value = newState;
  }

  // Re-connect known switchers on startup
  // Wait a bit? Or just go.
  setTimeout(() => {
    if (switchersRep.value) {
      switchersRep.value.forEach((s: AtemSwitcherInfo) => {
        createAtemManager(s.ip);
      });
    }
  }, 1000);

  // Listen for messages
  nodecg.listenFor("atem:connect", (ip: string, cb: any) => {
    if (!ip) return;

    // Add to list if not present
    if (!switchersRep.value) switchersRep.value = [];
    const exists = switchersRep.value.find(
      (s: AtemSwitcherInfo) => s.ip === ip
    );
    if (!exists) {
      switchersRep.value = [...switchersRep.value, { ip, connected: false }];
    }

    createAtemManager(ip);

    // Attempt reconnect if already exists but disconnected
    const manager = managers.get(ip);
    if (manager && !manager.connected) {
      manager.atem.connect(ip).catch((e: any) => {
        log.error(`Failed to reconnect to ${ip}:`, e);
        updateSwitcherStatus(ip, false);
      });
    }

    if (cb && !cb.handled) cb(null);
  });

  nodecg.listenFor("atem:disconnect", (ip: string, cb: any) => {
    const manager = managers.get(ip);
    if (manager) {
      manager.atem.disconnect();
      // Do NOT delete from managers here, keep it for potential reconnect
      // But update status
      manager.connected = false;
    }
    updateSwitcherStatus(ip, false);
    if (cb && !cb.handled) cb(null);
  });

  nodecg.listenFor("atem:remove", (ip: string, cb: any) => {
    const manager = managers.get(ip);
    if (manager) {
      manager.atem.disconnect();
      managers.delete(ip);
    }

    // Remove from replicant
    if (switchersRep.value) {
      switchersRep.value = switchersRep.value.filter((s) => s.ip !== ip);
    }

    if (cb && !cb.handled) cb(null);
  });

  nodecg.listenFor("atem:cut", (data: { ip: string; me?: number }, cb: any) => {
    const manager = managers.get(data.ip);
    if (manager && manager.connected) {
      manager.atem.cut(data.me || 0).catch(log.error);
    }
    if (cb && !cb.handled) cb(null);
  });

  nodecg.listenFor(
    "atem:auto",
    (data: { ip: string; me?: number }, cb: any) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.autoTransition(data.me || 0).catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );

  nodecg.listenFor(
    "atem:setSource",
    (
      data: {
        ip: string;
        type: "program" | "preview";
        source: number;
        me?: number;
      },
      cb: any
    ) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        if (data.type === "program") {
          manager.atem
            .changeProgramInput(data.source, data.me || 0)
            .catch(log.error);
        } else {
          manager.atem
            .changePreviewInput(data.source, data.me || 0)
            .catch(log.error);
        }
      }
      if (cb && !cb.handled) cb(null);
    }
  );

  nodecg.listenFor(
    "atem:runMacro",
    (data: { ip: string; macroIndex: number }, cb: any) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.macroRun(data.macroIndex).catch(log.error);
      }
    }
  );

  nodecg.listenFor(
    "atem:setTransitionRate",
    (data: { ip: string; rate: number; me?: number }, cb: any) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        // Only supporting Mix for now as per request for "auto" button slider usually implies standard mix
        manager.atem
          .setMixTransitionSettings(
            {
              rate: data.rate,
            },
            data.me || 0
          )
          .catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );

  nodecg.listenFor(
    "atem:setAuxSource",
    (data: { ip: string; auxId: number; source: number }, cb: any) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.setAuxSource(data.source, data.auxId).catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );
};
