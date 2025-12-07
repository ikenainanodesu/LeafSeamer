import { c as clientExports, j as jsxRuntimeExports, r as reactExports } from "../client-c_VSRioe.js";
const GraphicsControl = () => {
  const [data, setData] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal) => {
      if (newVal) {
        setData(newVal);
      }
    });
  }, []);
  const updateLowerThird = (updates) => {
    if (!data) return;
    nodecg.Replicant("graphicsData").value = {
      ...data,
      lowerThird: { ...data.lowerThird, ...updates }
    };
  };
  const updateScoreboard = (updates) => {
    if (!data) return;
    nodecg.Replicant("graphicsData").value = {
      ...data,
      scoreboard: { ...data.scoreboard, ...updates }
    };
  };
  if (!data) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading..." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          marginBottom: "30px",
          border: "1px solid #555",
          padding: "15px",
          borderRadius: "4px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Lower Third" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: "10px" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: "5px" }, children: "Line 1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: data.lowerThird.line1,
                onChange: (e) => updateLowerThird({ line1: e.target.value }),
                style: {
                  width: "100%",
                  padding: "5px",
                  backgroundColor: "#424242",
                  color: "white",
                  border: "1px solid #666"
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: "10px" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: "5px" }, children: "Line 2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: data.lowerThird.line2,
                onChange: (e) => updateLowerThird({ line2: e.target.value }),
                style: {
                  width: "100%",
                  padding: "5px",
                  backgroundColor: "#424242",
                  color: "white",
                  border: "1px solid #666"
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => updateLowerThird({ visible: !data.lowerThird.visible }),
              style: {
                padding: "8px 16px",
                backgroundColor: data.lowerThird.visible ? "#f44336" : "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              },
              children: data.lowerThird.visible ? "Hide" : "Show"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          border: "1px solid #555",
          padding: "15px",
          borderRadius: "4px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Scoreboard" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "15px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: "Home" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "24px", marginBottom: "10px" }, children: data.scoreboard.homeScore }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: () => updateScoreboard({ homeScore: data.scoreboard.homeScore + 1 }),
                      children: "+"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: () => updateScoreboard({
                        homeScore: Math.max(0, data.scoreboard.homeScore - 1)
                      }),
                      children: "-"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: "Away" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "24px", marginBottom: "10px" }, children: data.scoreboard.awayScore }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: () => updateScoreboard({ awayScore: data.scoreboard.awayScore + 1 }),
                      children: "+"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: () => updateScoreboard({
                        awayScore: Math.max(0, data.scoreboard.awayScore - 1)
                      }),
                      children: "-"
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => updateScoreboard({ visible: !data.scoreboard.visible }),
              style: {
                padding: "8px 16px",
                backgroundColor: data.scoreboard.visible ? "#f44336" : "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%"
              },
              children: data.scoreboard.visible ? "Hide" : "Show"
            }
          )
        ]
      }
    )
  ] });
};
const root = clientExports.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(GraphicsControl, {}));
