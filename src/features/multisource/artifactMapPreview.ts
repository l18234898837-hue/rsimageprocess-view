import type {
  ArtifactTilePreviewResponse,
  ArtifactVisualization,
  ExecutionProgressArtifact
} from "@/api/multiSourceSatellite";

type GeoJson = Record<string, unknown>;

export type ArtifactMapPreview =
  | { kind: "geojson"; data: GeoJson }
  | { kind: "bounds"; bounds: [number, number, number, number] };

export interface TileArtifactVisualization extends ArtifactVisualization {
  kind: "tiles";
  tileUrl: string;
  bounds: [number, number, number, number];
}

export function parseTilePreviewDescriptor(
  descriptor: ArtifactTilePreviewResponse
): TileArtifactVisualization | undefined {
  return parseTileVisualization({ ...descriptor, kind: "tiles" });
}

export interface ImageArtifactVisualization extends ArtifactVisualization {
  kind: "bounds";
  imageUrl: string;
  bounds: [number, number, number, number];
}

export function isMapPreviewCandidate(artifact: ExecutionProgressArtifact) {
  if (parseTileArtifactVisualization(artifact)) return true;
  if (parseImageArtifactVisualization(artifact)) return true;
  const mediaType = normalizedMediaType(artifact);
  if (isImageArtifact(artifact)) return false;
  const name = `${artifact.type} ${artifact.uri}`.toLowerCase();
  return (
    mediaType === "application/geo+json" ||
    mediaType === "text/csv" ||
    /\.(geojson|csv)$/i.test(artifact.uri.split(/[?#]/)[0]) ||
    (mediaType === "application/json" &&
      /(bbox|bounds|footprint|track|map|spatial|geo)/.test(name))
  );
}

export function parseTileArtifactVisualization(
  artifact: ExecutionProgressArtifact
): TileArtifactVisualization | undefined {
  return parseTileVisualization(artifact.visualization);
}

function parseTileVisualization(
  visualization: Partial<ArtifactVisualization> | undefined
): TileArtifactVisualization | undefined {
  if (
    visualization?.kind !== "tiles" ||
    !isSafeTileUrl(visualization.tileUrl)
  ) {
    return undefined;
  }
  const bounds = validBounds(visualization.bounds);
  if (
    !bounds ||
    !validZoomRange(visualization.minZoom, visualization.maxZoom)
  ) {
    return undefined;
  }
  if (visualization.crs && !/^EPSG:\d+$/i.test(visualization.crs.trim())) {
    return undefined;
  }
  return {
    ...visualization,
    kind: "tiles",
    tileUrl: visualization.tileUrl,
    bounds
  };
}

export function parseImageArtifactVisualization(
  artifact: ExecutionProgressArtifact
): ImageArtifactVisualization | undefined {
  const visualization = artifact.visualization;
  if (
    visualization?.kind !== "bounds" ||
    !isImageArtifact(artifact) ||
    !isSafeResourceUrl(visualization.imageUrl)
  ) {
    return undefined;
  }
  const bounds = validBounds(visualization.bounds);
  if (
    !bounds ||
    (visualization.crs && visualization.crs.toUpperCase() !== "EPSG:4326")
  ) {
    return undefined;
  }
  return {
    ...visualization,
    kind: "bounds",
    imageUrl: visualization.imageUrl,
    bounds
  };
}

export function parseMapArtifactPreview(
  artifact: ExecutionProgressArtifact,
  value: string
): ArtifactMapPreview {
  const mediaType = normalizedMediaType(artifact);
  if (mediaType === "text/csv" || /\.csv$/i.test(artifact.uri)) {
    const geojson = csvToGeoJson(value);
    if (geojson) return { kind: "geojson", data: geojson };
    throw new Error("CSV 未包含可识别的经纬度列");
  }

  const parsed = parseJson(value);
  if (isGeoJson(parsed)) return { kind: "geojson", data: parsed };
  const bounds = extractBounds(parsed);
  if (bounds) return { kind: "bounds", bounds };
  throw new Error("产物未包含可在地图中显示的空间数据");
}

function normalizedMediaType(artifact: ExecutionProgressArtifact) {
  return (artifact.mediaType || "").split(";", 1)[0].trim().toLowerCase();
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("空间 JSON 格式无效");
  }
}

function isGeoJson(value: unknown): value is GeoJson {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  return [
    "Feature",
    "FeatureCollection",
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon"
  ].includes(value.type);
}

function extractBounds(
  value: unknown
): [number, number, number, number] | undefined {
  return isRecord(value) ? validBounds(value.bbox) : undefined;
}

function validBounds(
  value: unknown
): [number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const bounds = value.map(Number);
  if (!bounds.every(Number.isFinite)) return undefined;
  const [west, south, east, north] = bounds;
  if (
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  ) {
    return undefined;
  }
  return [west, south, east, north];
}

function isSafeTileUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !value.includes("{z}") ||
    !value.includes("{x}") ||
    !value.includes("{y}")
  ) {
    return false;
  }
  return isSafeResourceUrl(value);
}

function isSafeResourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isImageArtifact(artifact: ExecutionProgressArtifact) {
  const mediaType = normalizedMediaType(artifact);
  return (
    ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      mediaType
    ) || /\.(png|jpe?g|webp|gif)$/i.test(artifact.uri.split(/[?#]/)[0])
  );
}

export function isRasterArtifact(artifact: ExecutionProgressArtifact) {
  const format = (artifact.format || "").toUpperCase();
  return (
    ["COG", "GEOTIFF", "TIFF", "TIF"].includes(format) ||
    /\.tiff?$/i.test(artifact.uri.split(/[?#]/)[0])
  );
}

function validZoomRange(minZoom?: number, maxZoom?: number) {
  if (
    minZoom !== undefined &&
    (!Number.isInteger(minZoom) || minZoom < 0 || minZoom > 30)
  )
    return false;
  if (
    maxZoom !== undefined &&
    (!Number.isInteger(maxZoom) || maxZoom < 0 || maxZoom > 30)
  )
    return false;
  return minZoom === undefined || maxZoom === undefined || minZoom <= maxZoom;
}

function csvToGeoJson(value: string): GeoJson | undefined {
  const rows = value.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return undefined;
  const headers = splitCsvRow(rows[0]).map(header => header.trim());
  const longitudeIndex = findCoordinateColumn(headers, [
    "longitude",
    "lon",
    "lng",
    "经度"
  ]);
  const latitudeIndex = findCoordinateColumn(headers, [
    "latitude",
    "lat",
    "纬度"
  ]);
  if (longitudeIndex < 0 || latitudeIndex < 0) return undefined;

  const features = rows.slice(1).flatMap(row => {
    const values = splitCsvRow(row);
    const longitude = Number(values[longitudeIndex]);
    const latitude = Number(values[latitudeIndex]);
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return [];
    }
    return [
      {
        type: "Feature",
        properties: Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? ""])
        ),
        geometry: { type: "Point", coordinates: [longitude, latitude] }
      }
    ];
  });

  return features.length ? { type: "FeatureCollection", features } : undefined;
}

function findCoordinateColumn(headers: string[], candidates: string[]) {
  return headers.findIndex(header =>
    candidates.includes(header.trim().toLowerCase())
  );
}

function splitCsvRow(row: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
