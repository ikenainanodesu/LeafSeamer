import NodeCG from "nodecg/types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Seamer Bundle");

  // Initialize Replicants if needed via backend,
  // but frontend can also declare them.
  // For persistence logic that might be complex, we can add it here later.
};
