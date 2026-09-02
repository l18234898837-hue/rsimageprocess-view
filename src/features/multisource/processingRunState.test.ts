import test from "node:test";
import assert from "node:assert/strict";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import { groupArtifactsByStage, mapStageStatus } from "./processingRunState";

const stage = (overrides: Partial<ExecutionProgressStage> = {}) => ({
  stageId: 1,
  stageKey: "rgb-fusion",
  status: "CREATED",
  attempt: 1,
  ...overrides
});

test("maps remote stage lifecycle to stable UI statuses", () => {
  assert.equal(mapStageStatus(stage()), "WAITING");
  assert.equal(mapStageStatus(stage({ status: "RUNNING" })), "PROCESSING");
  assert.equal(mapStageStatus(stage({ status: "SUCCEEDED" })), "SUCCEEDED");
  assert.equal(mapStageStatus(stage({ status: "FAILED" })), "FAILED");
  assert.equal(mapStageStatus(stage({ status: "RECOVERY_PENDING" })), "FAILED");
});

test("keeps a successful parallel stage successful when another stage fails", () => {
  assert.equal(
    mapStageStatus(stage({ status: "SUCCEEDED" }), ["feature-extraction"]),
    "SUCCEEDED"
  );
  assert.equal(
    mapStageStatus(
      stage({ status: "CREATED", stageKey: "feature-extraction" }),
      ["rgb-fusion"]
    ),
    "WAITING"
  );
  assert.equal(
    mapStageStatus(stage({ status: "SUCCEEDED" }), ["rgb-fusion"]),
    "NEEDS_RERUN"
  );
});

test("groups artifacts by their execution stage and preserves download authorization", () => {
  const artifacts: ExecutionProgressArtifact[] = [
    {
      stageId: 1,
      type: "RGB_COG",
      uri: "rs://rgb.tif",
      checksum: "a",
      downloadable: true
    },
    {
      stageId: 1,
      type: "RGB_PREVIEW",
      uri: "rs://rgb.jpg",
      checksum: "b",
      downloadable: false
    }
  ];
  const groups = groupArtifactsByStage(
    [stage({ stageId: 1, stageKey: "rgb-fusion" })],
    artifacts
  );

  assert.deepEqual(groups, [
    {
      stageId: 1,
      stageKey: "rgb-fusion",
      artifacts
    }
  ]);
});
