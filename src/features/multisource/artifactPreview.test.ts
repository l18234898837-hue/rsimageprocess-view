import test from "node:test";
import assert from "node:assert/strict";
import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";
import {
  artifactPreviewKind,
  assertArtifactPreviewable,
  buildJsonArtifactSummary,
  buildJsonArtifactFieldTree,
  extractJsonArtifactMetrics,
  formatArtifactPreviewText,
  MAX_JSON_ARTIFACT_PREVIEW_BYTES,
  MAX_ARTIFACT_PREVIEW_BYTES
} from "./artifactPreview";

const artifact = (
  overrides: Partial<ExecutionProgressArtifact> = {}
): ExecutionProgressArtifact => ({
  stageId: 8,
  type: "PROCESSING_SUMMARY_JSON",
  uri: "rs://output/task/summary.json",
  checksum: "sha256:test",
  sizeBytes: 32,
  downloadable: true,
  previewable: true,
  mediaType: "application/json",
  ...overrides
});

test("classifies only approved image and text artifact formats for preview", () => {
  assert.equal(artifactPreviewKind(artifact()), "json");
  assert.equal(
    artifactPreviewKind(
      artifact({ mediaType: "image/png", uri: "rs://output/task/map.png" })
    ),
    "image"
  );
  assert.equal(
    artifactPreviewKind(
      artifact({ mediaType: "text/csv", uri: "rs://output/task/report.csv" })
    ),
    "text"
  );
  assert.equal(
    artifactPreviewKind(
      artifact({ mediaType: "image/tiff", uri: "rs://output/task/result.tif" })
    ),
    undefined
  );
});

test("blocks unavailable and oversized artifacts before requesting their preview blob", () => {
  assert.throws(
    () => assertArtifactPreviewable(artifact({ previewable: false })),
    /暂不支持在线查看/
  );
  assert.throws(
    () =>
      assertArtifactPreviewable(
        artifact({ sizeBytes: MAX_ARTIFACT_PREVIEW_BYTES + 1 })
      ),
    /文件较大/
  );
});

test("blocks large JSON files before parsing them on the main thread", () => {
  assert.throws(
    () =>
      assertArtifactPreviewable(
        artifact({ sizeBytes: MAX_JSON_ARTIFACT_PREVIEW_BYTES + 1 })
      ),
    /JSON 文件较大/
  );
});

test("formats valid JSON while preserving invalid text verbatim", () => {
  assert.equal(
    formatArtifactPreviewText('{"valid":true}', "json"),
    '{\n  "valid": true\n}'
  );
  assert.equal(formatArtifactPreviewText("not-json", "json"), "not-json");
  assert.equal(formatArtifactPreviewText("a,b\n1,2", "text"), "a,b\n1,2");
});

test("builds a compact JSON summary with scalar rows, nested objects, and array tables", () => {
  const summary = buildJsonArtifactSummary(
    '{"taskName":"大气校正","completed":true,"metrics":{"coverage":0.98,"bounds":{"west":110}},"tiles":[{"id":"T001","score":0.91},{"id":"T002","score":0.88}]}'
  );

  assert.equal(summary.valid, true);
  assert.deepEqual(summary.root?.scalars, [
    { key: "taskName", value: "大气校正" },
    { key: "completed", value: "是" }
  ]);
  assert.deepEqual(summary.root?.objects[0]?.content.scalars, [
    { key: "coverage", value: "0.98" }
  ]);
  assert.equal(summary.root?.objects[0]?.content.objects[0]?.key, "bounds");
  assert.deepEqual(summary.root?.arrays[0], {
    key: "tiles",
    columns: ["id", "score"],
    rows: [
      { id: "T001", score: "0.91" },
      { id: "T002", score: "0.88" }
    ],
    totalCount: 2,
    truncated: false
  });
});

test("limits JSON array summaries to fifty rows and leaves invalid JSON to the raw view", () => {
  const summary = buildJsonArtifactSummary(
    JSON.stringify({
      values: Array.from({ length: 51 }, (_, index) => index + 1)
    })
  );
  assert.equal(summary.root?.arrays[0]?.rows.length, 50);
  assert.equal(summary.root?.arrays[0]?.totalCount, 51);
  assert.equal(summary.root?.arrays[0]?.truncated, true);

  const invalidSummary = buildJsonArtifactSummary("not-json");
  assert.equal(invalidSummary.valid, false);
  assert.equal(invalidSummary.root, undefined);
  assert.equal(invalidSummary.rawText, "not-json");
});

test("infers preview kinds from the declared artifact format when media type is generic", () => {
  assert.equal(
    artifactPreviewKind(
      artifact({
        format: "JSON",
        mediaType: "application/octet-stream",
        uri: "rs://output/task/result.bin"
      })
    ),
    "json"
  );
  assert.equal(
    artifactPreviewKind(
      artifact({
        format: "PNG",
        mediaType: "application/octet-stream",
        uri: "rs://output/task/result.bin"
      })
    ),
    "image"
  );
});

test("extracts metric scalars and a bounded field tree for the JSON viewer", () => {
  const source = {
    status: "completed",
    statistics: { mean: 12.4, max: 20, count: 3 },
    records: [{ id: "A", value: 1 }]
  };

  assert.deepEqual(extractJsonArtifactMetrics(source), [
    { key: "mean", value: "12.4" },
    { key: "max", value: "20" },
    { key: "count", value: "3" }
  ]);
  assert.deepEqual(buildJsonArtifactFieldTree(source), [
    {
      key: "status",
      kind: "scalar",
      value: "completed"
    },
    {
      key: "statistics",
      kind: "object",
      children: [
        { key: "mean", kind: "scalar", value: "12.4" },
        { key: "max", kind: "scalar", value: "20" },
        { key: "count", kind: "scalar", value: "3" }
      ]
    },
    {
      key: "records",
      kind: "array",
      value: "1 项"
    }
  ]);
});
