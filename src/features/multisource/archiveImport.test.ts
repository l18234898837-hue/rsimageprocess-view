import test from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVE_CHUNK_SIZE,
  ARCHIVE_MAX_SIZE,
  ARCHIVE_SERVER_ONLY,
  archiveProductMismatch,
  archiveStatusLabel,
  assertArchiveSize,
  getArchiveChunkCount,
  getArchiveChunkRange,
  getArchiveUploadErrorMessage,
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

test("prefers backend archive error details and explains bare 409 responses", () => {
  assert.equal(
    getArchiveUploadErrorMessage({
      response: {
        status: 409,
        data: { msg: "服务器临时空间不足，请清理历史上传或稍后重试" }
      }
    }),
    "服务器临时空间不足，请清理历史上传或稍后重试"
  );
  assert.equal(
    getArchiveUploadErrorMessage({ response: { status: 409, data: {} } }),
    "ZIP 上传被服务器拒绝，请检查服务器临时空间后重试"
  );
});

test("rejects an obvious product mismatch before uploading the archive", () => {
  assert.match(
    archiveProductMismatch(
      "GF6_WFV_E107.6_N9.0_20260716_L1A1420724603.zip",
      "hy1c-czi-l2a-v1"
    ) ?? "",
    /当前选择的是 HY-1C.*GF-6/
  );
  assert.equal(
    archiveProductMismatch("HY1C_CZI_L2A.zip", "hy1c-czi-l2a-v1"),
    undefined
  );
  assert.match(
    archiveProductMismatch(
      "FY3H_MERSI_L1_1000M_GEO1K.HDF.zip",
      "gf6-wfv-l1a-v1"
    ) ?? "",
    /当前选择的是 GF-6 WFV.*FY-3H MERSI/
  );
  assert.match(
    archiveProductMismatch(
      "HY2D_IDR_2MC_2026.tar.gz",
      "fy3h-mersi-l1-1000m-geo1k-v1"
    ) ?? "",
    /当前选择的是 FY-3H MERSI.*HY-2D/
  );
});
