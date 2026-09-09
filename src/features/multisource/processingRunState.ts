import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import type { StepDefinition } from "./pipelineDefinitions";

export type ProcessingStepViewStatus =
  | "WAITING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "NEEDS_RERUN";

const PROCESSING_STEP_STATUS_LABELS: Record<ProcessingStepViewStatus, string> =
  {
    WAITING: "等待执行",
    PROCESSING: "正在执行",
    SUCCEEDED: "已完成",
    FAILED: "执行失败",
    NEEDS_RERUN: "需要重新执行"
  };

export function processingStepStatusLabel(status: ProcessingStepViewStatus) {
  return PROCESSING_STEP_STATUS_LABELS[status];
}

export function runtimeProgressPercent(views: readonly RuntimeStageView[]) {
  if (!views.length) return 0;
  const succeeded = views.filter(view => view.status === "SUCCEEDED").length;
  return Math.max(
    0,
    Math.min(100, Math.round((succeeded / views.length) * 100))
  );
}

export interface RuntimeStageView {
  readonly step: StepDefinition;
  readonly stage?: ExecutionProgressStage;
  readonly status: ProcessingStepViewStatus;
  readonly artifacts: readonly ExecutionProgressArtifact[];
  readonly remoteOnly?: boolean;
}

export interface ArtifactStageGroup {
  readonly stageId: ExecutionProgressStage["stageId"];
  readonly stageKey: string;
  readonly artifacts: readonly ExecutionProgressArtifact[];
}

const REMOTE_STAGE_ALIASES: Record<string, string> = {
  VALIDATE_SOURCE: "upload-validation",
  VALIDATE_FY3H_PAIR: "upload-validation",
  VALIDATE_FY4B_INPUTS: "upload-validation",
  VALIDATE_FY4B_PACKAGE: "upload-validation",
  VALIDATE_GF6_TILES: "upload-validation",
  VALIDATE_BROWSE: "upload-validation",
  DECODE_SCALE_AND_NODATA: "band-metadata-decode",
  DECODE_MERSI_L1: "data-decode",
  DECODE_ALTIMETER_TRACK: "along-track-decode",
  APPLY_L2_FLAGS: "l2-quality-control",
  APPLY_MERSI_QUALITY: "quality-control",
  APPLY_FY4B_QUALITY: "quality-mask",
  APPLY_TRACK_QUALITY: "quality-control",
  GEOLOCATE_AND_GRID: "projection-standardization",
  GRID_MERSI_SWATH: "swath-standardization",
  GRID_FY4B_RASTERS: "projection-standardization",
  GEOREFERENCE_BROWSE: "rpc-geolocation",
  WRITE_STANDARD_COG: "standard-product",
  WRITE_MERSI_STANDARD_COG: "standard-product",
  WRITE_FY4B_STANDARD: "standard-product",
  WRITE_GF6_STANDARD: "standard-product",
  WRITE_STANDARD_TRACK_OUTPUT: "map-preview",
  EXTRACT_CZI_FEATURES: "feature-extraction",
  EXTRACT_MERSI_FEATURES: "feature-extraction",
  EXTRACT_TRACK_FEATURES: "along-track-feature-extraction",
  EXTRACT_VISUAL_FEATURES: "feature-extraction",
  FUSE_CZI_BANDS: "rgb-fusion",
  FUSE_MERSI_BANDS: "rgb-fusion",
  FUSE_GF6_BANDS: "rgb-fusion",
  DETECT_CZI_SALIENCY: "anomaly-detection",
  DETECT_MERSI_SALIENCY: "anomaly-detection",
  DETECT_TRACK_ANOMALIES: "anomaly-detection",
  DETECT_GF6_SALIENCY: "anomaly-detection"
};

export function uiStepKeyForRemoteStage(stageKey: string) {
  return REMOTE_STAGE_ALIASES[stageKey] || stageKey;
}

export function mapStageStatus(
  stage: Pick<ExecutionProgressStage, "status" | "stageKey">,
  invalidatedSteps: readonly string[] = []
): ProcessingStepViewStatus {
  if (invalidatedSteps.includes(stage.stageKey)) {
    return "NEEDS_RERUN";
  }
  switch (stage.status) {
    case "RUNNING":
      return "PROCESSING";
    case "SUCCEEDED":
      return "SUCCEEDED";
    case "FAILED":
    case "RECOVERY_PENDING":
      return "FAILED";
    default:
      return "WAITING";
  }
}

export function groupArtifactsByStage(
  stages: readonly ExecutionProgressStage[],
  artifacts: readonly ExecutionProgressArtifact[]
): ArtifactStageGroup[] {
  return stages
    .map(stage => ({
      stageId: stage.stageId,
      stageKey: stage.stageKey,
      artifacts: artifacts.filter(
        artifact => artifact.stageId === stage.stageId
      )
    }))
    .filter(group => group.artifacts.length > 0);
}

function stageMatchesStep(stage: ExecutionProgressStage, step: StepDefinition) {
  return (
    stage.stageKey === step.key ||
    stage.stageCode === step.key ||
    uiStepKeyForRemoteStage(stage.stageKey) === step.key ||
    uiStepKeyForRemoteStage(stage.stageCode || "") === step.key
  );
}

export function buildRuntimeStageViews(
  steps: readonly StepDefinition[],
  stages: readonly ExecutionProgressStage[],
  artifacts: readonly ExecutionProgressArtifact[] = [],
  invalidatedSteps: readonly string[] = []
): RuntimeStageView[] {
  const orderedStages = [...stages].sort(
    (left, right) => left.stageId - right.stageId
  );
  const views: RuntimeStageView[] = steps.map(step => {
    const stage = orderedStages.find(candidate =>
      stageMatchesStep(candidate, step)
    );
    return {
      step,
      stage,
      status: stage ? mapStageStatus(stage, invalidatedSteps) : "WAITING",
      artifacts: stage
        ? artifacts.filter(artifact => artifact.stageId === stage.stageId)
        : []
    };
  });

  const knownStageKeys = new Set(
    views.filter(view => view.stage).map(view => view.stage?.stageKey)
  );
  orderedStages.forEach(stage => {
    if (
      knownStageKeys.has(stage.stageKey) ||
      views.some(view => view.stage?.stageId === stage.stageId)
    )
      return;
    views.push({
      step: {
        key: `remote:${stage.stageId}`,
        title: stage.stageCode || stage.stageKey,
        kind: "system",
        dependsOn: [],
        configurable: false
      },
      stage,
      status: mapStageStatus(stage, invalidatedSteps),
      artifacts: artifacts.filter(
        artifact => artifact.stageId === stage.stageId
      ),
      remoteOnly: true
    });
  });
  return views;
}
