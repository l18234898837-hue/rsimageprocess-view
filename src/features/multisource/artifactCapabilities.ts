import type {
  ArtifactViewCapability,
  ExecutionProgressArtifact
} from "@/api/multiSourceSatellite";

export interface ResolvedArtifactView extends ArtifactViewCapability {
  format: string;
}

export function resolveArtifactView(
  artifact: ExecutionProgressArtifact
): ResolvedArtifactView {
  if (artifact.format && artifact.view) {
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
  return fallbackArtifactView(artifact.uri, artifact.type);
}

function fallbackArtifactView(uri: string, type: string): ResolvedArtifactView {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  if (/\.geojson$/.test(path) || type.toUpperCase().includes("GEOJSON")) {
    return enabled("GEOJSON", "map");
  }
  if (/\.csv$/.test(path)) return enabled("CSV", "table");
  if (/\.nc$/.test(path)) return enabled("NETCDF", "dataset");
  if (/\.parquet$/.test(path)) return enabled("PARQUET", "dataset");
  if (/\.json$/.test(path)) return enabled("JSON", "json");
  if (/\.png$/.test(path)) return enabled("PNG", "image");
  if (/\.jpe?g$/.test(path)) return enabled("JPEG", "image");
  if (/\.webp$/.test(path)) return enabled("WEBP", "image");
  if (/\.gif$/.test(path)) return enabled("GIF", "image");
  if (/\.(txt|log|xml)$/.test(path)) return enabled("TEXT", "text");
  if (/\.npz$/.test(path)) {
    return disabled("NPZ", "NPZ 二进制中间数据暂不支持在线查看");
  }
  if (/\.tiff?$/.test(path)) {
    return enabled(
      type.toUpperCase().includes("COG") ? "COG" : "GEOTIFF",
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
