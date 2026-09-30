import test from "node:test";
import assert from "node:assert/strict";
import {
  artifactAccessReason,
  artifactActionsEnabled,
  historyActions
} from "./taskHistory";

test("recycle-bin artifacts are disabled with a recoverable reason", () => {
  assert.equal(artifactActionsEnabled("RECYCLE_BIN"), false);
  assert.match(artifactAccessReason("RECYCLE_BIN"), /回收站/);
  assert.deepEqual(historyActions("RECYCLE_BIN"), {
    canDownload: false,
    canPreview: false,
    canPin: false,
    canRecycle: false,
    canRestore: true,
    canPurge: true,
    reason: "产物已移入回收站，可在保留期内恢复。"
  });
});

test("purged, missing, and purge-failed artifacts expose distinct user actions", () => {
  assert.equal(artifactActionsEnabled("PURGED"), false);
  assert.match(artifactAccessReason("PURGED"), /永久删除/);
  assert.match(artifactAccessReason("MISSING"), /存储文件/);
  assert.deepEqual(historyActions("PURGE_FAILED"), {
    canDownload: false,
    canPreview: false,
    canPin: false,
    canRecycle: false,
    canRestore: false,
    canPurge: true,
    reason: "产物清理未完成，可重试永久删除。"
  });
});

test("available and pinned artifacts remain accessible with their allowed retention actions", () => {
  assert.equal(artifactActionsEnabled("AVAILABLE"), true);
  assert.equal(artifactActionsEnabled("PINNED"), true);
  assert.deepEqual(historyActions("AVAILABLE"), {
    canDownload: true,
    canPreview: true,
    canPin: true,
    canRecycle: true,
    canRestore: false,
    canPurge: false,
    reason: undefined
  });
  assert.deepEqual(historyActions("PINNED"), {
    canDownload: true,
    canPreview: true,
    canPin: false,
    canRecycle: true,
    canRestore: false,
    canPurge: false,
    reason: undefined
  });
});
