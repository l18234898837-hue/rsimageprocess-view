import { http } from "@/utils/http";
import type { Result } from "@/api/api";
import type {
  ProductFileRole,
  SlotId
} from "@/features/multisource/productTemplates";

export interface UploadStaticFileResponse {
  id: string | number;
}

export interface ProcessingAssetRequest {
  sourceType: "SYS_FILE";
  sourceId: string | number;
  role: ProductFileRole;
  ordinal: 0;
  required: true;
}

export interface PreflightRequest {
  assets: ProcessingAssetRequest[];
}

export interface PreflightCandidate {
  id: string;
  packageId: string;
  supportStatus: string;
  confidence: number;
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

export interface TaskIdResponse {
  taskId: number;
}

export interface StartProcessingTaskResponse {
  newlySubmitted: boolean;
}

export type ProcessingLifecycleStatus =
  | "CREATED"
  | "RUNNING"
  | "RECOVERY_PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export interface ExecutionProgressStage {
  stageId: number;
  stageKey: string;
  status: string;
  attempt: number;
}

export interface ExecutionProgressArtifact {
  stageId: number;
  type: string;
  uri: string;
  checksum: string;
}

export interface ExecutionProgressResponse {
  taskId: number;
  lifecycleStatus: ProcessingLifecycleStatus;
  qualityStatus: string;
  stages: ExecutionProgressStage[];
  artifacts: ExecutionProgressArtifact[];
}

export const uploadStaticFile = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return http.request<Result<UploadStaticFileResponse>>(
    "post",
    "/system/file/uploadStatic",
    {
      data: form
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

export const startProcessingTask = (taskId: number) =>
  http.request<Result<StartProcessingTaskResponse>>(
    "post",
    `/api/multisource/processing-tasks/${taskId}/start`
  );

export const getProcessingProgress = (taskId: number) =>
  http.request<Result<ExecutionProgressResponse>>(
    "get",
    `/api/multisource/processing-tasks/${taskId}/progress`
  );

export const cancelProcessingTask = (taskId: number) =>
  http.request<Result<void>>(
    "post",
    `/api/multisource/processing-tasks/${taskId}/cancel`
  );

export const retryProcessingStage = (stageId: number) =>
  http.request<Result<void>>(
    "post",
    `/api/multisource/processing-stages/${stageId}/retry`
  );

export const downloadProcessingResult = (taskId: number) =>
  http.request<Blob>(
    "get",
    `/api/multisource/processing-tasks/${taskId}/result.zip`,
    {
      responseType: "blob"
    }
  );

export type ProcessingSlotFiles = Partial<Record<SlotId, File>>;
