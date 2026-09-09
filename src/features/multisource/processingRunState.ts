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

export function formatStageDuration(
  stage: Pick<
    ExecutionProgressStage,
    "startedAt" | "finishedAt" | "durationMs"
  >,
  now = Date.now()
) {
  const duration =
    stage.durationMs ??
    (stage.startedAt
      ? Math.max(
          0,
          new Date(stage.finishedAt || now).getTime() -
            new Date(stage.startedAt).getTime()
        )
      : 0);
  if (!duration) return "—";
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
}

export function artifactPresentation(artifact: ExecutionProgressArtifact) {
  const name =
    artifact.displayName ||
    artifact.uri.split(/[\\/]/).pop()?.split(/[?#]/)[0] ||
    artifact.type;
  const media = artifact.mediaType || "";
  const lower = `${media} ${name} ${artifact.type}`.toLowerCase();
  const kind =
    lower.includes("json") || lower.includes("summary")
      ? "json"
      : lower.includes("png") ||
          lower.includes("jpeg") ||
          lower.includes("jpg") ||
          lower.includes("webp") ||
          lower.includes("gif")
        ? "image"
        : lower.includes("cog") ||
            lower.includes("tiff") ||
            lower.includes("netcdf") ||
            lower.includes("parquet") ||
            lower.includes("hdf")
          ? "scientific"
          : "file";
  const bytes = artifact.sizeBytes || 0;
  const sizeLabel =
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return {
    displayName: name,
    kind,
    canPreview: artifact.previewable ?? (kind === "image" || kind === "json"),
    sizeLabel,
    retentionLabel:
      artifact.retention === "FINAL"
        ? "最终产物"
        : artifact.retention === "INTERMEDIATE"
          ? "中间产物"
          : "产物"
  };
}

export function isStageCompletionEdge(
  previousStatus: string | undefined,
  currentStatus: string
) {
  return currentStatus === "SUCCEEDED" && previousStatus !== "SUCCEEDED";
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
  WRITE_FY4B_STANDARD_COG: "standard-product",
  WRITE_GF6_STANDARD: "standard-product",
  WRITE_GF6_STANDARD_COG: "standard-product",
  WRITE_STANDARD_TRACK_OUTPUT: "map-preview",
  EXTRACT_CZI_FEATURES: "feature-extraction",
  EXTRACT_MERSI_FEATURES: "feature-extraction",
  EXTRACT_FY4B_FEATURES: "feature-extraction",
  EXTRACT_GF6_FEATURES: "feature-extraction",
  EXTRACT_TRACK_FEATURES: "along-track-feature-extraction",
  EXTRACT_VISUAL_FEATURES: "feature-extraction",
  FUSE_CZI_BANDS: "rgb-fusion",
  FUSE_MERSI_BANDS: "rgb-fusion",
  FUSE_GF6_BANDS: "rgb-fusion",
  FUSE_FY4B_BANDS: "rgb-fusion",
  FUSE_GF6_RGB: "rgb-fusion",
  DETECT_CZI_SALIENCY: "anomaly-detection",
  DETECT_MERSI_SALIENCY: "anomaly-detection",
  DETECT_TRACK_ANOMALIES: "anomaly-detection",
  DETECT_GF6_SALIENCY: "anomaly-detection",
  DETECT_FY4B_SALIENCY: "anomaly-detection",
  WRITE_BROWSE_REPORT: "map-preview",
  GRID_TRACK_OPTIONAL: "track-gridding"
};

const REMOTE_STAGE_UI_STEPS: Record<string, readonly string[]> = {
  DECODE_SCALE_AND_NODATA: ["band-metadata-decode", "scale-factor-processing"],
  CROP_CZI: ["projection-standardization"],
  CALIBRATE_MERSI_L1: ["radiometric-calibration"],
  CALIBRATE_AND_GEOREFERENCE_FY4B: [
    "radiometric-calibration",
    "projection-standardization"
  ],
  BUILD_FY4B_NOMINAL_GRID: ["geo-grid-construction"],
  REPROJECT_AND_CROP_FY4B: ["projection-standardization"],
  VALIDATE_GF6_WFV_L1A: ["upload-validation"],
  WRITE_GF6_STANDARD_COG: ["standard-product"],
  WRITE_FY4B_STANDARD_COG: ["standard-product"],
  EXTRACT_FY4B_FEATURES: ["feature-extraction"],
  FUSE_FY4B_BANDS: ["rgb-fusion"],
  DETECT_FY4B_SALIENCY: ["anomaly-detection"],
  EXTRACT_GF6_FEATURES: ["feature-extraction"],
  FUSE_GF6_RGB: ["rgb-fusion"],
  DETECT_GF6_SALIENCY: ["anomaly-detection"],
  DECODE_ALTIMETER_TRACK: ["along-track-decode"],
  APPLY_TRACK_QUALITY: ["quality-control"],
  CALCULATE_BASELINE_SSH: ["ssh-baseline"],
  WRITE_STANDARD_TRACK_OUTPUT: ["map-preview"],
  WRITE_BROWSE_REPORT: ["map-preview"],
  GRID_TRACK_OPTIONAL: ["track-gridding"]
};

const INTERNAL_STAGE_KEYS = new Set([
  "CROP_CZI",
  "BUILD_FY4B_NOMINAL_GRID",
  "REPROJECT_AND_CROP_FY4B"
]);

export function uiStepKeysForRemoteStage(
  stageKey: string,
  _productId?: string
): readonly string[] {
  return (
    REMOTE_STAGE_UI_STEPS[stageKey] ||
    (REMOTE_STAGE_ALIASES[stageKey] ? [REMOTE_STAGE_ALIASES[stageKey]] : [])
  );
}

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
    uiStepKeysForRemoteStage(stage.stageKey).includes(step.key) ||
    uiStepKeysForRemoteStage(stage.stageCode || "").includes(step.key) ||
    stage.stageKey === step.key ||
    stage.stageCode === step.key
  );
}

export function buildRuntimeStageViews(
  steps: readonly StepDefinition[],
  stages: readonly ExecutionProgressStage[],
  artifacts: readonly ExecutionProgressArtifact[] = [],
  invalidatedSteps: readonly string[] = []
): RuntimeStageView[] {
  const orderedStages = [...stages].sort((left, right) =>
    String(left.stageId).localeCompare(String(right.stageId), undefined, {
      numeric: true
    })
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
      views.some(view => view.stage?.stageId === stage.stageId) ||
      INTERNAL_STAGE_KEYS.has(stage.stageKey)
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
