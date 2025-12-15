import React from "react";
import { SeamerCard } from "../../types/seamer.types";

interface CardProps {
  card: SeamerCard;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const Card: React.FC<CardProps> = ({ card, onRun, onEdit, onDelete }) => {
  const downloadJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(card, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `${card.title.replace(/\s+/g, "_")}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div
      style={{
        backgroundColor: "#333",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: 200,
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        position: "relative",
        transition: "transform 0.1s",
        border: "1px solid #444",
      }}
      className="seamer-card"
    >
      <div
        style={{
          padding: 10,
          backgroundColor: "#444",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {card.title}
        </h3>
        <div>
          <button
            onClick={downloadJson}
            title="Export JSON"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
            }}
          >
            💾
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
            }}
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#f66",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: 15,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "#2a2a2a",
        }}
        onClick={onRun}
      >
        <span style={{ fontSize: "3em", color: "#666" }}>▶</span>
        <span style={{ marginTop: 10, color: "#888", fontSize: "0.8em" }}>
          {card.actions.length} Actions
        </span>
      </div>
    </div>
  );
};

export default Card;
