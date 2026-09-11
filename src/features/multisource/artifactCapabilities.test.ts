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
      mode: "table"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/track.nc" })),
    {
      format: "NETCDF",
      enabled: true,
      mode: "dataset"
    }
  );
  assert.deepEqual(
    resolveArtifactView(artifact({ uri: "rs://out/track.parquet" })),
    {
      format: "PARQUET",
      enabled: true,
      mode: "dataset"
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
