import type {
  ArtifactViewCapability,
  ExecutionProgressArtifact
} from "@/api/multiSourceSatellite";
import {
  parseImageArtifactVisualization,
  parseTileArtifactVisualization
} from "@/features/multisource/artifactMapPreview";

export interface ResolvedArtifactView extends ArtifactViewCapability {
  format: string;
}

export function resolveArtifactView(
  artifact: ExecutionProgressArtifact
): ResolvedArtifactView {
  if (parseTileArtifactVisualization(artifact)) {
    return enabled(artifact.format || "COG", "map");
  }
  if (parseImageArtifactVisualization(artifact)) {
    return enabled(artifact.format || imageFormat(artifact.uri), "map");
  }
  if (artifact.format && artifact.view) {
    if (artifact.view.mode === "dataset") {
      return disabled(
        artifact.format,
        `${artifact.format.toUpperCase()} 在线查看器尚未接入，请下载后查看`
      );
    }
    return {
      format: artifact.format,
      enabled: artifact.view.enabled,
      mode: artifact.view.mode,
      ...(artifact.view.reason ? { reason: artifact.view.reason } : {}),
      ...(artifact.view.inspectionUrl
        ? { inspectionUrl: artifact.view.inspectionUrl }
        : {})
    };
  }
  return fallbackArtifactView(artifact.uri, artifact.type, artifact.format);
}

function imageFormat(uri: string) {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  if (/\.jpe?g$/.test(path)) return "JPEG";
  if (/\.webp$/.test(path)) return "WEBP";
  if (/\.gif$/.test(path)) return "GIF";
  return "PNG";
}

function fallbackArtifactView(
  uri: string,
  type: string,
  declaredFormat?: string
): ResolvedArtifactView {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  const format = String(declaredFormat || "")
    .trim()
    .toUpperCase();
  if (/\.geojson$/.test(path) || type.toUpperCase().includes("GEOJSON")) {
    return enabled("GEOJSON", "map");
  }
  if (/\.csv$/.test(path) || format === "CSV") return enabled("CSV", "map");
  if (/\.nc$/.test(path) || format === "NETCDF") {
    return disabled("NETCDF", "NetCDF 在线查看器尚未接入，请下载后查看");
  }
  if (/\.parquet$/.test(path) || format === "PARQUET") {
    return disabled("PARQUET", "Parquet 在线查看器尚未接入，请下载后查看");
  }
  if (/\.json$/.test(path) || format === "JSON") return enabled("JSON", "json");
  if (/\.png$/.test(path) || format === "PNG") return enabled("PNG", "image");
  if (/\.jpe?g$/.test(path) || ["JPG", "JPEG"].includes(format))
    return enabled("JPEG", "image");
  if (/\.webp$/.test(path) || format === "WEBP")
    return enabled("WEBP", "image");
  if (/\.gif$/.test(path) || format === "GIF") return enabled("GIF", "image");
  if (/\.(txt|log|xml)$/.test(path) || ["TXT", "LOG", "XML"].includes(format))
    return enabled("TEXT", "text");
  if (/\.npz$/.test(path) || format === "NPZ") {
    return disabled("NPZ", "NPZ 二进制中间数据暂不支持在线查看");
  }
  if (
    /\.tiff?$/.test(path) ||
    ["TIFF", "TIF", "COG", "GEOTIFF"].includes(format)
  ) {
    // TIFF/COG tiles are requested lazily from the protected preview
    // endpoint. The task payload does not need to contain visualization
    // metadata for the artifact to be map-viewable.
    return enabled(
      type.toUpperCase().includes("COG") || format === "COG"
        ? "COG"
        : "GEOTIFF",
      "map"
    );
  }
  return disabled("BINARY", "该二进制产物暂不支持在线查看");
}

function enabled(
  format: string,
  mode: ArtifactViewCapability["mode"]
): ResolvedArtifactView {
  return { format, enabled: true, mode };
}

function disabled(format: string, reason: string): ResolvedArtifactView {
  return { format, enabled: false, mode: "disabled", reason };
}
