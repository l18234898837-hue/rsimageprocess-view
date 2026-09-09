import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dialog = readFileSync(
  "src/components/LeftPanel/TaskProgressDialog.vue",
  "utf8"
);

test("task progress dialog renders shared runtime states and actions", () => {
  assert.match(dialog, /<el-dialog/);
  assert.match(dialog, /v-model="visible"/);
  assert.match(dialog, /任务进度/);
  assert.match(dialog, /任务尚未启动/);
  assert.match(dialog, /runtimeStageViews/);
  assert.match(dialog, /role="progressbar"/);
  assert.match(dialog, /aria-live="polite"/);
  for (const label of [
    "等待执行",
    "正在执行",
    "已完成",
    "执行失败",
    "需要重新执行"
  ]) {
    assert.match(dialog, new RegExp(label));
  }
  for (const eventName of [
    "update:modelValue",
    "toggle-artifacts",
    "preview-artifact",
    "download-artifact",
    "retry-stage",
    "cancel",
    "download-result",
    "reset"
  ]) {
    assert.match(
      dialog,
      new RegExp(eventName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"))
    );
  }
  assert.match(dialog, /查看|下载/);
  assert.doesNotMatch(dialog, /getProcessingProgress|setInterval|setTimeout/);
});
