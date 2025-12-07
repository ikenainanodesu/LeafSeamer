import { c as clientExports, j as jsxRuntimeExports, r as reactExports } from "../client-c_VSRioe.js";
const Scoreboard = () => {
  const [data, setData] = reactExports.useState({
    visible: false,
    homeScore: 0,
    awayScore: 0
  });
  reactExports.useEffect(() => {
    const graphicsDataRep = nodecg.Replicant("graphicsData");
    graphicsDataRep.on("change", (newVal) => {
      if (newVal && newVal.scoreboard) {
        setData(newVal.scoreboard);
      }
    });
  }, []);
  if (!data.visible) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        position: "absolute",
        top: "50px",
        left: "50px",
        backgroundColor: "#333",
        color: "white",
        padding: "10px",
        fontFamily: "Roboto, sans-serif",
        display: "flex",
        alignItems: "center",
        borderRadius: "8px"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "0 20px", fontSize: "36px", fontWeight: "bold" }, children: "HOME" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              backgroundColor: "#4caf50",
              padding: "10px 20px",
              fontSize: "48px",
              fontWeight: "bold",
              borderRadius: "4px"
            },
            children: data.homeScore
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "0 20px", fontSize: "24px" }, children: "VS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              backgroundColor: "#f44336",
              padding: "10px 20px",
              fontSize: "48px",
              fontWeight: "bold",
              borderRadius: "4px"
            },
            children: data.awayScore
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "0 20px", fontSize: "36px", fontWeight: "bold" }, children: "AWAY" })
      ]
    }
  );
};
const root = clientExports.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(Scoreboard, {}));
