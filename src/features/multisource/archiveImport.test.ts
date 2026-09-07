import test from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVE_CHUNK_SIZE,
  ARCHIVE_MAX_SIZE,
  ARCHIVE_SERVER_ONLY,
  archiveStatusLabel,
  assertArchiveSize,
  getArchiveChunkCount,
  getArchiveChunkRange,
  isArchiveServerUnavailable
} from "./archiveImport";

test("calculates archive chunk count and final chunk size", () => {
  const size = ARCHIVE_CHUNK_SIZE * 2 + 10;
  assert.equal(getArchiveChunkCount(size), 3);
  assert.deepEqual(getArchiveChunkRange(size, 2), {
    start: ARCHIVE_CHUNK_SIZE * 2,
    end: size,
    totalChunks: 3
  });
});

test("allows archives up to 20 GB and rejects larger files", () => {
  assert.doesNotThrow(() => assertArchiveSize(ARCHIVE_MAX_SIZE));
  assert.throws(() => assertArchiveSize(ARCHIVE_MAX_SIZE + 1), /20 GB/);
});

test("keeps archive import in server-only mode during rollout", () => {
  assert.equal(ARCHIVE_SERVER_ONLY, true);
});

test("maps import statuses to user-facing labels", () => {
  assert.equal(archiveStatusLabel("PARSING"), "正在解析产品包");
  assert.equal(archiveStatusLabel("CANCELED"), "已取消");
});

test("recognizes unavailable archive endpoints without hiding server failures", () => {
  assert.equal(isArchiveServerUnavailable({ response: { status: 404 } }), true);
  assert.equal(isArchiveServerUnavailable({ code: "ERR_NETWORK" }), true);
  assert.equal(
    isArchiveServerUnavailable({ response: { status: 422 } }),
    false
  );
});
