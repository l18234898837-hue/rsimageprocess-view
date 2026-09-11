import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";

export type ArtifactPreviewKind = "image" | "json" | "text";

export const MAX_ARTIFACT_PREVIEW_BYTES = 20 * 1024 * 1024;
export const JSON_PREVIEW_MAX_ARRAY_ROWS = 50;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JsonArtifactSummaryScalar {
  key: string;
  value: string;
}

export interface JsonArtifactSummaryArray {
  key: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  totalCount: number;
  truncated: boolean;
}

export interface JsonArtifactSummaryContent {
  scalars: JsonArtifactSummaryScalar[];
  objects: JsonArtifactSummaryObject[];
  arrays: JsonArtifactSummaryArray[];
}

export interface JsonArtifactSummaryObject {
  key: string;
  content: JsonArtifactSummaryContent;
}

export interface JsonArtifactSummary {
  valid: boolean;
  rawText: string;
  root?: JsonArtifactSummaryContent;
}

const IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

const TEXT_MEDIA_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/xml",
  "text/xml"
]);

function inferredMediaType(uri: string) {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  if (/\.png$/.test(path)) return "image/png";
  if (/\.jpe?g$/.test(path)) return "image/jpeg";
  if (/\.webp$/.test(path)) return "image/webp";
  if (/\.gif$/.test(path)) return "image/gif";
  if (/\.json$/.test(path)) return "application/json";
  if (/\.csv$/.test(path)) return "text/csv";
  if (/\.(txt|log)$/.test(path)) return "text/plain";
  if (/\.xml$/.test(path)) return "application/xml";
  return "";
}

export function artifactPreviewKind(
  artifact: ExecutionProgressArtifact
): ArtifactPreviewKind | undefined {
  if (artifact.previewable === false) return undefined;
  const mediaType = (artifact.mediaType || inferredMediaType(artifact.uri))
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (IMAGE_MEDIA_TYPES.has(mediaType)) return "image";
  if (mediaType === "application/json") return "json";
  if (TEXT_MEDIA_TYPES.has(mediaType)) return "text";
  return undefined;
}

export function assertArtifactPreviewable(artifact: ExecutionProgressArtifact) {
  if (!artifactPreviewKind(artifact)) {
    throw new Error("该产物格式暂不支持在线查看，请下载后查看");
  }
  if ((artifact.sizeBytes || 0) > MAX_ARTIFACT_PREVIEW_BYTES) {
    throw new Error("文件较大，请下载后查看");
  }
}

export function formatArtifactPreviewText(
  value: string,
  kind: Extract<ArtifactPreviewKind, "json" | "text">
) {
  if (kind !== "json") return value;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function buildJsonArtifactSummary(value: string): JsonArtifactSummary {
  try {
    const parsed = JSON.parse(value) as JsonValue;
    return {
      valid: true,
      rawText: JSON.stringify(parsed, null, 2),
      root: createJsonSummaryContent(parsed, 0)
    };
  } catch {
    return { valid: false, rawText: value };
  }
}

function createJsonSummaryContent(
  value: JsonValue,
  objectDepth: number
): JsonArtifactSummaryContent {
  const content: JsonArtifactSummaryContent = {
    scalars: [],
    objects: [],
    arrays: []
  };

  if (Array.isArray(value)) {
    content.arrays.push(createJsonSummaryArray("结果", value));
    return content;
  }
  if (!isJsonObject(value)) {
    content.scalars.push({ key: "结果", value: formatJsonValue(value) });
    return content;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      content.arrays.push(createJsonSummaryArray(key, entry));
    } else if (isJsonObject(entry) && objectDepth < 2) {
      content.objects.push({
        key,
        content: createJsonSummaryContent(entry, objectDepth + 1)
      });
    } else {
      content.scalars.push({ key, value: formatJsonValue(entry) });
    }
  }
  return content;
}

function createJsonSummaryArray(
  key: string,
  value: JsonValue[]
): JsonArtifactSummaryArray {
  const visibleValues = value.slice(0, JSON_PREVIEW_MAX_ARRAY_ROWS);
  const objectItems = visibleValues.filter(isJsonObject);
  const columns = objectItems.length
    ? [...new Set(objectItems.flatMap(item => Object.keys(item)))]
    : ["值"];

  return {
    key,
    columns,
    rows: visibleValues.map(item => {
      if (!isJsonObject(item)) return { 值: formatJsonValue(item) };
      return Object.fromEntries(
        columns.map(column => [
          column,
          column in item ? formatJsonValue(item[column]) : "-"
        ])
      );
    }),
    totalCount: value.length,
    truncated: value.length > JSON_PREVIEW_MAX_ARRAY_ROWS
  };
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatJsonValue(value: JsonValue): string {
  if (value === null) return "无";
  if (value === true) return "是";
  if (value === false) return "否";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value) && value.length > JSON_PREVIEW_MAX_ARRAY_ROWS) {
    return `数组（${value.length} 项，请下载查看完整内容）`;
  }
  if (isJsonObject(value)) return `对象（${Object.keys(value).length} 项）`;
  return JSON.stringify(value);
}
