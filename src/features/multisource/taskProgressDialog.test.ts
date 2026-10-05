import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dialog = readFileSync(
  "src/components/LeftPanel/TaskProgressDialog.vue",
  "utf8"
);
const processPanel = readFileSync(
  "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
  "utf8"
);

const taskHistoryDialogPath = "src/components/LeftPanel/TaskHistoryDialog.vue";
const historyDialog = readFileSync(taskHistoryDialogPath, "utf8");
const processingTask = readFileSync(
  "src/features/multisource/useProcessingTask.ts",
  "utf8"
);
const multisourceApi = readFileSync("src/api/multiSourceSatellite.ts", "utf8");
const interpretationPanelPath =
  "src/features/multisource/ArtifactInterpretationPanel.vue";

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

test("history tasks use a separate dialog with explicit task identifiers", () => {
  assert.equal(
    existsSync(taskHistoryDialogPath),
    true,
    "history task management must be isolated from the active task dialog"
  );
  const historyDialog = readFileSync(taskHistoryDialogPath, "utf8");
  assert.match(historyDialog, /<Teleport to="body">/);
  assert.match(historyDialog, /历史任务与产物/);
  assert.match(historyDialog, /preview-artifact.*taskId/);
  assert.match(historyDialog, /download-result.*taskId/);
  assert.match(historyDialog, /historyActions/);
  assert.match(processPanel, /TaskHistoryDialog/);
  assert.match(processPanel, /isTaskHistoryOpen/);
  assert.match(processPanel, /历史任务与产物/);
});

