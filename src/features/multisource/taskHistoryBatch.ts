import type {
  TaskArtifactRetentionStatus,
  TaskHistoryItem,
  TaskInputRetentionStatus
} from "@/api/multiSourceSatellite";

export type BatchRetentionOperation =
  | "SET_EXPIRY"
  | "PURGE"
  | "PURGE_ARTIFACT"
  | "RECYCLE"
  | "RECYCLE_SOURCE"
  | "RESTORE";

export interface BatchEligibilityResult {
  eligible: TaskHistoryItem[];
  ineligible: TaskHistoryItem[];
}

export function clampHistoryPage(
  page: number,
  total: number,
  pageSize: number
) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function effectiveInputRetentionStatus(
  status: TaskInputRetentionStatus,
  sourceInputCount?: number
): TaskInputRetentionStatus {
  return status === "AVAILABLE" && sourceInputCount === 0 ? "PURGED" : status;
}

export function canBatchSourceOperation(
  status: TaskInputRetentionStatus,
  operation: BatchRetentionOperation
) {
  if (operation === "RECYCLE_SOURCE")
    return ["AVAILABLE", "SCHEDULED"].includes(status);
  if (operation === "RESTORE") return status === "RECYCLE_BIN";
  if (operation === "PURGE")
    return ["RECYCLE_BIN", "PURGE_FAILED"].includes(status);
  if (operation !== "SET_EXPIRY") return false;
  return ["AVAILABLE", "SCHEDULED", "PURGE_FAILED"].includes(status);
}

export function canBatchArtifactOperation(
  status: TaskArtifactRetentionStatus,
  operation: BatchRetentionOperation
) {
  if (operation === "RECYCLE")
    return status === "AVAILABLE" || status === "PINNED";
  if (operation === "PURGE_ARTIFACT") {
    return status === "RECYCLE_BIN" || status === "PURGE_FAILED";
  }
  return false;
}

export function preflightBatchOperation(
  items: TaskHistoryItem[],
  operation: BatchRetentionOperation
): BatchEligibilityResult {
  const eligible: TaskHistoryItem[] = [];
  const ineligible: TaskHistoryItem[] = [];
  for (const item of items) {
    const allowed =
      operation === "RECYCLE" || operation === "PURGE_ARTIFACT"
        ? canBatchArtifactOperation(item.retentionStatus, operation)
        : canBatchSourceOperation(item.sourceRetentionStatus, operation);
    (allowed ? eligible : ineligible).push(item);
  }
  return { eligible, ineligible };
}
