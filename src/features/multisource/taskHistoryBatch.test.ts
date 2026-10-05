import test from "node:test";
import assert from "node:assert/strict";
import {
  clampHistoryPage,
  effectiveInputRetentionStatus,
  preflightBatchOperation
} from "./taskHistoryBatch";
import type { TaskHistoryItem } from "@/api/multiSourceSatellite";

function item(
  id: string,
  sourceRetentionStatus: TaskHistoryItem["sourceRetentionStatus"],
  retentionStatus: TaskHistoryItem["retentionStatus"]
): TaskHistoryItem {
  return {
    taskId: id,
    taskNo: id,
    taskName: id,
    productCodes: [],
    completedAt: "2026-10-03T00:00:00Z",
    lifecycleStatus: "SUCCEEDED",
    artifactCount: 1,
    artifactSizeBytes: 10,
    retentionStatus,
    sourceRetentionStatus
  };
}

test("history page clamps to the new total and resets empty results", () => {
  assert.equal(clampHistoryPage(6, 31, 10), 4);
  assert.equal(clampHistoryPage(6, 0, 10), 1);
});

test("zero source files are displayed as cleaned", () => {
  assert.equal(effectiveInputRetentionStatus("AVAILABLE", 0), "PURGED");
  assert.equal(effectiveInputRetentionStatus("AVAILABLE", 2), "AVAILABLE");
});

test("batch preflight separates source recycling and purged artifacts", () => {
  const rows = [
    item("source-ok", "AVAILABLE", "AVAILABLE"),
    item("source-cleaned", "PURGED", "AVAILABLE"),
    item("artifact-purged", "AVAILABLE", "PURGED")
  ];
  assert.deepEqual(
    preflightBatchOperation(rows, "RECYCLE_SOURCE").ineligible.map(
      row => row.taskId
    ),
    ["source-cleaned"]
  );
  assert.deepEqual(
    preflightBatchOperation(rows, "RECYCLE").ineligible.map(row => row.taskId),
    ["artifact-purged"]
  );
});

test("batch permanent source deletion only accepts recycle-bin sources", () => {
  const rows = [
    item("source-in-recycle-bin", "RECYCLE_BIN", "AVAILABLE"),
    item("source-available", "AVAILABLE", "AVAILABLE"),
    item("source-cleaned", "PURGED", "AVAILABLE")
  ];

  assert.deepEqual(
    preflightBatchOperation(rows, "PURGE").eligible.map(row => row.taskId),
    ["source-in-recycle-bin"]
  );
});

test("batch permanent artifact deletion only accepts recycle-bin artifacts", () => {
  const rows = [
    item("artifact-in-recycle-bin", "PURGED", "RECYCLE_BIN"),
    item("artifact-available", "PURGED", "AVAILABLE"),
    item("artifact-purged", "PURGED", "PURGED")
  ];

  assert.deepEqual(
    preflightBatchOperation(rows, "PURGE_ARTIFACT").eligible.map(
      row => row.taskId
    ),
    ["artifact-in-recycle-bin"]
  );
});
