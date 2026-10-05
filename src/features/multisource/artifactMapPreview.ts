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
  return parseTileVisualization({
    ...descriptor,
    kind: "tiles",
    tileUrl: resolveArtifactTileUrl(descriptor.tileUrl)
  });
}

/**
 * Tile URLs are consumed by Cesium directly, outside the Axios client that
 * already knows the development API origin. Resolve the server's `/api` path
 * against VITE_API_PATH so local development does not request tiles from the
 * Vite host (which has no `/api` proxy).
 */
export function resolveArtifactTileUrl(
  tileUrl: string,
  configuredApiPath?: string
) {
  const runtimeEnv = (
    import.meta as ImportMeta & {
      env?: Record<string, unknown>;
    }
  ).env;
  const apiPath = String(
    configuredApiPath ?? runtimeEnv?.VITE_API_PATH ?? ""
  ).trim();
  if (!/^https?:\/\//i.test(apiPath) || !tileUrl.startsWith("/")) {
    return tileUrl;
  }

  // Cesium replaces {z}/{x}/{y} at request time. URL() percent-encodes
  // those placeholders, so concatenate the origin without URL parsing.
  return `${apiPath.replace(/\/$/, "")}${tileUrl}`;
}

export interface ImageArtifactVisualization extends ArtifactVisualization {
  kind: "bounds";
  imageUrl: string;
  bounds: [number, number, number, number];
}

/**
 * Cesium uploads a SingleTileImageryProvider image as one GPU texture. Keep
 * that fallback below the device limit so oversized browse PNGs cannot stop
 * the whole scene renderer.
 */
export async function createBoundedImageOverlayUrl(
  url: string,
  maxTextureSize = 8192
): Promise<string> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`图片预览请求失败（HTTP ${response.status}）`);
  }
  const blob = await response.blob();
  // Prefer ImageBitmap (it avoids an extra DOM image), but do not treat its
  // absence/failure as permission to upload the original image. Older
  // browsers and some Chromium deployments disable createImageBitmap for
  // cross-origin/blob images; those images still need the same safety bound.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      try {
        return await resizeImageToBound(bitmap, maxTextureSize);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to the HTMLImageElement decoder below.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadImageElement(objectUrl);
    return await resizeImageToBound(image, maxTextureSize);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  if (typeof image.decode === "function") {
    image.src = url;
    await image.decode();
  } else {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片解码失败"));
      image.src = url;
    });
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("图片尺寸无效");
  }
  return image;
}

async function resizeImageToBound(
  source: CanvasImageSource & { width: number; height: number },
  maxTextureSize: number
): Promise<string> {
  const sourceWidth =
    "naturalWidth" in source && typeof source.naturalWidth === "number"
      ? source.naturalWidth
      : source.width;
  const sourceHeight =
    "naturalHeight" in source && typeof source.naturalHeight === "number"
      ? source.naturalHeight
      : source.height;
  const scale = Math.min(
    1,
    maxTextureSize / sourceWidth,
    maxTextureSize / sourceHeight
  );
  if (scale === 1) {
    // The source may be an ImageBitmap or an HTMLImageElement. Convert it to
    // a blob URL so the caller has one uniform lifetime to revoke.
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持图片缩放");
    context.drawImage(source, 0, 0);
    const copy = await canvasToPng(canvas);
    return URL.createObjectURL(copy);
  }
  const width = Math.max(1, Math.floor(sourceWidth * scale));
  const height = Math.max(1, Math.floor(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器不支持图片缩放");
  context.drawImage(source, 0, 0, width, height);
  return URL.createObjectURL(await canvasToPng(canvas));
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(result => {
      if (result) resolve(result);
      else reject(new Error("图片缩放失败"));
    }, "image/png");
  });
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
  const visualization = parseTileVisualization(artifact.visualization);
  return visualization
    ? {
        ...visualization,
        tileUrl: resolveArtifactTileUrl(visualization.tileUrl)
      }
    : undefined;
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
  const bounds = validBounds(visualization.bounds, true);
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
    imageUrl: resolveArtifactTileUrl(visualization.imageUrl),
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
    // JSON files exported by desktop GIS tools may start with an UTF-8 BOM;
    // some gateways also prepend the standard XSSI protection marker.
    const normalized = value
      .replace(/^\uFEFF/, "")
      .replace(/^\s*\)\]\}',?\s*/, "")
      .trim();
    const parsed = JSON.parse(normalized) as unknown;
    return unwrapJsonEnvelope(parsed);
  } catch {
    throw new Error("空间 JSON 格式无效");
  }
}

function unwrapJsonEnvelope(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const nested = value.data ?? value.result;
  if (
    nested !== undefined &&
    (value.code !== undefined ||
      value.status !== undefined ||
      value.success !== undefined)
  ) {
    return typeof nested === "string" ? parseJson(nested) : nested;
  }
  return value;
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
  if (!isRecord(value)) return undefined;
  for (const candidate of [value.bbox, value.bounds, value.extent]) {
    const bounds = validBounds(candidate);
    if (bounds) return bounds;
  }
  return extractBounds(value.data) || extractBounds(value.result);
}

function validBounds(
  value: unknown,
  allowDateLineCrossing = false
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
    west === east ||
    (!allowDateLineCrossing && west > east) ||
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
