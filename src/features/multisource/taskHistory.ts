import type { TaskArtifactRetentionStatus } from "@/api/multiSourceSatellite";

export interface HistoryArtifactActions {
  canDownload: boolean;
  canPreview: boolean;
  canPin: boolean;
  canRecycle: boolean;
  canRestore: boolean;
  canPurge: boolean;
  reason?: string;
}

const ACCESS_REASONS: Record<
  Exclude<TaskArtifactRetentionStatus, "AVAILABLE" | "PINNED">,
  string
> = {
  RECYCLE_BIN: "产物已移入回收站，可在保留期内恢复。",
  PURGING: "产物正在物理清理，暂不可查看或下载。",
  PURGE_FAILED: "产物清理未完成，可重试永久删除。",
  PURGED: "产物已永久删除，仅保留任务记录。",
  MISSING: "产物元数据仍在，但存储文件已不存在。"
};

export function artifactActionsEnabled(status: TaskArtifactRetentionStatus) {
  return status === "AVAILABLE" || status === "PINNED";
}

export function artifactAccessReason(status: TaskArtifactRetentionStatus) {
  return artifactActionsEnabled(status) ? "" : ACCESS_REASONS[status];
}

export function historyActions(
  status: TaskArtifactRetentionStatus
): HistoryArtifactActions {
  const accessible = artifactActionsEnabled(status);
  if (status === "RECYCLE_BIN") {
    return {
      canDownload: false,
      canPreview: false,
      canPin: false,
      canRecycle: false,
      canRestore: true,
      canPurge: true,
      reason: ACCESS_REASONS.RECYCLE_BIN
    };
  }
  if (status === "PURGE_FAILED") {
    return {
      canDownload: false,
      canPreview: false,
      canPin: false,
      canRecycle: false,
      canRestore: false,
      canPurge: true,
      reason: ACCESS_REASONS.PURGE_FAILED
    };
  }
  return {
    canDownload: accessible,
    canPreview: accessible,
    canPin: status === "AVAILABLE",
    canRecycle: accessible,
    canRestore: false,
    canPurge: false,
    reason: accessible ? undefined : ACCESS_REASONS[status]
  };
}
