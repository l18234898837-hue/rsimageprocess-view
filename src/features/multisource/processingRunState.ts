import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage,
  ProcessingIdentifier
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
  const succeeded = runtimeSucceededCount(views);
  return Math.max(
    0,
    Math.min(100, Math.round((succeeded / views.length) * 100))
  );
}

export function runtimeSucceededCount(views: readonly RuntimeStageView[]) {
  return views.filter(view => view.status === "SUCCEEDED").length;
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

export function sameProcessingIdentifier(
  left: ProcessingIdentifier,
  right: ProcessingIdentifier
) {
  return String(left) === String(right);
}

export interface RuntimeStageView {
  readonly step: StepDefinition;
  readonly stage?: ExecutionProgressStage;
  readonly status: ProcessingStepViewStatus;
  readonly artifacts: readonly ExecutionProgressArtifact[];
  readonly remoteOnly?: boolean;
}

const PROCESSING_STAGE_LABELS: Record<string, string> = {
  VALIDATE_BROWSE: "验证浏览产品",
  GEOREFERENCE_BROWSE: "解析地理参考",
  EXTRACT_VISUAL_FEATURES: "提取视觉特征",
  WRITE_BROWSE_REPORT: "生成浏览报告",
  VALIDATE_SOURCE: "校验 L2A 产品",
  STANDARDIZE_L2A: "处理 HY-1C CZI L2A 产品",
  EXTRACT_FEATURES: "提取特征",
  DECODE_SCALE_AND_NODATA: "解码波段与无效值",
  APPLY_L2_FLAGS: "应用 L2 质量标志",
  GEOLOCATE_AND_GRID: "地理定位与网格化",
  CROP_OPTIONAL: "按范围裁剪",
  CROP_CZI: "按范围裁剪 CZI 影像",
  WRITE_STANDARD_COG: "生成标准 COG",
  EXTRACT_CZI_FEATURES: "提取特征",
  FUSE_CZI_BANDS: "生成显示融合",
  DETECT_CZI_SALIENCY: "生成显著性结果",
  STANDARDIZE_MERSI_L1: "处理 FY-3H MERSI L1 产品",
  VALIDATE_FY3H_PAIR: "校验 1000M / GEO1K 配对",
  DECODE_MERSI_L1: "解码 MERSI L1 通道",
  CALIBRATE_MERSI_L1: "定标 MERSI 观测",
  APPLY_MERSI_QUALITY: "应用 MERSI 质量掩膜",
  GRID_MERSI_SWATH: "扫描带网格化",
  WRITE_MERSI_STANDARD_COG: "生成 MERSI 标准 COG",
  EXTRACT_MERSI_FEATURES: "提取 MERSI 特征",
  FUSE_MERSI_BANDS: "生成 MERSI 多波段融合",
  DETECT_MERSI_SALIENCY: "检测 MERSI 显著性",
  STANDARDIZE_ALTIMETER_TRACK: "处理 HY-2D 高度计沿轨产品",
  DECODE_ALTIMETER_TRACK: "解码高度计沿轨数据",
  APPLY_TRACK_QUALITY: "应用沿轨质量规则",
  CALCULATE_BASELINE_SSH: "计算基线海表高度",
  EXTRACT_TRACK_FEATURES: "提取沿轨特征",
  DETECT_TRACK_ANOMALIES: "检测沿轨异常",
  WRITE_STANDARD_TRACK_OUTPUT: "生成标准沿轨产品",
  GRID_TRACK_OPTIONAL: "生成可选网格产品",
  STANDARDIZE_FY4B_AGRI: "处理 FY-4B AGRI 全圆盘产品",
  STANDARDIZE_GF6_WFV_L1A: "处理 GF-6 WFV L1A 工程产品",
  VALIDATE_GF6_WFV_L1A: "校验 GF-6 WFV L1A 产品包",
  VALIDATE_GF6_TILES: "校验 GF-6 WFV 瓦片",
  MOSAIC_GF6_TILES: "三层拼接",
  GEOLOCATE_GF6_RPC: "RPC/导航定位",
  STANDARDIZE_GF6_PROJECTION: "投影与标准影像",
  WRITE_GF6_STANDARD_COG: "生成 GF-6 标准 COG",
  WRITE_GF6_STANDARD: "生成 GF-6 标准产品",
  EXTRACT_GF6_FEATURES: "提取 GF-6 影像特征",
  FUSE_GF6_BANDS: "生成 GF-6 多波段融合",
  FUSE_GF6_RGB: "生成 GF-6 多波段融合",
  DETECT_GF6_SALIENCY: "检测 GF-6 显著性",
  VALIDATE_FY4B_PACKAGE: "校验 FY-4B AGRI 产品包",
  VALIDATE_FY4B_INPUTS: "校验 FY-4B AGRI 输入数据",
  APPLY_FY4B_QUALITY: "应用 FY-4B 质量掩膜",
  GRID_FY4B_RASTERS: "FY-4B 影像网格化",
  BUILD_FY4B_NOMINAL_GRID: "构建 FY-4B 名义定位网格",
  CALIBRATE_AND_GEOREFERENCE_FY4B: "FY-4B 辐射定标与地理配准",
  REPROJECT_AND_CROP_FY4B: "FY-4B 重投影与范围裁剪",
  WRITE_FY4B_STANDARD_COG: "生成 FY-4B 标准 COG",
  WRITE_FY4B_STANDARD: "生成 FY-4B 标准产品",
  EXTRACT_FY4B_FEATURES: "提取 FY-4B 影像特征",
  FUSE_FY4B_BANDS: "生成 FY-4B 波段融合",
  DETECT_FY4B_SALIENCY: "检测 FY-4B 显著性"
};

export function processingStageLabel(stageCode: string, isHy2d = false) {
  if (stageCode === "VALIDATE_SOURCE" && isHy2d) {
    return "校验 HY-2D 产品包";
  }
  return PROCESSING_STAGE_LABELS[stageCode] || stageCode;
}

export interface ArtifactStageGroup {
  readonly stageId: ExecutionProgressStage["stageId"];
  readonly stageKey: string;
  readonly artifacts: readonly ExecutionProgressArtifact[];
}

/**
 * A remote stage can satisfy more than one planned UI step. Keep the full
 * step mapping for the plan panel, but render each actual execution stage
 * only once in the progress dialog.
 */
export function collapseRuntimeStageViews(
  views: readonly RuntimeStageView[]
): RuntimeStageView[] {
  const seenStageIds = new Set<string>();
  return views.filter(view => {
    if (!view.stage) return true;
    const stageId = String(view.stage.stageId);
    if (seenStageIds.has(stageId)) return false;
    seenStageIds.add(stageId);
    return true;
  });
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
  CALIBRATE_AND_GEOREFERENCE_FY4B: ["calibration-georeference"],
  BUILD_FY4B_NOMINAL_GRID: ["geo-grid-construction"],
  REPROJECT_AND_CROP_FY4B: ["reprojection-crop"],
  VALIDATE_GF6_WFV_L1A: ["upload-validation"],
  MOSAIC_GF6_TILES: ["tile-mosaic"],
  GEOLOCATE_GF6_RPC: ["rpc-geolocation"],
  STANDARDIZE_GF6_PROJECTION: ["projection-standardization"],
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
      artifacts: artifacts.filter(artifact =>
        sameProcessingIdentifier(artifact.stageId, stage.stageId)
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
        ? artifacts.filter(artifact =>
            sameProcessingIdentifier(artifact.stageId, stage.stageId)
          )
        : []
    };
  });

  const knownStageKeys = new Set(
    views.filter(view => view.stage).map(view => view.stage?.stageKey)
  );
  orderedStages.forEach(stage => {
    if (
      knownStageKeys.has(stage.stageKey) ||
      views.some(
        view =>
          view.stage?.stageId !== undefined &&
          sameProcessingIdentifier(view.stage.stageId, stage.stageId)
      ) ||
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
      artifacts: artifacts.filter(artifact =>
        sameProcessingIdentifier(artifact.stageId, stage.stageId)
      ),
      remoteOnly: true
    });
  });
  return views;
}
