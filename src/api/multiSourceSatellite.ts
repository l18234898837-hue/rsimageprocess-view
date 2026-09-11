import { http } from "@/utils/http";
import { startBrowserDownload } from "@/utils/browserDownload";
import type { Result } from "@/api/api";
import type {
  ProductFileRole,
  SlotId
} from "@/features/multisource/productTemplates";

export interface UploadStaticFileResponse {
  id: string | number;
}

export type UploadProgressHandler = (percentage: number) => void;

export interface ProcessingAssetRequest {
  sourceType: "SYS_FILE";
  sourceId: string | number;
  role: ProductFileRole;
  ordinal: number;
  required: boolean;
}

export interface PreflightRequest {
  assets: ProcessingAssetRequest[];
}

export interface PreflightCandidate {
  id: string;
  packageId: string;
  supportStatus: string;
  confidence: number;
  profileKey?: ProcessingProfileKey;
}

export interface ProcessingProfileKey {
  productCode: string;
  profileVersion: string;
}

export interface ResultDownloadTicketResponse {
  ticket: string;
  expiresAt: string;
}

export interface PreflightResponse {
  rulePackageVersion: string;
  preflightToken: string;
  expiresAt: string;
  candidates: PreflightCandidate[];
}

export interface CreateProcessingTaskRequest {
  name: string;
  preflightToken: string;
  candidateId: string;
  parameterSnapshot: string;
}

// The backend serializes Java long values outside Number.MAX_SAFE_INTEGER as
// strings. Keep both forms because small IDs remain JSON numbers.
export type ProcessingIdentifier = string | number;

export interface TaskIdResponse {
  taskId: ProcessingIdentifier;
}

export interface DispatchProcessingStageResponse {
  dispatched: boolean;
  stageId: ProcessingIdentifier | null;
}

export type ProcessingLifecycleStatus =
  | "CREATED"
  | "RUNNING"
  | "RECOVERY_PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export interface ExecutionProgressStage {
  stageId: ProcessingIdentifier;
  stageKey: string;
  stageCode?: string;
  status: string;
  attempt: number;
  executionId?: string | number;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  description?: string;
  declaredOutputs?: string[];
}

export interface ExecutionProgressArtifact {
  stageId: ProcessingIdentifier;
  type: string;
  uri: string;
  checksum: string;
  sizeBytes?: number;
  retention?: "INTERMEDIATE" | "FINAL" | string;
  downloadable?: boolean;
  mediaType?: string;
  previewable?: boolean;
  displayName?: string;
  visualization?: ArtifactVisualization;
  format?: string;
  view?: ArtifactViewCapability;
}

export type ArtifactViewMode =
  | "map"
  | "image"
  | "json"
  | "table"
  | "dataset"
  | "text"
  | "disabled";

export interface ArtifactViewCapability {
  enabled: boolean;
  mode: ArtifactViewMode;
  reason?: string | null;
  inspectionUrl?: string;
}

export interface ArtifactVisualization {
  kind: "tiles" | "geojson" | "bounds";
  tileUrl?: string;
  bounds?: [number, number, number, number];
  crs?: string;
  minZoom?: number;
  maxZoom?: number;
  legend?: unknown;
}

export interface ExecutionProgressResponse {
  taskId: ProcessingIdentifier;
  lifecycleStatus: ProcessingLifecycleStatus;
  qualityStatus: string;
  stages: ExecutionProgressStage[];
  artifacts: ExecutionProgressArtifact[];
}

export const uploadStaticFile = (
  file: File,
  onProgress?: UploadProgressHandler
) => {
  const form = new FormData();
  form.append("file", file);
  return http.request<Result<UploadStaticFileResponse>>(
    "post",
    "/system/file/uploadStatic",
    {
      data: form,
      // HY-1C L2A HDF5 files can be several gigabytes; do not apply the
      // short global request timeout to an active file upload.
      timeout: 0,
      onUploadProgress: event => {
        if (!event.total) return;
        onProgress?.(
          Math.min(100, Math.round((event.loaded / event.total) * 100))
        );
      }
    }
  );
};

export const preflightProcessingTask = (data: PreflightRequest) =>
  http.request<Result<PreflightResponse>>(
    "post",
    "/api/multisource/processing-tasks/preflight",
    {
      data
    }
  );

export const createProcessingTask = (data: CreateProcessingTaskRequest) =>
  http.request<Result<TaskIdResponse>>(
    "post",
    "/api/multisource/processing-tasks",
    { data }
  );

export const dispatchProcessingTask = (taskId: ProcessingIdentifier) =>
  http.request<Result<DispatchProcessingStageResponse>>(
    "post",
    `/api/multisource/processing-tasks/${taskId}/dispatch`,
    {
      // A full-swath L2A grid can legitimately run for several minutes.
      timeout: 0
    }
  );

export const getProcessingProgress = (taskId: ProcessingIdentifier) =>
  http.request<Result<ExecutionProgressResponse>>(
    "get",
    `/api/multisource/processing-tasks/${taskId}/progress`
  );

export const cancelProcessingTask = (taskId: ProcessingIdentifier) =>
  http.request<Result<void>>(
    "post",
    `/api/multisource/processing-tasks/${taskId}/cancel`
  );

export const retryProcessingStage = (stageId: ProcessingIdentifier) =>
  http.request<Result<void>>(
    "post",
    `/api/multisource/processing-stages/${stageId}/retry`
  );

export const downloadProcessingResult = async (
  taskId: ProcessingIdentifier,
  fileName: string
) => {
  const response = await http.request<Result<ResultDownloadTicketResponse>>(
    "post",
    `/api/multisource/processing-tasks/${taskId}/result-download-ticket`,
    { data: { fileName } }
  );
  const ticket = response.data?.ticket;
  if (!ticket) throw new Error("后端未返回下载凭证");
  startBrowserDownload(
    `/api/multisource/processing-tasks/${taskId}/result.zip?ticket=${encodeURIComponent(ticket)}`
  );
  return true;
};

export const downloadProcessingArtifact = (
  taskId: ProcessingIdentifier,
  type: string
) =>
  http.request<Blob>(
    "get",
    `/api/multisource/processing-tasks/${taskId}/artifacts/${encodeURIComponent(type)}/download`,
    {
      responseType: "blob"
    }
  );

export type ProcessingSlotFiles = Partial<Record<SlotId, File>>;
