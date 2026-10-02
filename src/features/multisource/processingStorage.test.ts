import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const homeRoutes = readFileSync("src/router/modules/home.ts", "utf8");
const router = readFileSync("src/router/index.ts", "utf8");
const storagePagePath = "src/views/processingStorage/index.vue";
const summaryCardsPath =
  "src/components/ProcessingStorage/StorageSummaryCards.vue";
const policyFormPath = "src/components/ProcessingStorage/StoragePolicyForm.vue";

function source(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

test("processing storage route is registered for administrators", () => {
  assert.match(homeRoutes, /path:\s*"\/processing-storage"/);
  assert.match(homeRoutes, /name:\s*"ProcessingStorage"/);
  assert.match(homeRoutes, /roles:\s*\["admin"\]/);
  assert.match(homeRoutes, /views\/processingStorage\/index\.vue/);
  assert.match(router, /hasRequiredRoles/);
  assert.match(router, /path:\s*"\/error\/403"/);
});

test("processing storage console shows independently measured storage categories", () => {
  const cards = source(summaryCardsPath);
  assert.equal(existsSync(summaryCardsPath), true);
  for (const label of [
    "原始输入",
    "任务产物",
    "Worker 目录",
    "ZIP / 孤立上传",
    "可回收空间",
    "清理失败"
  ]) {
    assert.match(cards, new RegExp(label));
  }
});

test("processing storage policy uses retention defaults and protects orphan uploads", () => {
  const form = source(policyFormPath);
  assert.equal(existsSync(policyFormPath), true);
  assert.match(form, /inputRetentionDays:\s*14/);
  assert.match(form, /workerDirectoryTtlHours:\s*48/);
  assert.match(form, /orphanUploadTtlHours:\s*24/);
  assert.match(form, /min:\s*24/);
  assert.match(form, /已有历史记录不会自动纳入清理范围/);
});

test("processing storage console keeps source inputs and task artifacts distinct", () => {
  const page = source(storagePagePath);
  assert.equal(existsSync(storagePagePath), true);
  assert.match(page, /原始输入/);
  assert.match(page, /任务产物/);
  assert.match(page, /getProcessingStorageSummary/);
  assert.match(page, /getProcessingStoragePolicy/);
  assert.match(page, /updateProcessingStoragePolicy/);
  assert.match(page, /isPolicyConflict/);
  assert.match(page, /已加载最新版本/);
});
