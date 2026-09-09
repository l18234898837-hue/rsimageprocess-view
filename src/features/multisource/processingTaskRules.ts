import type {
  ExecutionProgressArtifact,
  PreflightCandidate,
  ProcessingAssetRequest,
  ProcessingIdentifier,
  ProcessingLifecycleStatus
} from "../../api/multiSourceSatellite";
import {
  GF6_WFV_BROWSE_TEMPLATE,
  type ProductTemplate,
  type SlotId
} from "./productTemplates";

const TERMINAL_STATUSES = new Set<ProcessingLifecycleStatus>([
  "SUCCEEDED",
  "FAILED",
  "CANCELED"
]);

const KNOWN_PROCESSING_ERROR_MESSAGES: Record<string, string> = {
  "文件授权已过期，请重新点击开始处理": "文件检查已过期，系统会自动重新检查",
  "Worker 执行失败，请稍后重试": "处理服务暂时不可用，请稍后重试",
  "process timed out":
    "处理超时：当前数据量或输出范围较大，请减少波段、启用 ROI，或检查 Worker 超时配置",
  "L2A quality filtering left no valid pixels in the requested output area":
    "所选 ROI 没有质量有效像元，请更换 ROI 或使用包含该区域有效覆盖的产品"
};

export function isProcessingTaskActive(
  taskId: ProcessingIdentifier | undefined,
  status: ProcessingLifecycleStatus | undefined
) {
  return taskId !== undefined && !TERMINAL_STATUSES.has(status || "CREATED");
}

export function processingStartSuccessMessage() {
  return "任务已启动";
}

export function assertTemplateSwitchAllowed(
  taskId: ProcessingIdentifier | undefined,
  status: ProcessingLifecycleStatus | undefined,
  isUploading: boolean
) {
  if (isUploading) {
    throw new Error("文件正在上传，请等待上传结束后再切换产品模板");
  }
  if (isProcessingTaskActive(taskId, status)) {
    throw new Error("任务正在执行，请先取消任务或等待任务结束后再更换产品");
  }
}

export function resetSlotStates<T extends string>(
  slots: Record<T, unknown>,
  slotIds: readonly T[]
) {
  slotIds.forEach(slotId => {
    slots[slotId] = { status: "EMPTY" };
  });
}

export function resetProcessingRunState<
  T extends {
    preflight: unknown;
    candidate: unknown;
    taskStatus: ProcessingLifecycleStatus | undefined;
    progress: unknown;
    errorMessage: string;
  }
>(state: T): T {
  state.preflight = undefined;
  state.candidate = undefined;
  state.taskStatus = undefined;
  state.progress = undefined;
  state.errorMessage = "";
  return state;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

export function extractProcessingErrorMessage(error: unknown) {
  const root = asRecord(error);
  const response = asRecord(root?.response);
  const responseData = asRecord(response?.data);
  const nestedData = asRecord(responseData?.data);
  for (const value of [responseData?.msg, nestedData?.msg]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  if (typeof root?.message === "string" && root.message.trim()) {
    return root.message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim() && error !== "error") {
    return error;
  }
  return "";
}

export function translateProcessingErrorMessage(message: string) {
  const normalized = message.trim();
  if (normalized.startsWith("GF6_OUTPUT_LIMIT_EXCEEDED:")) {
    return "GF-6 输出网格超出服务端安全上限：请增大输出分辨率、缩小 ROI、减少波段或关闭部分衍生产物";
  }
  return KNOWN_PROCESSING_ERROR_MESSAGES[normalized] || message;
}

export function selectPreflightCandidate(
  candidates: PreflightCandidate[],
  template: ProductTemplate
) {
  const supported = candidates.filter(
    item => item.supportStatus === "SUPPORTED"
  );
  const exactMatches = supported.filter(
    item =>
      item.profileKey?.productCode === template.productCode &&
      item.profileKey?.profileVersion === template.profileVersion
  );

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new Error(`预检返回多个 ${template.label} 配置候选，请联系管理员`);
  }
  throw new Error(
    `当前处理服务不支持 ${template.label}（需要 ${template.productCode} / ${template.profileVersion} 配置）`
  );
}

export function buildPreflightAssets(
  template: ProductTemplate,
  slots: Readonly<
    Partial<Record<SlotId, { file?: File; sysFileId?: string | number }>>
  >
): ProcessingAssetRequest[] {
  return template.slots
    .filter(slot => slot.required || slots[slot.id]?.file)
    .map(slot => {
      const fileId = slots[slot.id]?.sysFileId;
      if (fileId === undefined) throw new Error(`${slot.label}尚未上传完成`);
      return {
        sourceType: "SYS_FILE",
        sourceId: fileId,
        role: slot.role,
        ordinal: slot.ordinal ?? 0,
        required: slot.required
      };
    });
}

export function isRetryableStageStatus(status: string) {
  return status === "FAILED" || status === "RECOVERY_PENDING";
}

export function serializeParameterSnapshot(snapshot: Readonly<object>) {
  return JSON.stringify(snapshot);
}

export function authorizeArtifactDownload(
  artifacts: readonly ExecutionProgressArtifact[],
  requested: ExecutionProgressArtifact
) {
  const current = artifacts.find(
    item =>
      String(item.stageId) === String(requested.stageId) &&
      item.type === requested.type &&
      item.uri === requested.uri
  );
  if (!current || current.downloadable !== true) {
    throw new Error("该产物未获服务端下载授权");
  }
  return current;
}

export function resultZipFileName(template: ProductTemplate) {
  if (template.id === GF6_WFV_BROWSE_TEMPLATE.id) return "gf6-wfv-result.zip";
  return `${template.id.replace(/-v\d+$/, "")}-result.zip`;
}

function safeUriFileName(uri: string) {
  const withoutQuery = uri.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const encodedName = withoutQuery.split("/").pop() || "";
  let decodedName = encodedName;
  try {
    decodedName = decodeURIComponent(encodedName);
  } catch {
    // Keep the encoded URI component; it is sanitized below.
  }
  const safeName = decodedName
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180);
  return /\.[A-Za-z0-9]{1,10}$/.test(safeName) ? safeName : "";
}

export function artifactDownloadFileName(artifact: ExecutionProgressArtifact) {
  const uriName = safeUriFileName(artifact.uri);
  if (uriName) return uriName;
  const safeType = artifact.type
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeType || "artifact"}.bin`;
}
