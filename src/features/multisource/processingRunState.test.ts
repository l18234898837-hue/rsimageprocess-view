import test from "node:test";
import assert from "node:assert/strict";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import {
  buildRuntimeStageViews,
  groupArtifactsByStage,
  mapStageStatus,
  processingStepStatusLabel,
  runtimeProgressPercent,
  type RuntimeStageView
} from "./processingRunState";

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

test("maps product-specific remote stage keys onto the shared UI steps", () => {
  const steps = [
    {
      key: "upload-validation",
      title: "Upload",
      kind: "system" as const,
      dependsOn: [],
      configurable: false
    },
    {
      key: "quality-control",
      title: "Quality",
      kind: "system" as const,
      dependsOn: [],
      configurable: false
    }
  ];
  const views = buildRuntimeStageViews(steps, [
    stage({ stageId: 10, stageKey: "VALIDATE_FY3H_PAIR", status: "SUCCEEDED" }),
    stage({ stageId: 11, stageKey: "APPLY_MERSI_QUALITY", status: "RUNNING" })
  ]);
  assert.deepEqual(
    views.map(view => [view.step.key, view.status]),
    [
      ["upload-validation", "SUCCEEDED"],
      ["quality-control", "PROCESSING"]
    ]
  );
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

test("keeps the full plan visible while trusting only reported stage states", () => {
  const steps = [
    {
      key: "preprocess",
      title: "Preprocess",
      kind: "system" as const,
      dependsOn: [],
      configurable: false
    },
    {
      key: "rgb-fusion",
      title: "RGB Fusion",
      kind: "target" as const,
      dependsOn: ["preprocess"],
      configurable: true
    }
  ];
  const views = buildRuntimeStageViews(steps, [
    stage({ stageId: 7, stageKey: "preprocess", status: "RUNNING" })
  ]);

  assert.deepEqual(
    views.map(view => [view.step.key, view.status]),
    [
      ["preprocess", "PROCESSING"],
      ["rgb-fusion", "WAITING"]
    ]
  );
});

test("uses the shared Chinese status vocabulary", () => {
  assert.equal(processingStepStatusLabel("WAITING"), "等待执行");
  assert.equal(processingStepStatusLabel("PROCESSING"), "正在执行");
  assert.equal(processingStepStatusLabel("SUCCEEDED"), "已完成");
  assert.equal(processingStepStatusLabel("FAILED"), "执行失败");
  assert.equal(processingStepStatusLabel("NEEDS_RERUN"), "需要重新执行");
});

test("counts only successful stages in the determinate dialog progress", () => {
  assert.equal(
    runtimeProgressPercent([
      { status: "SUCCEEDED" },
      { status: "PROCESSING" },
      { status: "WAITING" },
      { status: "FAILED" }
    ] as RuntimeStageView[]),
    25
  );
  assert.equal(runtimeProgressPercent([]), 0);
});
