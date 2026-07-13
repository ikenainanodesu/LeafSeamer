import React from "react";
import { Download, Pencil, Play, Trash2 } from "lucide-react";
import { Button, IconButton } from "../_leaf-ui/components";
import { SeamerCard } from "../../types/seamer.types";

interface CardProps {
  card: SeamerCard;
  onRun: () => void;
  onEdit: () => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Card: React.FC<CardProps> = ({ card, onRun, onEdit, onDelete }) => {
  const downloadJson = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
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
    <article className="seamer-card">
      <header className="seamer-card-header">
        <h2 title={card.title}>{card.title}</h2>
        <div className="seamer-card-actions">
          <IconButton
            label="Export JSON"
            icon={<Download size={16} aria-hidden="true" />}
            onClick={downloadJson}
          />
          <IconButton
            label="Edit card"
            icon={<Pencil size={16} aria-hidden="true" />}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          />
          <IconButton
            label="Delete card"
            tone="danger"
            icon={<Trash2 size={16} aria-hidden="true" />}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(event);
            }}
          />
        </div>
      </header>
      <div className="seamer-card-body">
        <span className="seamer-card-count">{card.actions.length} Actions</span>
        <Button tone="primary" className="seamer-run-button" onClick={onRun}>
          <Play size={16} aria-hidden="true" />
          Run
        </Button>
      </div>
    </article>
  );
};

export default Card;
