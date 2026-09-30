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
  assert.match(dialog, /<Teleport to="body">/);
  assert.match(dialog, /class="task-progress-dialog__panel"/);
  assert.match(dialog, /v-show="visible"/);
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
  assert.match(dialog, /@click="handleStageClick\(\$event, view\)"/);
  assert.match(
    dialog,
    /@keydown\.enter\.prevent="toggleStageArtifacts\(view\)"/
  );
  assert.match(
    dialog,
    /:aria-expanded=\s*"\s*view\.stage \? isStageArtifactsExpanded\(view\)/
  );
  assert.match(dialog, /v-if="isStageArtifactsExpanded\(view\)"/);
  assert.match(dialog, /v-for="artifact in view\.artifacts"/);
  assert.match(dialog, /canPreviewArtifact\(artifact\)/);
  assert.match(dialog, /@click="openArtifact\(artifact\)"/);
  assert.match(dialog, /artifact\.downloadable === false/);
  assert.match(dialog, /@click="downloadArtifact\(artifact\)"/);
  assert.match(dialog, /emit\("download-artifact", artifact\)/);
  assert.match(dialog, /artifactDescription\(artifact\)/);
  assert.doesNotMatch(dialog, /stageDetailHint/);
});

test("completed stages stay collapsed until the user expands their artifacts", () => {
  assert.doesNotMatch(processPanel, /watch\(newlyCompletedStageIds/);
});

test("topic stages have a distinct waiting appearance", () => {
  assert.match(dialog, /is-topic\.is-waiting/);
});

test("JSON artifact previews provide detailed fields and a raw JSON fallback", () => {
  assert.match(processPanel, /name="fields" label="详细字段"/);
  assert.match(processPanel, /name="raw" label="原始 JSON"/);
  assert.match(processPanel, /artifactPreviewFieldTree/);
  assert.match(processPanel, /buildJsonArtifactFieldTree/);
  assert.doesNotMatch(processPanel, /name="summary" label="结果摘要"/);
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
  assert.match(dialog, /<el-collapse\s+v-model="expandedSections"/);
  assert.match(dialog, /name="execution"/);
  assert.match(dialog, /执行详情/);
  assert.match(dialog, /task-progress-dialog__stage-expanded/);
  assert.match(dialog, /task-progress-dialog__artifact-list/);
  assert.doesNotMatch(dialog, /task-progress-dialog__stage-artifacts-toggle/);
  assert.doesNotMatch(dialog, /处理说明/);
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

test("artifact rows provide a plain-language result interpretation beside viewing and downloading", () => {
  assert.match(dialog, /结果解读/);
  assert.match(
    dialog,
    /artifactInterpretation\(selectedInterpretationArtifact\)/
  );
  assert.match(dialog, /结果说明/);
  assert.match(dialog, /openArtifactInterpretation\(artifact\)/);
  assert.match(dialog, /result-interpretation-panel/);
  assert.match(dialog, /怎么看/);
  assert.match(dialog, /使用提示/);
});

test("task progress is an interactive non-modal floating panel", () => {
  assert.match(dialog, /task-progress-dialog__panel/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="false"/);
  assert.match(dialog, /@pointerdown="startPanelDrag"/);
  assert.match(dialog, /resize: both/);
  assert.match(dialog, /centerTaskProgressPanel/);
  assert.match(dialog, /window\.innerHeight/);
  assert.match(dialog, /getBoundingClientRect\(\)/);
  assert.match(dialog, /pointercancel/);
  assert.match(dialog, /<Teleport to="body">/);
  assert.doesNotMatch(dialog, /<el-dialog/);
});

test("floating result windows promote the clicked panel and center task progress from its title bar", () => {
  assert.match(dialog, /useFloatingPanelStack/);
  assert.match(processPanel, /useFloatingPanelStack/);
  assert.match(dialog, /@pointerdown\.capture="activateTaskProgress"/);
  assert.match(dialog, /@pointerdown\.capture="activateInterpretation"/);
  assert.match(processPanel, /:style="artifactPreviewPanelStyle"/);
  assert.match(processPanel, /@pointerdown\.capture="activateArtifactPreview"/);
  assert.match(dialog, /@dblclick="centerTaskProgressPanel"/);
  assert.match(dialog, /window\.innerWidth - centeredWidth/);
  assert.doesNotMatch(dialog, />归位</);
});

test("artifact preview owns its floating layer instead of relying on Element Plus dialog state", () => {
  assert.match(
    processPanel,
    /class="artifact-preview-dialog__body"[\s\S]*@pointerdown\.capture="activateArtifactPreview"/
  );
  assert.match(processPanel, /class="artifact-preview-panel"/);
  assert.match(processPanel, /:style="artifactPreviewPanelStyle"/);
  assert.match(processPanel, /@pointerdown="startArtifactPreviewDrag"/);
  assert.match(processPanel, /zIndex: artifactPreviewZIndex\.value/);
  assert.doesNotMatch(
    processPanel,
    /<el-dialog\s+v-model="isArtifactPreviewOpen"/
  );
});

test("result interpretation action uses the reading icon", () => {
  assert.match(
    dialog,
    /import \{[^}]*Reading[^}]*\} from "@element-plus\/icons-vue"/
  );
  assert.match(dialog, /<el-icon><Reading \/><\/el-icon>/);
});

test("task progress dialog exposes a terminal-only quality report section", () => {
  assert.match(dialog, /质量检测报告/);
  assert.match(dialog, /qualityReportSummary/);
  assert.match(dialog, /isLoadingQualityReport/);
  assert.match(dialog, /isDownloadingQualityReport/);
  assert.match(dialog, /:disabled="!isTerminal"/);
  assert.match(dialog, /view-quality-report/);
  assert.match(dialog, /download-quality-report/);
  assert.match(processPanel, /getQualityReport/);
  assert.match(processPanel, /window\.open/);
  assert.match(processPanel, /downloadQualityReport/);
});

test("map overlays expose layer cleanup, opacity control, and an original-image mode", () => {
  assert.match(processPanel, /artifact-map-layers/);
  assert.match(processPanel, /MAX_ARTIFACT_MAP_LAYERS/);
  assert.match(processPanel, /updateArtifactMapLayerOpacity/);
  assert.match(processPanel, /removeArtifactMapLayer/);
  assert.match(processPanel, /clearArtifactMapPreview/);
  assert.match(processPanel, /查看原图/);
  assert.match(processPanel, /SingleTileImageryProvider/);
});

test("map overlay visibility toggles the Cesium imagery layer and requests a redraw", () => {
  assert.match(processPanel, /toggleArtifactMapLayerVisibility/);
  assert.match(
    processPanel,
    /:aria-label="layer\.visible \? '隐藏图层' : '显示图层'"/
  );
  assert.match(processPanel, /rawLayer\.show = nextVisible/);
  assert.match(processPanel, /scene\.requestRender\(\)/);
  assert.match(
    processPanel,
    /viewer\.imageryLayers\.remove\(rawLayer, false\)/
  );
  assert.match(processPanel, /viewer\.imageryLayers\.add\(rawLayer\)/);
});

test("removing a map overlay hides and detaches the exact Cesium layer", () => {
  assert.match(processPanel, /rawLayer\.show = false/);
  assert.match(processPanel, /toRaw\(target\.layer\)/);
  assert.match(processPanel, /viewer\.imageryLayers\.remove\(rawLayer, true\)/);
  assert.match(processPanel, /viewer\.scene\.requestRender\(\)/);
});

test("TIFF tile overlays use the server's Web Mercator tile grid", () => {
  assert.match(
    processPanel,
    /tilingScheme:\s*new Cesium\.WebMercatorTilingScheme\(\)/
  );
  assert.doesNotMatch(processPanel, /new Cesium\.GeographicTilingScheme\(\)/);
});

test("TIFF original preview is disabled while map tiles remain available", () => {
  assert.match(processPanel, /TIFF 原图暂不支持在线预览，请下载查看/);
  assert.match(
    processPanel,
    /:disabled="!isOriginalPreviewableArtifact\(layer\.artifact\)"/
  );
  assert.match(
    processPanel,
    /artifactMapLayers\.value\[index\] = \{ \.\.\.layer, opacity: nextOpacity \}/
  );
});
