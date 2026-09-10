import { http } from "@/utils/http";
import type { Result } from "@/api/api";

export interface CreateArchiveUploadRequest {
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  templateId: string;
}

export interface CreateArchiveUploadResponse {
  uploadId: string;
}

export interface ArchiveUploadStatusResponse {
  uploadId: string;
  status:
    | "UPLOADING"
    | "MERGING"
    | "PARSING"
    | "MATCHING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELED";
  uploadedChunks: number;
  totalChunks: number;
  processedFiles: number;
  totalFiles?: number;
  currentFile?: string;
  matchedFiles?: Array<{
    slotId: string;
    fileName: string;
    sysFileId: string | number;
    /** Optional inline content supplied by parsers that expose metadata. */
    content?: string;
  }>;
  matchedSlots?: string[];
  missingSlots?: string[];
  error?: string;
}

const basePath = "/api/multisource/archive-upload";

export const createArchiveUpload = (data: CreateArchiveUploadRequest) =>
  http.request<Result<CreateArchiveUploadResponse>>(
    "post",
    `${basePath}/sessions`,
    { data, timeout: 0 },
    { silentError: true }
  );

export const uploadArchiveChunk = (
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  onProgress?: (percentage: number) => void
) =>
  http.request<Result<void>>(
    "put",
    `${basePath}/sessions/${encodeURIComponent(uploadId)}/chunks/${chunkIndex}`,
    {
      data: chunk,
      timeout: 0,
      headers: { "Content-Type": "application/octet-stream" },
      onUploadProgress: event => {
        if (event.total)
          onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    },
    { silentError: true }
  );

export const completeArchiveUpload = (uploadId: string) =>
  http.request<Result<void>>(
    "post",
    `${basePath}/sessions/${encodeURIComponent(uploadId)}/complete`,
    { timeout: 0 },
    { silentError: true }
  );

export const getArchiveUploadStatus = (uploadId: string) =>
  http.request<Result<ArchiveUploadStatusResponse>>(
    "get",
    `${basePath}/sessions/${encodeURIComponent(uploadId)}/status`,
    undefined,
    { silentError: true }
  );

export const cancelArchiveUpload = (uploadId: string) =>
  http.request<Result<void>>(
    "post",
    `${basePath}/sessions/${encodeURIComponent(uploadId)}/cancel`,
    undefined,
    { silentError: true }
  );
