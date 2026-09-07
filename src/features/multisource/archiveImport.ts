export const ARCHIVE_CHUNK_SIZE = 32 * 1024 * 1024;
export const ARCHIVE_MAX_SIZE = 20 * 1024 * 1024 * 1024;
/** Temporary rollout switch: validate the server parser before enabling browser fallback. */
export const ARCHIVE_SERVER_ONLY = true;

export type ArchiveImportStatus =
  | "IDLE"
  | "UPLOADING"
  | "MERGING"
  | "PARSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export interface ArchiveImportProgress {
  status: ArchiveImportStatus;
  uploadedChunks: number;
  totalChunks: number;
  processedFiles: number;
  totalFiles?: number;
  currentFile?: string;
  error?: string;
}

export function isArchiveServerUnavailable(error: unknown) {
  const candidate = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  } | null;
  const status = candidate?.response?.status;
  if (status === 404 || status === 405 || status === 501) return true;
  if (candidate?.code === "ERR_NETWORK" || candidate?.code === "ECONNABORTED") {
    return true;
  }
  return candidate?.message === "Network Error";
}

export function getArchiveChunkCount(
  fileSize: number,
  chunkSize = ARCHIVE_CHUNK_SIZE
) {
  if (!Number.isFinite(fileSize) || fileSize < 0) {
    throw new Error("ZIP 文件大小无效");
  }
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error("分片大小无效");
  }
  return Math.max(1, Math.ceil(fileSize / chunkSize));
}

export function getArchiveChunkRange(
  fileSize: number,
  chunkIndex: number,
  chunkSize = ARCHIVE_CHUNK_SIZE
) {
  const totalChunks = getArchiveChunkCount(fileSize, chunkSize);
  if (
    !Number.isInteger(chunkIndex) ||
    chunkIndex < 0 ||
    chunkIndex >= totalChunks
  ) {
    throw new Error("分片序号无效");
  }
  const start = chunkIndex * chunkSize;
  return { start, end: Math.min(fileSize, start + chunkSize), totalChunks };
}

export function assertArchiveSize(
  fileSize: number,
  maxSize = ARCHIVE_MAX_SIZE
) {
  if (fileSize > maxSize) {
    throw new Error(`ZIP 压缩包不能超过 ${Math.round(maxSize / 1024 ** 3)} GB`);
  }
}

export function archiveStatusLabel(status: ArchiveImportStatus) {
  const labels: Record<ArchiveImportStatus, string> = {
    IDLE: "等待导入",
    UPLOADING: "正在上传 ZIP",
    MERGING: "正在合并分片",
    PARSING: "正在解析产品包",
    COMPLETED: "解析完成",
    FAILED: "解析失败",
    CANCELED: "已取消"
  };
  return labels[status];
}
