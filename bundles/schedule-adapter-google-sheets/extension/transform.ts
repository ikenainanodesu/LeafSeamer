import type {
  PlaylistItem,
  ScheduleImportBatch,
} from "../../schedule-manager/src/types/schedule.types";

interface TransformOptions {
  sourceId: string;
  sourceRevision: string;
  fetchedAt: number;
}

const parseActive = (value: unknown): boolean =>
  value === true || String(value).toLowerCase() === "true" || value === 1;

const parsePlannedAt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Date.parse(String(value));
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const transformSheetRows = (
  rows: unknown[][],
  options: TransformOptions
): ScheduleImportBatch => {
  const header = (rows[0] || []).map((value) => String(value).toLowerCase());
  const column = (name: string, fallback: number) => {
    const index = header.indexOf(name.toLowerCase());
    return index >= 0 ? index : fallback;
  };
  const externalIdIndex = column("externalid", -1);
  const timeIndex = column("time", 0);
  const titleIndex = column("title", 1);
  const descriptionIndex = column("description", 2);
  const stateIndex = column("state", -1);
  const activeIndex = column("active", 3);
  const plannedAtIndex = column("plannedat", -1);
  const revisionIndex = column("revision", -1);
  const hasHeader = header.includes("title") || header.includes("time");

  const items: PlaylistItem[] = rows
    .slice(hasHeader ? 1 : 0)
    .flatMap((row, index) => {
      const title = String(row[titleIndex] || "").trim();
      if (!title) return [];
      const externalId = String(
        externalIdIndex >= 0 ? row[externalIdIndex] : index + 1
      );
      return [
        {
          id: `${options.sourceId}:${externalId}`,
          sourceId: options.sourceId,
          externalId,
          revision: String(
            revisionIndex >= 0
              ? row[revisionIndex] || options.sourceRevision
              : options.sourceRevision
          ),
          time: String(row[timeIndex] || ""),
          plannedAt: parsePlannedAt(
            plannedAtIndex >= 0 ? row[plannedAtIndex] : null
          ),
          title,
          description: String(row[descriptionIndex] || ""),
          state: String(stateIndex >= 0 ? row[stateIndex] || "ready" : "ready"),
          active: parseActive(row[activeIndex]),
          metadata: {},
          triggerMappings: [],
        },
      ];
    });

  return {
    importId: `${options.sourceId}:${options.sourceRevision}`,
    sourceId: options.sourceId,
    sourceRevision: options.sourceRevision,
    fetchedAt: options.fetchedAt,
    items,
  };
};