test("artifact preview resolves the download icon locally", () => {
  assert.match(processPanel, /<Download\s*\/>/);
  assert.match(
    processPanel,
    /import\s*\{[\s\S]*?\bDownload\b[\s\S]*?\}\s*from\s*["']@element-plus\/icons-vue["']/
  );
});

test("history pagination keeps ten rows per page and shows total pages", () => {
  const historyDialog = readFileSync(taskHistoryDialogPath, "utf8");
  assert.match(historyDialog, /const pageSize = 10/);
  assert.match(historyDialog, /totalPages/);
  assert.match(historyDialog, /第 \{\{ page \}\} \/ \{\{ totalPages \}\} 页/);
});

test("history list handles empty pages and keeps table controls stable", () => {
  assert.match(
    historyDialog,
    /v-if="total > 0" class="task-history-dialog__pagination"/
  );
  assert.match(historyDialog, /task-history-dialog__empty-icon/);
  assert.match(historyDialog, /task-history-dialog__retention-filter/);
  assert.match(historyDialog, /:title="item\.taskNo"/);
  assert.match(
    historyDialog,
    /:title="item\.productCodes\.join\(' \/ '\) \|\| '—'"/
  );
  assert.match(historyDialog, /vertical-align:\s*middle/);
  assert.match(historyDialog, /:disabled="page <= 1 \|\| isLoading"/);
  assert.match(
    historyDialog,
    /:disabled="page \* pageSize >= total \|\| isLoading"/
  );
});

test("history keyword filter supports fuzzy task-name, task-number, and product search", () => {
  assert.match(historyDialog, /v-model="filters\.keyword"/);
  assert.match(historyDialog, /placeholder="任务名称 \/ 编号 \/ 产品"/);
  assert.match(
    historyDialog,
    /keyword: filters\.keyword\.trim\(\) \|\| undefined/
  );
  assert.match(
    multisourceApi,
    /interface TaskHistoryQueryParams \{[\s\S]*?keyword\?: string;/
  );
});

test("history queries clamp the page and clear cross-filter selections", () => {
  assert.match(
    historyDialog,
    /clampHistoryPage\(page\.value, result\.total, pageSize\)/
  );
  assert.match(
    historyDialog,
    /async function loadHistory\(resetSelection = true(?:, showLoading = true)?\)/
  );
  assert.match(historyDialog, /if \(resetSelection\) clearBatchSelection\(\)/);
  assert.match(historyDialog, /void loadHistory\(false\)/);
});

test("history batch actions preflight unavailable source and artifact states", () => {
  assert.match(historyDialog, /confirmBatchPreflight\("SET_EXPIRY"\)/);
  assert.match(historyDialog, /confirmBatchPreflight\("RECYCLE_SOURCE"\)/);
  assert.match(historyDialog, /confirmBatchPreflight\("RECYCLE"\)/);
  assert.match(historyDialog, /不可操作项将跳过/);
  assert.match(historyDialog, /:disabled="!batchSelection\.selectedCount"/);
  assert.match(historyDialog, /:disabled="!selectedActions\.canRecycle"/);
});

test("history source detail derives cleaned state from zero source files", () => {
  assert.match(historyDialog, /effectiveInputRetentionStatus/);
  assert.match(historyDialog, /sourceInputCount\.value === 0/);
  assert.match(historyDialog, /源文件已清理/);
});

test("history batch actions keep source retention and task artifacts separate", () => {
  assert.match(historyDialog, /placeholder="源文件状态"/);
  assert.match(historyDialog, /task-history-dialog__tag--source/);
  assert.match(historyDialog, /task-history-dialog__tag--artifact/);
  assert.match(historyDialog, /批量设置原始输入保留期/);
  assert.match(historyDialog, /批量移入源文件回收站/);
  assert.match(historyDialog, /批量移入产物回收站/);
  assert.match(historyDialog, /batchChangeProcessingTaskInputRetention/);
  assert.match(historyDialog, /batchChangeProcessingTaskArtifactRetention/);
  assert.match(historyDialog, /operation === "PURGE"/);
  assert.match(historyDialog, /operation: "RECYCLE"/);
});

test("history source recycle-bin view exposes batch permanent deletion", () => {
  assert.match(historyDialog, /isViewingSourceRecycleBin/);
  assert.match(historyDialog, /批量永久删除源文件/);
  assert.match(historyDialog, /batchPermanentlyPurgeSourceInputs/);
  assert.match(historyDialog, /submitBatchSourceRetention\("PURGE"\)/);
});

test("history artifact recycle-bin view allows selecting and permanently deleting artifacts", () => {
  assert.match(historyDialog, /isViewingArtifactRecycleBin/);
  assert.match(historyDialog, /批量永久删除任务产物/);
  assert.match(historyDialog, /batchPermanentlyPurgeArtifacts/);
  assert.match(historyDialog, /purgeProcessingTaskArtifacts/);
});

test("history batch toolbar shows only the matching recycle-bin purge action", () => {
  assert.match(historyDialog, /const activeRecycleBinScope = computed/);
  assert.match(
    historyDialog,
    /v-if="activeRecycleBinScope !== 'artifact'"[\s\S]*?批量永久删除源文件/
  );
  assert.match(
    historyDialog,
    /v-if="activeRecycleBinScope !== 'source'"[\s\S]*?批量永久删除任务产物/
  );
  assert.match(
    historyDialog,
    /v-if="!activeRecycleBinScope"[\s\S]*?批量设置原始输入保留期/
  );
});

test("history storage and retention controls use grouped, accessible visual semantics", () => {
  assert.match(historyDialog, /task-history-dialog__storage-group--source/);
  assert.match(historyDialog, /task-history-dialog__storage-group--artifacts/);
  assert.match(historyDialog, /<FolderOpened \/>/);
  assert.match(historyDialog, /<Box \/>/);
  assert.match(historyDialog, /task-history-dialog__storage-recycle-icon/);
  assert.match(historyDialog, /task-history-dialog__retention-stack/);
  assert.match(historyDialog, /task-history-dialog__tag--source/);
  assert.match(historyDialog, /task-history-dialog__tag--artifact/);
  assert.match(historyDialog, /retentionStatusIcon/);
  assert.match(historyDialog, /task-history-dialog__batch-actions/);
  assert.match(historyDialog, /task-history-dialog__action--recycle/);
  assert.match(
    historyDialog,
    /\.task-history-dialog__list\s*\{[\s\S]*?flex-direction:\s*column;/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__pagination\s*\{[\s\S]*?margin-top:\s*auto;/
  );
});

test("history storage cards size to their content instead of stretching across the header", () => {
  assert.match(
    historyDialog,
    /\.task-history-dialog__storage-group\s*\{[\s\S]*?flex:\s*0 1 auto;/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__storage-group\s*\{[\s\S]*?max-width:\s*100%;/
  );
});

test("history keeps storage cards at the panel edge and sends batch purge confirmations", () => {
  assert.match(
    historyDialog,
    /<\/header>\s*<dl v-if="storageSummary" class="task-history-dialog__storage">/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__storage\s*\{[\s\S]*?position:\s*absolute;/
  );
  assert.match(historyDialog, /confirmations/);
  assert.match(historyDialog, /item\.taskNo/);
});

test("history filters render above the floating panel and keep close action clickable", () => {
  assert.match(
    historyDialog,
    /popper-class="task-history-dialog__filter-popper"/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__filter-popper\s*\{[\s\S]*?z-index:\s*10000/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__header-actions\s*\{[\s\S]*?position:\s*relative;/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__header-actions\s*\{[\s\S]*?z-index:\s*3;/
  );
});

test("all floating task dialogs use an icon-only close affordance", () => {
  assert.match(historyDialog, /aria-label="关闭历史任务与产物"/);
  assert.match(historyDialog, /aria-label="关闭结果说明"/);
  assert.match(historyDialog, /<Close\s*\/>/);
  assert.match(dialog, /aria-label="关闭任务进度"/);
  assert.match(dialog, /aria-label="关闭结果说明"/);
  assert.match(dialog, /<Close\s*\/>/);
  assert.doesNotMatch(historyDialog, /<el-button[^>]*>关闭<\/el-button>/);
  assert.doesNotMatch(dialog, /<el-button[^>]*>关闭<\/el-button>/);
});

test("history refreshes open tasks without clearing selection", () => {
  assert.match(historyDialog, /HISTORY_REFRESH_INTERVAL_MS/);
  assert.match(historyDialog, /window\.setInterval/);
  assert.match(historyDialog, /loadHistory\(resetSelection, !silent\)/);
  assert.match(historyDialog, /refresh\(false, true\)/);
  assert.match(historyDialog, /document\.hidden/);
  assert.match(historyDialog, /isFilterDirty\.value/);
  assert.match(historyDialog, /showLoading/);
  assert.match(historyDialog, /refreshSelectedTaskDetail/);
});

test("history layout supports a persisted, accessible split pane with a narrow-screen fallback", () => {
  assert.match(historyDialog, /task-history-dialog__splitter/);
  assert.match(historyDialog, /role="separator"/);
  assert.match(historyDialog, /aria-orientation="vertical"/);
  assert.match(historyDialog, /TASK_HISTORY_SPLIT_WIDTH_STORAGE_KEY/);
  assert.match(historyDialog, /localStorage\.setItem/);
  assert.match(
    historyDialog,
    /@media \(width <= 900px\)[\s\S]*?\.task-history-dialog__splitter\s*\{[\s\S]*?display:\s*none;/
  );
});

test("history container is a non-modal floating panel with drag and edge resize controls", () => {
  assert.match(historyDialog, /<Teleport to="body">/);
  assert.match(historyDialog, /aria-modal="false"/);
  assert.match(historyDialog, /class="task-history-dialog__header"/);
  assert.match(historyDialog, /startHistoryPanelDrag/);
  assert.match(historyDialog, /beginHistoryPanelResize/);
  assert.match(historyDialog, /resizeHandles/);
  assert.match(historyDialog, /task-history-dialog__resize-handle/);
  assert.match(historyDialog, /task-history-dialog__resize-handle\.is-nw/);
  assert.match(historyDialog, /task-history-dialog__resize-handle\.is-se/);
  assert.match(historyDialog, /historyPanelStyle/);
  assert.match(historyDialog, /useFloatingPanelStack/);
});

test("history interpretation is independently draggable and promoted above the history panel", () => {
  assert.match(
    historyDialog,
    /class="task-history-dialog__interpretation-dialog"/
  );
  assert.match(historyDialog, /aria-modal="false"/);
  assert.match(
    historyDialog,
    /class="task-history-dialog__interpretation-header"/
  );
  assert.match(historyDialog, /startInterpretationDrag/);
  assert.match(historyDialog, /interpretationPanelStyle/);
  assert.match(historyDialog, /activateInterpretation/);
  assert.match(historyDialog, /panelZIndex\("result-interpretation"\)/);
  assert.match(historyDialog, /bringToFront\("result-interpretation"\)/);
});

test("history interpretation panel is a body-level sibling of the history panel", () => {
  assert.match(
    historyDialog,
    /<\/div>\s*<\/section>\s*<section\s+v-show="isInterpretationOpen"/
  );
});

test("history confirmation boxes are promoted above floating panels", () => {
  assert.match(historyDialog, /floatingMessageBoxOptions/);
  assert.match(historyDialog, /modalClass/);
  assert.match(historyDialog, /bringToFront\("message-box"\)/);
  assert.match(historyDialog, /task-history-dialog__message-box-overlay/);
  assert.equal(
    (historyDialog.match(/floatingMessageBoxOptions\(\{/g) || []).length,
    11
  );
});

test("history details isolate source-input and artifact retention controls", () => {
  assert.match(historyDialog, /<strong>原始输入<\/strong>/);
  assert.match(historyDialog, /<strong>任务产物<\/strong>/);
  assert.match(historyDialog, /sourceInputCount/);
  assert.match(historyDialog, /sourceInputSizeBytes/);
  assert.match(historyDialog, /changeProcessingTaskInputRetention/);
  assert.match(historyDialog, /changeProcessingTaskArtifactRetention/);
  assert.match(historyDialog, /移入回收站后将立即禁用该任务原始输入的访问/);
  assert.match(historyDialog, /原始输入、任务记录和质量报告将保留/);
});

test("source recycle-bin details show expiry and confirmed permanent deletion", () => {
  assert.match(historyDialog, /回收站到期时间/);
  assert.match(historyDialog, /永久删除源文件/);
  assert.match(historyDialog, /permanentlyPurgeSourceInputs/);
  assert.match(historyDialog, /operation: "PURGE"/);
});

test("single-task permanent deletion uses a standard warning instead of task-number input", () => {
  const artifactPurge = historyDialog.match(
    /async function purgeTask\(\) \{[\s\S]*?(?=\nasync function openSourceRetentionEditor)/
  )?.[0];
  const sourcePurge = historyDialog.match(
    /async function permanentlyPurgeSourceInputs\(\) \{[\s\S]*?(?=\nfunction openArtifact)/
  )?.[0];

  assert.ok(artifactPurge, "artifact purge handler must exist");
  assert.ok(sourcePurge, "source purge handler must exist");
  assert.match(artifactPurge, /ElMessageBox\.confirm/);
  assert.match(sourcePurge, /ElMessageBox\.confirm/);
  assert.doesNotMatch(artifactPurge, /ElMessageBox\.prompt|inputPattern/);
  assert.doesNotMatch(sourcePurge, /ElMessageBox\.prompt|inputPattern/);
  assert.match(
    artifactPurge,
    /purgeProcessingTaskArtifacts\(target\.taskId, target\.taskNo\)/
  );
  assert.match(sourcePurge, /taskNo: target\.taskNo/);
});

test("single-task source recycling uses a standard confirmation instead of task-number input", () => {
  const sourceRecycle = historyDialog.match(
    /async function purgeSourceInputs\(\) \{[\s\S]*?(?=\nasync function restoreSourceInputs)/
  )?.[0];

  assert.ok(sourceRecycle, "source recycle handler must exist");
  assert.match(sourceRecycle, /ElMessageBox\.confirm/);
  assert.doesNotMatch(sourceRecycle, /ElMessageBox\.prompt|inputPattern/);
  assert.match(sourceRecycle, /operation: "RECYCLE"/);
  assert.match(sourceRecycle, /taskNo: target\.taskNo/);
});

test("history filters and storage summary adapt to a resized panel", () => {
  assert.match(historyDialog, /task-history-dialog__filter-group--source/);
  assert.match(historyDialog, /task-history-dialog__filter-group--time/);
  assert.match(historyDialog, /task-history-dialog__filter-group--retention/);
  assert.match(historyDialog, /isFilterDirty/);
  assert.match(historyDialog, /resetFilters/);
  assert.match(historyDialog, /is-filter-dirty/);
  assert.match(historyDialog, /flex-wrap:\s*wrap/);
  assert.match(historyDialog, /min-width:\s*160px/);
  assert.match(historyDialog, /ResizeObserver/);
});

test("history content has independent fixed-height panes", () => {
  const historyDialog = readFileSync(taskHistoryDialogPath, "utf8");
  assert.match(
    historyDialog,
    /\.task-history-dialog__content\s*\{[\s\S]*height:/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__table-wrap\s*\{[\s\S]*overflow:\s*auto/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__detail\s*\{[\s\S]*overflow:\s*hidden auto/
  );
});

test("history details use the shared runtime stage and artifact behavior", () => {
  const historyDialog = readFileSync(taskHistoryDialogPath, "utf8");
  assert.match(historyDialog, /buildRuntimeStageViews/);
  assert.match(historyDialog, /collapseRuntimeStageViews/);
  assert.match(historyDialog, /expandedArtifactStageIds/);
  assert.match(historyDialog, /toggleStageArtifacts/);
  assert.match(historyDialog, /task-progress-dialog__stage-expanded/);
  assert.match(historyDialog, /task-progress-dialog__artifact-list/);
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

test("artifact rows keep metadata, description, and actions on one responsive row", () => {
  assert.match(
    dialog,
    /\.task-progress-dialog__artifact\s*\{[\s\S]*?display:\s*flex;/
  );
  assert.match(
    dialog,
    /\.task-progress-dialog__artifact-main\s*>\s*span\s*\{[\s\S]*?display:\s*flex;/
  );
  assert.match(
    dialog,
    /\.task-progress-dialog__artifact-actions\s*\{[\s\S]*?white-space:\s*nowrap;/
  );
  assert.doesNotMatch(
    dialog,
    /@media \(max-width: 560px\)[\s\S]*?\.task-progress-dialog__artifact\s*\{[\s\S]*?grid-template-columns:/
  );
});

test("history artifact rows keep metadata, description, and actions on one row", () => {
  assert.match(
    historyDialog,
    /\.task-progress-dialog__artifact\s*\{[\s\S]*?display:\s*flex;/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__artifact-main\s*>\s*span\s*\{[\s\S]*?flex-direction:\s*row;/
  );
  assert.match(
    historyDialog,
    /\.task-history-dialog__artifact-actions\s*\{[\s\S]*?flex-direction:\s*row;/
  );
  assert.doesNotMatch(
    historyDialog,
    /\.task-progress-dialog__artifact-description\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/
  );
});

test("history execution stages use the shared Chinese stage labels", () => {
  assert.match(historyDialog, /processingStageLabel\(stageCode, isHy2d\)/);
  assert.doesNotMatch(
    historyDialog,
    /return view\.stage\?\.stageCode \|\| view\.stage\?\.stageKey \|\| view\.step\.title/
  );
});

test("history artifact rows expose the same result interpretation action", () => {
  assert.match(historyDialog, /结果解读/);
  assert.match(historyDialog, /ArtifactInterpretationPanel/);
  assert.match(historyDialog, /task-history-dialog__interpretation-dialog/);
  assert.match(historyDialog, /v-show="isInterpretationOpen"/);
  assert.match(historyDialog, /结果依据/);
});

test("history dialog adapts its two-column layout before horizontal overflow", () => {
  assert.match(
    historyDialog,
    /\.task-history-dialog__detail\s*\{[\s\S]*?overflow:\s*hidden auto;/
  );
  assert.match(historyDialog, /@media \(width <= 1199px\)/);
  assert.match(historyDialog, /@media \(width <= 900px\)/);
  assert.match(
    historyDialog,
    /\.task-progress-dialog__artifact-description\s*\{[\s\S]*?flex-basis:\s*100%;/
  );
  assert.match(
    historyDialog,
    /\.task-progress-dialog__artifact-actions\s*\{[\s\S]*?margin-left:\s*auto;/
  );
});

test("history artifact rows can shrink their content without clipping actions", () => {
  assert.match(
    historyDialog,
    /\.task-progress-dialog__stage-expanded\s*\{[^}]*min-width:\s*0;/
  );
  assert.match(
    historyDialog,
    /\.task-progress-dialog__artifact\s*\{[^}]*min-width:\s*0;/
  );
});

test("history stage subtitles never expose backend stage keys", () => {
  assert.match(historyDialog, /rawDescription/);
  assert.match(historyDialog, /阶段已完成/);
  assert.match(historyDialog, /!\/\^\[A-Z\]\[A-Z0-9_\]\+\$\//);
});

test("artifact rows provide a plain-language result interpretation beside viewing and downloading", () => {
  assert.match(dialog, /结果解读/);
  assert.match(dialog, /ArtifactInterpretationPanel/);
  assert.match(dialog, /结果依据/);
  assert.match(dialog, /openArtifactInterpretation\(artifact\)/);
  assert.match(dialog, /result-interpretation-panel/);
});

test("current and history progress use the shared parameter-aware result basis panel", () => {
  assert.equal(existsSync(interpretationPanelPath), true);
  const panel = readFileSync(interpretationPanelPath, "utf8");
  assert.match(dialog, /ArtifactInterpretationPanel/);
  assert.match(historyDialog, /ArtifactInterpretationPanel/);
  assert.match(panel, /结果用途/);
  assert.match(panel, /生成参数/);
  assert.match(panel, /处理链路/);
  assert.match(panel, /当前取值/);
  assert.match(panel, /对结果的影响/);
  assert.match(panel, /parameterSnapshot/);
  assert.match(multisourceApi, /parameterSnapshot\?: string/);
  assert.doesNotMatch(panel, /完整参数快照/);
  assert.doesNotMatch(panel, /判读要点/);
});

test("result interpretation windows are draggable and resizable in current and history views", () => {
  assert.match(dialog, /result-interpretation-panel/);
  assert.match(dialog, /result-interpretation-panel__resize-handle/);
  assert.match(historyDialog, /task-history-dialog__interpretation-dialog/);
  assert.match(
    historyDialog,
    /task-history-dialog__interpretation-resize-handle/
  );
  assert.match(historyDialog, /@pointerdown="startInterpretationDrag"/);
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

test("history details render the same quality report stage and receive its loading state", () => {
  assert.match(historyDialog, /task-progress-dialog__quality-stage/);
  assert.match(historyDialog, /qualityReportStatusLabel/);
  assert.match(historyDialog, /qualityReportMeta/);
  assert.match(historyDialog, /:loading="isLoadingQualityReport"/);
  assert.match(historyDialog, /:loading="isDownloadingQualityReport"/);
  assert.match(
    processPanel,
    /:is-loading-quality-report="isLoadingQualityReport"/
  );
  assert.match(
    processPanel,
    /:is-downloading-quality-report="isDownloadingQualityReport"/
  );
});

test("history quality reports remain available when artifact retention disables downloads", () => {
  const qualityActions = historyDialog.match(
    /class="task-progress-dialog__quality-actions"[\s\S]*?<\/div>\s*<\/article>/
  )?.[0];
  assert.ok(qualityActions, "history quality-report actions must be present");
  assert.match(qualityActions, /:disabled="!isSelectedTaskTerminal"/);
  assert.match(historyDialog, /质量报告作为任务记录保留/);
  assert.doesNotMatch(qualityActions, /selectedActions\.canDownload/);
  assert.doesNotMatch(qualityActions, /selectedActions\.reason/);
});

test("history quality report actions stay in the stage action column", () => {
  assert.match(
    historyDialog,
    /\.task-progress-dialog__stage\s*\{[^}]*grid-template-columns:\s*8px minmax\(0, 1fr\) auto;/
  );
  assert.match(
    historyDialog,
    /\.task-progress-dialog__quality-actions\s*\{[^}]*grid-column:\s*3;/
  );
});

test("quality report download uses an authenticated blob response", () => {
  assert.match(
    multisourceApi,
    /processing-tasks\/\$\{taskId\}\/quality-report\.html[\s\S]*?responseType:\s*"blob"/
  );
  assert.match(
    processingTask,
    /await downloadProcessingQualityReport\(taskId\)/
  );
  assert.match(
    processingTask,
    /saveBlob\(responseBlob\(response\), fileName\)/
  );
  assert.match(processPanel, /await downloadQualityReportForTask\(taskId\)/);
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
