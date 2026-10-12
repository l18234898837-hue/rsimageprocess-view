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
  processingStageLabel,
  runtimeProgressPercent,
  runtimeSucceededCount,
  uiStepKeysForRemoteStage,
  formatStageDuration,
  artifactPresentation,
  isStageCompletionEdge,
  sameProcessingIdentifier,
  type RuntimeStageView
} from "./processingRunState";
import { getPipelineDefinition } from "./pipelineDefinitions";

const stage = (overrides: Partial<ExecutionProgressStage> = {}) => ({
  stageId: 1,
  stageKey: "rgb-fusion",
  status: "CREATED",
  attempt: 1,
  ...overrides
});

test("uses the shared Chinese labels for remote stage keys", () => {
  assert.equal(processingStageLabel("VALIDATE_SOURCE"), "校验 L2A 产品");
  assert.equal(
    processingStageLabel("VALIDATE_SOURCE", true),
    "校验 HY-2D 产品包"
  );
  assert.equal(
    processingStageLabel("DECODE_ALTIMETER_TRACK"),
    "解码高度计沿轨数据"
  );
  assert.equal(processingStageLabel("UNKNOWN_STAGE"), "UNKNOWN_STAGE");
});

test("translates current product stages and supported legacy stage aliases", () => {
  const labels = {
    FUSE_GF6_RGB: "生成 GF-6 多波段融合",
    STANDARDIZE_L2A: "处理 HY-1C CZI L2A 产品",
    CROP_CZI: "按范围裁剪 CZI 影像",
    EXTRACT_FEATURES: "提取特征",
    VALIDATE_FY4B_INPUTS: "校验 FY-4B AGRI 输入数据",
    VALIDATE_GF6_TILES: "校验 GF-6 WFV 瓦片",
    APPLY_FY4B_QUALITY: "应用 FY-4B 质量掩膜",
    GRID_FY4B_RASTERS: "FY-4B 影像网格化",
    WRITE_FY4B_STANDARD: "生成 FY-4B 标准产品",
    WRITE_GF6_STANDARD: "生成 GF-6 标准产品"
  };
  for (const [stageCode, label] of Object.entries(labels)) {
    assert.equal(processingStageLabel(stageCode), label, stageCode);
  }
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

test("maps HY-1C decode stage to decode and scale-factor UI steps", () => {
  assert.deepEqual(
    uiStepKeysForRemoteStage("DECODE_SCALE_AND_NODATA", "hy1c-czi-l2a-v1"),
    ["band-metadata-decode", "scale-factor-processing"]
  );
});

test("counts a shared HY-1C decode stage for both visible steps", () => {
  const views = buildRuntimeStageViews(
    getPipelineDefinition("hy1c-czi-l2a-v1").steps,
    [
      stage({
        stageId: 10,
        stageKey: "DECODE_SCALE_AND_NODATA",
        status: "SUCCEEDED"
      })
    ]
  );
  assert.equal(
    views.find(view => view.step.key === "band-metadata-decode")?.status,
    "SUCCEEDED"
  );
  assert.equal(
    views.find(view => view.step.key === "scale-factor-processing")?.status,
    "SUCCEEDED"
  );
});

test("does not add known internal CZI crop stage as remote-only", () => {
  const views = buildRuntimeStageViews(
    getPipelineDefinition("hy1c-czi-l2a-v1").steps,
    [stage({ stageId: 11, stageKey: "CROP_CZI", status: "SUCCEEDED" })]
  );
  assert.equal(
    views.some(view => view.remoteOnly && view.stage?.stageKey === "CROP_CZI"),
    false
  );
});

test("maps actual FY-4B and GF-6 staged keys to visible steps", () => {
  assert.deepEqual(uiStepKeysForRemoteStage("WRITE_FY4B_STANDARD_COG"), [
    "standard-product"
  ]);
  assert.deepEqual(uiStepKeysForRemoteStage("FUSE_FY4B_BANDS"), ["rgb-fusion"]);
  assert.deepEqual(uiStepKeysForRemoteStage("VALIDATE_GF6_WFV_L1A"), [
    "upload-validation"
  ]);
  assert.deepEqual(uiStepKeysForRemoteStage("FUSE_GF6_RGB"), ["rgb-fusion"]);
});

test("formats stage duration and classifies artifact presentation", () => {
  assert.equal(
    formatStageDuration({
      startedAt: "2026-01-01T00:00:00Z",
      finishedAt: "2026-01-01T00:01:05Z"
    }),
    "1 分 5 秒"
  );
  assert.equal(
    artifactPresentation({
      stageId: 1,
      type: "SUMMARY_JSON",
      uri: "rs://summary.json",
      checksum: "x",
      sizeBytes: 42
    }).kind,
    "json"
  );
  assert.equal(
    artifactPresentation({
      stageId: 1,
      type: "COG",
      uri: "rs://result.tif",
      checksum: "x"
    }).canPreview,
    false
  );
  assert.equal(isStageCompletionEdge("RUNNING", "SUCCEEDED"), true);
  assert.equal(isStageCompletionEdge("SUCCEEDED", "SUCCEEDED"), false);
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

test("matches artifact and stage identifiers across JSON number/string representations", () => {
  assert.equal(sameProcessingIdentifier("201", 201), true);
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

test("does not count failed stages as completed stages", () => {
  const views = [
    { status: "FAILED" },
    { status: "WAITING" }
  ] as RuntimeStageView[];

  assert.equal(runtimeSucceededCount(views), 0);
});
