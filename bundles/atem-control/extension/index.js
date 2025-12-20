"use strict";
const atemConnection = require("atem-connection");
module.exports = function(nodecg) {
  const log = nodecg.log;
  log.info("ATEM Control extension starting...");
  const switchersRep = nodecg.Replicant("atem:switchers", {
    defaultValue: []
  });
  const managers = /* @__PURE__ */ new Map();
  const getStateReplicant = (ip) => {
    return nodecg.Replicant(`atem:state:${ip}`, {
      defaultValue: {
        programInput: 0,
        previewInput: 0,
        inTransition: false,
        transitionPosition: 0,
        transitionRate: 25,
        // Default approx 1s
        aux: {},
        sources: {},
        macros: {}
      },
      persistent: false
    });
  };
  function updateSwitcherStatus(ip, connected) {
    if (!switchersRep.value) return;
    const idx = switchersRep.value.findIndex(
      (s) => s.ip === ip
    );
    if (idx !== -1) {
      if (switchersRep.value[idx].connected !== connected) {
        switchersRep.value[idx].connected = connected;
        switchersRep.value = [...switchersRep.value];
      }
    }
  }
  function createAtemManager(ip) {
    if (managers.has(ip)) return managers.get(ip);
    const atem = new atemConnection.Atem();
    const manager = {
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
        macros: {}
      }
    };
    getStateReplicant(ip);
    atem.on("connected", () => {
      log.info(`ATEM connected: ${ip}`);
      manager.connected = true;
      updateSwitcherStatus(ip, true);
      updateState(manager);
    });
    atem.on("disconnected", () => {
      log.info(`ATEM disconnected: ${ip}`);
      manager.connected = false;
      updateSwitcherStatus(ip, false);
    });
    atem.on("stateChanged", (state, paths) => {
      updateState(manager);
    });
    managers.set(ip, manager);
    atem.connect(ip).catch((e) => {
      log.error(`Failed to connect to ${ip}:`, e);
      updateSwitcherStatus(ip, false);
    });
    return manager;
  }
  function updateState(manager) {
    const stateRep = getStateReplicant(manager.ip);
    const atemState = manager.atem.state;
    if (!atemState) return;
    const me = atemState.video.mixEffects[0];
    const sources = {};
    if (atemState.inputs) {
      for (const [id, input] of Object.entries(atemState.inputs)) {
        if (!input) continue;
        sources[Number(id)] = input.shortName || input.longName || `Source ${id}`;
      }
    }
    const macros = {};
    if (atemState.macro && atemState.macro.macroProperties) {
      for (const [id, macro] of Object.entries(
        atemState.macro.macroProperties
      )) {
        if (macro.isUsed && macro.name) {
          macros[Number(id)] = macro.name;
        }
      }
    }
    let transitionRate = 25;
    if (me && me.transitionSettings && me.transitionSettings.mix) {
      transitionRate = me.transitionSettings.mix.rate;
    }
    const aux = {};
    if (atemState.video && atemState.video.auxilliaries) {
      atemState.video.auxilliaries.forEach(
        (sourceId, index) => {
          aux[index] = sourceId;
        }
      );
    }
    const newState = {
      programInput: me ? me.programInput : 0,
      previewInput: me ? me.previewInput : 0,
      inTransition: me ? me.inTransition : false,
      transitionPosition: me ? me.transitionPosition : 0,
      transitionRate,
      aux,
      sources,
      macros
    };
    stateRep.value = newState;
  }
  setTimeout(() => {
    if (switchersRep.value) {
      switchersRep.value.forEach((s) => {
        createAtemManager(s.ip);
      });
    }
  }, 1e3);
  nodecg.listenFor("atem:connect", (ip, cb) => {
    if (!ip) return;
    if (!switchersRep.value) switchersRep.value = [];
    const exists = switchersRep.value.find(
      (s) => s.ip === ip
    );
    if (!exists) {
      switchersRep.value = [...switchersRep.value, { ip, connected: false }];
    }
    createAtemManager(ip);
    const manager = managers.get(ip);
    if (manager && !manager.connected) {
      manager.atem.connect(ip).catch((e) => {
        log.error(`Failed to reconnect to ${ip}:`, e);
        updateSwitcherStatus(ip, false);
      });
    }
    if (cb && !cb.handled) cb(null);
  });
  nodecg.listenFor("atem:disconnect", (ip, cb) => {
    const manager = managers.get(ip);
    if (manager) {
      manager.atem.disconnect();
      manager.connected = false;
    }
    updateSwitcherStatus(ip, false);
    if (cb && !cb.handled) cb(null);
  });
  nodecg.listenFor("atem:remove", (ip, cb) => {
    const manager = managers.get(ip);
    if (manager) {
      manager.atem.disconnect();
      managers.delete(ip);
    }
    if (switchersRep.value) {
      switchersRep.value = switchersRep.value.filter((s) => s.ip !== ip);
    }
    if (cb && !cb.handled) cb(null);
  });
  nodecg.listenFor("atem:cut", (data, cb) => {
    const manager = managers.get(data.ip);
    if (manager && manager.connected) {
      manager.atem.cut(data.me || 0).catch(log.error);
    }
    if (cb && !cb.handled) cb(null);
  });
  nodecg.listenFor(
    "atem:auto",
    (data, cb) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.autoTransition(data.me || 0).catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );
  nodecg.listenFor(
    "atem:setSource",
    (data, cb) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        if (data.type === "program") {
          manager.atem.changeProgramInput(data.source, data.me || 0).catch(log.error);
        } else {
          manager.atem.changePreviewInput(data.source, data.me || 0).catch(log.error);
        }
      }
      if (cb && !cb.handled) cb(null);
    }
  );
  nodecg.listenFor(
    "atem:runMacro",
    (data, cb) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.macroRun(data.macroIndex).catch(log.error);
      }
    }
  );
  nodecg.listenFor(
    "atem:setTransitionRate",
    (data, cb) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.setMixTransitionSettings(
          {
            rate: data.rate
          },
          data.me || 0
        ).catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );
  nodecg.listenFor(
    "atem:setAuxSource",
    (data, cb) => {
      const manager = managers.get(data.ip);
      if (manager && manager.connected) {
        manager.atem.setAuxSource(data.source, data.auxId).catch(log.error);
      }
      if (cb && !cb.handled) cb(null);
    }
  );
};
