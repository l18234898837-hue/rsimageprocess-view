import test from "node:test";
import assert from "node:assert/strict";
import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";
import * as artifactMapPreview from "./artifactMapPreview";

const artifact = (
  overrides: Partial<ExecutionProgressArtifact>
): ExecutionProgressArtifact => ({
  stageId: 8,
  type: "PROCESSING_RESULT",
  uri: "rs://output/task/result.geojson",
  checksum: "sha256:test",
  sizeBytes: 32,
  downloadable: true,
  mediaType: "application/geo+json",
  ...overrides
});

type MapPreviewParser = (
  artifact: ExecutionProgressArtifact,
  value: string
) =>
  | { kind: "geojson"; data: Record<string, unknown> }
  | { kind: "bounds"; bounds: [number, number, number, number] };

const parseMapArtifactPreview = (artifactMapPreview as Record<string, unknown>)
  .parseMapArtifactPreview as MapPreviewParser;
const isMapPreviewCandidate = (artifactMapPreview as Record<string, unknown>)
  .isMapPreviewCandidate as (artifact: ExecutionProgressArtifact) => boolean;
const parseTileArtifactVisualization = (
  artifactMapPreview as Record<string, unknown>
).parseTileArtifactVisualization as (
  artifact: ExecutionProgressArtifact
) => unknown;

test("converts GeoJSON artifacts into a map-ready feature collection", () => {
  assert.ok(parseMapArtifactPreview, "map artifact parser should be available");
  assert.ok(isMapPreviewCandidate, "map candidate check should be available");

  const source =
    '{"type":"Feature","properties":{"name":"站点 A"},"geometry":{"type":"Point","coordinates":[120.1,30.2]}}';
  assert.equal(
    isMapPreviewCandidate(artifact({ mediaType: "application/geo+json" })),
    true
  );
  assert.equal(
    isMapPreviewCandidate(
      artifact({
        type: "PROCESSING_SUMMARY_JSON",
        mediaType: "application/json",
        uri: "rs://output/task/summary.json"
      })
    ),
    false
  );
  assert.deepEqual(
    parseMapArtifactPreview(
      artifact({ mediaType: "application/geo+json" }),
      source
    ),
    {
      kind: "geojson",
      data: JSON.parse(source)
    }
  );
});

test("converts CSV longitude and latitude columns into map points", () => {
  assert.ok(parseMapArtifactPreview, "map artifact parser should be available");

  const result = parseMapArtifactPreview(
    artifact({ mediaType: "text/csv", uri: "rs://output/task/track.csv" }),
    "station,longitude,latitude,value\nA,120.1,30.2,8\nB,121.3,31.4,9"
  );

  assert.equal(result.kind, "geojson");
  assert.deepEqual(result.data, {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          station: "A",
          longitude: "120.1",
          latitude: "30.2",
          value: "8"
        },
        geometry: { type: "Point", coordinates: [120.1, 30.2] }
      },
      {
        type: "Feature",
        properties: {
          station: "B",
          longitude: "121.3",
          latitude: "31.4",
          value: "9"
        },
        geometry: { type: "Point", coordinates: [121.3, 31.4] }
      }
    ]
  });
});

test("uses WGS84 bounds declared by a JSON result and rejects unsupported map content", () => {
  assert.ok(parseMapArtifactPreview, "map artifact parser should be available");

  assert.deepEqual(
    parseMapArtifactPreview(
      artifact({
        mediaType: "application/json",
        uri: "rs://output/task/summary.json"
      }),
      '{"bbox":[110,20,120,30]}'
    ),
    { kind: "bounds", bounds: [110, 20, 120, 30] }
  );
  assert.throws(
    () =>
      parseMapArtifactPreview(
        artifact({
          mediaType: "application/json",
          uri: "rs://output/task/summary.json"
        }),
        '{"status":"completed"}'
      ),
    /未包含可在地图中显示的空间数据/
  );
});

test("recognizes backend-provided tile visualization without inspecting the source file", () => {
  const tileArtifact = artifact({
    type: "COG",
    uri: "rs://output/task/reflectance.tif",
    mediaType: "image/tiff",
    visualization: {
      kind: "tiles",
      tileUrl:
        "/api/multisource/processing-tasks/8/artifacts/COG/tiles/{z}/{x}/{y}.png",
      bounds: [110, 20, 120, 30],
      crs: "EPSG:4326",
      minZoom: 2,
      maxZoom: 14
    }
  });

  assert.equal(isMapPreviewCandidate(tileArtifact), true);
  assert.deepEqual(
    parseTileArtifactVisualization(tileArtifact),
    tileArtifact.visualization
  );
});

test("rejects unsafe tile URLs and invalid WGS84 bounds", () => {
  const invalidUrl = artifact({
    type: "COG",
    uri: "rs://output/task/reflectance.tif",
    mediaType: "image/tiff",
    visualization: {
      kind: "tiles",
      tileUrl: "javascript:alert(1)",
      bounds: [110, 20, 120, 30]
    }
  });
  const invalidBounds = artifact({
    type: "COG",
    uri: "rs://output/task/reflectance.tif",
    mediaType: "image/tiff",
    visualization: {
      kind: "tiles",
      tileUrl: "/tiles/{z}/{x}/{y}.png",
      bounds: [110, 95, 120, 30]
    }
  });

  assert.equal(parseTileArtifactVisualization(invalidUrl), undefined);
  assert.equal(parseTileArtifactVisualization(invalidBounds), undefined);
  assert.equal(isMapPreviewCandidate(invalidUrl), false);
  assert.equal(isMapPreviewCandidate(invalidBounds), false);
});
