import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dialog = readFileSync(
  "src/components/LeftPanel/TaskProgressDialog.vue",
  "utf8"
);
const processPanel = readFileSync(
  "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
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

test("stage artifact actions are grouped behind an expandable stage control", () => {
  assert.match(dialog, /expandedArtifactStageIds/);
  assert.match(dialog, /@click="toggleStageArtifacts\(view\)"/);
  assert.match(
    dialog,
    /<span>产物 \{\{ view\.artifacts\.length \}\} 个<\/span>/
  );
  assert.match(dialog, /v-if="isStageArtifactsExpanded\(view\)"/);
  assert.match(dialog, /v-for="artifact in view\.artifacts"/);
  assert.match(dialog, /canPreviewArtifact\(artifact\)/);
  assert.match(dialog, /@click="openArtifact\(artifact\)"/);
  assert.match(dialog, /artifact\.downloadable === false/);
  assert.match(dialog, /@click="downloadArtifact\(artifact\)"/);
  assert.match(dialog, /emit\("download-artifact", artifact\)/);
});

test("JSON artifact previews provide a business summary and a raw JSON fallback", () => {
  assert.match(processPanel, /name="summary" label="结果摘要"/);
  assert.match(processPanel, /name="raw" label="原始 JSON"/);
  assert.match(processPanel, /artifactPreviewSummary/);
  assert.match(processPanel, /buildJsonArtifactSummary/);
  assert.doesNotMatch(processPanel, /v-html/);
});

test("task progress dialog exposes map viewing only for map-ready artifacts", () => {
  assert.match(dialog, /在地图中查看/);
  assert.match(dialog, /isMapArtifact\(artifact\)/);
  assert.match(dialog, /isMapPreviewable/);
  assert.match(dialog, /emit\("show-artifact-on-map", artifact\)/);
  assert.match(processPanel, /@show-artifact-on-map="showArtifactOnMap"/);
});

test("task progress dialog keeps execution details and artifacts within each stage", () => {
  assert.match(dialog, /<el-collapse v-model="expandedSections"/);
  assert.match(dialog, /name="execution"/);
  assert.match(dialog, /执行详情/);
  assert.match(dialog, /task-progress-dialog__stage-expanded/);
  assert.match(dialog, /task-progress-dialog__artifact-list/);
  assert.doesNotMatch(dialog, /artifactRetentionFilter/);
  assert.doesNotMatch(dialog, /name="artifacts"/);
});

test("artifact rows use the capability contract for view state and retain direct downloads", () => {
  assert.match(dialog, /resolveArtifactView/);
  assert.match(dialog, /artifactView\(artifact\)\.reason/);
  assert.match(dialog, /查看/);
  assert.match(dialog, /下载/);
  assert.match(dialog, /@click="openArtifact\(artifact\)"/);
  assert.match(dialog, /@click="downloadArtifact\(artifact\)"/);
  assert.match(dialog, /下载全部产物 ZIP/);
});
