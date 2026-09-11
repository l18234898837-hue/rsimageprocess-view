import test from "node:test";
import assert from "node:assert/strict";
import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";
import * as capabilities from "./artifactCapabilities";

const artifact = (
  overrides: Partial<ExecutionProgressArtifact>
): ExecutionProgressArtifact => ({
  stageId: 8,
  type: "STANDARD_COG",
  uri: "rs://output/task/standard/scene.tif",
  checksum: "sha256:test",
  retention: "FINAL",
  downloadable: true,
  ...overrides
});

const resolveArtifactView = (capabilities as Record<string, unknown>)
  .resolveArtifactView as (artifact: ExecutionProgressArtifact) => {
  format: string;
  enabled: boolean;
  mode: string;
  reason?: string;
};

test("uses server-declared artifact preview capabilities", () => {
  const result = resolveArtifactView(
    artifact({
      format: "COG",
      view: { enabled: true, mode: "map", inspectionUrl: "/inspection" }
    })
  );

  assert.deepEqual(result, {
    format: "COG",
    enabled: true,
    mode: "map",
    inspectionUrl: "/inspection"
  });
});

test("keeps legacy artifacts viewable by their actual file format", () => {
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/result.geojson" })),
    {
      format: "GEOJSON",
      enabled: true,
      mode: "map"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/track.csv" })),
    {
      format: "CSV",
      enabled: true,
      mode: "map"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/track.nc" })),
    {
      format: "NETCDF",
      enabled: false,
      mode: "disabled",
      reason: "NetCDF 在线查看器尚未接入，请下载后查看"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/track.parquet" })),
    {
      format: "PARQUET",
      enabled: false,
      mode: "disabled",
      reason: "Parquet 在线查看器尚未接入，请下载后查看"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/scene.png" })),
    {
      format: "PNG",
      enabled: true,
      mode: "image"
    }
  );
});

test("promotes PNG artifacts with safe overlay metadata to map viewing", () => {
  assert.deepEqual(
    resolveArtifactView(
      artifact({
        uri: "rs://out/rgb.png",
        format: "PNG",
        visualization: {
          kind: "bounds",
          imageUrl: "/api/multisource/processing-tasks/8/artifacts/RGB/image",
          bounds: [110, 20, 120, 30],
          crs: "EPSG:4326"
        }
      })
    ),
    { format: "PNG", enabled: true, mode: "map" }
  );
});

test("does not advertise TIFF map viewing without a safe tile service", () => {
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/scene.tif" })),
    {
      format: "COG",
      enabled: false,
      mode: "disabled",
      reason: "TIFF/COG 需要安全瓦片服务才能在线查看，请下载后查看"
    }
  );
});

test("enables TIFF map viewing when the backend advertises the protected tile capability", () => {
  assert.deepEqual(
    resolveArtifactView(
      artifact({
        uri: "rs://out/scene.tif",
        format: "COG",
        view: { enabled: true, mode: "map" }
      })
    ),
    { format: "COG", enabled: true, mode: "map" }
  );
});

test("disables binary NPZ previews with an actionable reason", () => {
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/grid/czi.npz" })),
    {
      format: "NPZ",
      enabled: false,
      mode: "disabled",
      reason: "NPZ 二进制中间数据暂不支持在线查看"
    }
  );
});
