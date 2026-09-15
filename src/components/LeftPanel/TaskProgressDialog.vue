<template>
  <el-dialog
    v-model="visible"
    class="task-progress-dialog"
    width="min(1000px, calc(100vw - 32px))"
    append-to-body
    :modal="false"
    :lock-scroll="false"
    :close-on-click-modal="false"
    draggable
    destroy-on-close
    aria-labelledby="task-progress-dialog-title"
  >
    <template #header>
      <div class="task-progress-dialog__heading">
        <strong id="task-progress-dialog-title">任务进度</strong>
        <span
          class="task-progress-dialog__task-status"
          :class="`is-${taskStatusTone}`"
        >
          {{ taskStatusLabel }}
        </span>
        <span class="task-progress-dialog__stage-count">
          已完成 {{ completedStageCount }}/{{ runtimeStageViews.length }}
        </span>
        <strong class="task-progress-dialog__percent"
          >{{ progressPercent }}%</strong
        >
      </div>
      <div
        class="task-progress-dialog__progress-track"
        role="progressbar"
        aria-label="任务完成进度"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ width: `${progressPercent}%` }" />
      </div>
    </template>

    <div class="task-progress-dialog__body">
      <el-collapse
        v-model="expandedSections"
        class="task-progress-dialog__sections"
      >
        <el-collapse-item name="execution">
          <template #title>
            <span class="task-progress-dialog__section-title">
              <strong>执行详情</strong>
              <small>阶段状态与产物</small>
            </span>
          </template>
          <div
            v-if="!runtimeStageViews.length"
            class="task-progress-dialog__empty"
            role="status"
          >
            <strong>任务尚未启动</strong>
            <span>启动处理后，这里会显示每个阶段的实时状态。</span>
          </div>
          <div
            v-else
            class="task-progress-dialog__timeline"
            aria-label="阶段状态：等待执行、正在执行、已完成、执行失败、需要重新执行"
            aria-live="polite"
          >
            <article
              v-for="view in runtimeStageViews"
              :key="runtimeKey(view)"
              class="task-progress-dialog__stage"
              :class="[
                `is-${view.status.toLowerCase()}`,
                isTopicStage(view) ? 'is-topic' : 'is-preprocess',
                { 'is-expandable': Boolean(view.stage) }
              ]"
              :tabindex="view.stage ? 0 : -1"
              :aria-expanded="
                view.stage ? isStageArtifactsExpanded(view) : undefined
              "
              @click="handleStageClick($event, view)"
              @keydown.enter.prevent="toggleStageArtifacts(view)"
              @keydown.space.prevent="toggleStageArtifacts(view)"
            >
              <span
                class="task-progress-dialog__stage-marker"
                aria-hidden="true"
              />
              <div class="task-progress-dialog__stage-body">
                <div class="task-progress-dialog__stage-heading">
                  <strong>{{ stageTitle(view) }}</strong>
                  <small class="task-progress-dialog__stage-kind">
                    {{ isTopicStage(view) ? "专题处理" : "预处理" }}
                  </small>
                  <span>{{ statusLabel(view.status) }}</span>
                </div>
                <p class="task-progress-dialog__stage-description">
                  {{ stageDescription(view) }}
                </p>
                <small
                  class="task-progress-dialog__stage-meta"
                  :title="
                    view.stage?.startedAt
                      ? `${view.stage.startedAt} → ${view.stage.finishedAt || '运行中'}`
                      : undefined
                  "
                  >耗时 {{ formatStageDuration(view.stage || {}) }} · 产物
                  {{ view.artifacts.length }} 个</small
                >
                <div
                  v-if="view.stage?.errorCode || view.stage?.errorMessage"
                  class="task-progress-dialog__error"
                  role="alert"
                >
                  <code v-if="view.stage?.errorCode">{{
                    view.stage.errorCode
                  }}</code>
                  <span v-if="view.stage?.errorMessage">{{
                    errorMessage(view.stage.errorMessage)
                  }}</span>
                </div>
              </div>
              <div
                v-if="isStageArtifactsExpanded(view)"
                :id="stageArtifactId(view)"
                class="task-progress-dialog__stage-expanded"
                @click.stop
                @keydown.stop
              >
                <div
                  v-if="view.artifacts.length"
                  class="task-progress-dialog__artifact-list"
                  aria-label="阶段产物"
                >
                  <div
                    v-for="artifact in view.artifacts"
                    :key="`${artifact.stageId}-${artifact.type}-${artifact.uri}`"
                    class="task-progress-dialog__artifact"
                  >
                    <div class="task-progress-dialog__artifact-main">
                      <el-icon aria-hidden="true"><Document /></el-icon>
                      <span>
                        <strong :title="artifactName(artifact)">{{
                          artifactName(artifact)
                        }}</strong>
                        <small>
                          {{ artifactFormat(artifact) }} ·
                          {{ artifactSize(artifact) }} ·
                          {{ artifactRetentionLabel(artifact) }}
                        </small>
                      </span>
                    </div>
                    <small class="task-progress-dialog__artifact-description">
                      {{ artifactDescription(artifact) }}
                    </small>
                    <div class="task-progress-dialog__artifact-actions">
                      <el-tooltip
                        :content="artifactPreviewHint(artifact)"
                        placement="top"
                        effect="light"
                      >
                        <span>
                          <el-button
                            size="small"
                            text
                            type="primary"
                            :disabled="!canPreviewArtifact(artifact)"
                            :loading="isPreviewingArtifact(artifact)"
                            @click="openArtifact(artifact)"
                          >
                            <el-icon v-if="!isPreviewingArtifact(artifact)">
                              <Location v-if="isMapArtifact(artifact)" />
                              <View v-else />
                            </el-icon>
                            查看
                          </el-button>
                        </span>
                      </el-tooltip>
                      <el-tooltip
                        :content="
                          artifact.downloadable === false
                            ? '该产物暂不可下载'
                            : '下载产物'
                        "
                        placement="top"
                        effect="light"
                      >
                        <span>
                          <el-button
                            size="small"
                            text
                            type="primary"
                            :disabled="artifact.downloadable === false"
                            :loading="isDownloadingArtifact(artifact)"
                            @click="downloadArtifact(artifact)"
                          >
                            <el-icon v-if="!isDownloadingArtifact(artifact)">
                              <Download />
                            </el-icon>
                            下载
                          </el-button>
                        </span>
                      </el-tooltip>
                    </div>
                  </div>
                </div>
                <p v-else class="task-progress-dialog__artifact-empty">
                  {{ emptyArtifactHint(view) }}
                </p>
              </div>
              <el-button
                v-if="view.stage && canRetry(view.stage.status)"
                text
                type="warning"
                :disabled="isBusy"
                @click.stop="emit('retry-stage', view.stage.stageId)"
                >重试</el-button
              >
            </article>
            <article
              class="task-progress-dialog__stage task-progress-dialog__quality-stage"
              :class="qualityReportStageClass"
            >
              <span
                class="task-progress-dialog__stage-marker"
                aria-hidden="true"
              />
              <div class="task-progress-dialog__stage-body">
                <div class="task-progress-dialog__stage-heading">
                  <strong>质量检测报告</strong>
                  <small class="task-progress-dialog__stage-kind"
                    >质量检测</small
                  >
                  <span>{{ qualityReportStatusLabel }}</span>
                </div>
                <p class="task-progress-dialog__stage-description">
                  任务级基础质量与产物完整性检查
                </p>
                <small class="task-progress-dialog__stage-meta">
                  {{ qualityReportMeta }}
                </small>
              </div>
              <div class="task-progress-dialog__quality-actions">
                <el-button
                  size="small"
                  text
                  type="primary"
                  :disabled="!isTerminal"
                  :loading="isLoadingQualityReport"
                  @click="emit('view-quality-report')"
                >
                  <el-icon v-if="!isLoadingQualityReport"><View /></el-icon>
                  查看
                </el-button>
                <el-button
                  size="small"
                  text
                  type="primary"
                  :disabled="!isTerminal"
                  :loading="isDownloadingQualityReport"
                  @click="emit('download-quality-report')"
                >
                  <el-icon v-if="!isDownloadingQualityReport"
                    ><Download
                  /></el-icon>
                  下载
                </el-button>
              </div>
            </article>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <div class="task-progress-dialog__footer">
        <el-button v-if="canCancel" plain @click="emit('cancel')"
          >取消任务</el-button
        >
        <span class="task-progress-dialog__footer-spacer" />
        <el-button
          v-if="taskStatus === 'SUCCEEDED'"
          type="primary"
          aria-label="下载最终 ZIP"
          :loading="isDownloadingResult"
          @click="emit('download-result')"
        >
          <el-icon v-if="!isDownloadingResult"><Download /></el-icon>
          {{ isDownloadingResult ? "正在准备 ZIP" : "下载全部产物 ZIP" }}
        </el-button>
        <el-button v-if="isTerminal" plain @click="emit('reset')"
          >重新处理</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Document, Download, Location, View } from "@element-plus/icons-vue";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage,
  ProcessingIdentifier,
  ProcessingLifecycleStatus
} from "@/api/multiSourceSatellite";
import {
  processingStepStatusLabel,
  formatStageDuration,
  type ProcessingStepViewStatus,
  type RuntimeStageView
} from "@/features/multisource/processingRunState";
import { resolveArtifactView } from "@/features/multisource/artifactCapabilities";

const props = defineProps<{
  modelValue: boolean;
  taskStatus?: ProcessingLifecycleStatus;
  taskStatusLabel: string;
  taskStatusTone: "running" | "success" | "danger" | "muted";
  runtimeStageViews: readonly RuntimeStageView[];
  runtimeCurrentStage?: RuntimeStageView;
  completedStageCount: number;
  progressPercent: number;
  isTerminal: boolean;
  canCancel: boolean;
  isBusy: boolean;
  isDownloadingResult: boolean;
  isDownloadingQualityReport: boolean;
  isLoadingQualityReport: boolean;
  qualityReportSummary?: {
    overallStatus: string;
    totalChecks: number;
    passedChecks: number;
    warningChecks: number;
    failedChecks: number;
  } | null;
  expandedArtifactStageIds: readonly ProcessingIdentifier[];
  previewingArtifact?: ExecutionProgressArtifact | null;
  downloadingArtifact?: ExecutionProgressArtifact | null;
  runtimeKey: (view: RuntimeStageView) => string | number;
  stageTitle: (view: RuntimeStageView) => string;
  stageDescription: (view: RuntimeStageView) => string;
  errorMessage: (message: string) => string;
  artifactName: (artifact: ExecutionProgressArtifact) => string;
  artifactSize: (artifact: ExecutionProgressArtifact) => string;
  isPreviewable: (artifact: ExecutionProgressArtifact) => boolean;
  isMapPreviewable: (artifact: ExecutionProgressArtifact) => boolean;
  canRetry: (status: string) => boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "toggle-artifacts": [stageId: ExecutionProgressStage["stageId"]];
  "preview-artifact": [artifact: ExecutionProgressArtifact];
  "show-artifact-on-map": [artifact: ExecutionProgressArtifact];
  "download-artifact": [artifact: ExecutionProgressArtifact];
  "retry-stage": [stageId: ProcessingIdentifier];
  cancel: [];
  "download-result": [];
  "view-quality-report": [];
  "download-quality-report": [];
  reset: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value)
});
const expandedSections = ref(["execution"]);

const progressPercent = computed(() =>
  Math.max(0, Math.min(100, Math.round(props.progressPercent)))
);

const qualityReportStageClass = computed(() => {
  if (!props.isTerminal) return "is-waiting";
  switch (props.qualityReportSummary?.overallStatus?.toUpperCase()) {
    case "PASS":
      return "is-succeeded";
    case "WARN":
      return "is-needs_rerun";
    case "FAIL":
      return "is-failed";
    default:
      return "is-succeeded";
  }
});

const qualityReportStatusLabel = computed(() => {
  if (!props.isTerminal) return "待生成";
  switch (props.qualityReportSummary?.overallStatus?.toUpperCase()) {
    case "PASS":
      return "已通过";
    case "WARN":
      return "有警告";
    case "FAIL":
      return "未通过";
    default:
      return "可查看";
  }
});

const qualityReportMeta = computed(() => {
  const summary = props.qualityReportSummary;
  if (!summary) {
    return props.isTerminal ? "任务结束后可查看报告" : "任务结束后生成报告";
  }
  return `检查 ${summary.totalChecks} 项 · 通过 ${summary.passedChecks} · 警告 ${summary.warningChecks} · 失败 ${summary.failedChecks}`;
});

function statusLabel(status: ProcessingStepViewStatus) {
  return processingStepStatusLabel(status);
}

function isTopicStage(view: RuntimeStageView) {
  return view.step.kind === "target";
}

function artifactView(artifact: ExecutionProgressArtifact) {
  return resolveArtifactView(artifact);
}

function isPreviewingArtifact(artifact?: ExecutionProgressArtifact) {
  return Boolean(
    artifact &&
      props.previewingArtifact &&
      String(props.previewingArtifact.stageId) === String(artifact.stageId) &&
      props.previewingArtifact.type === artifact.type
  );
}

function previewArtifact(artifact: ExecutionProgressArtifact) {
  if (!isPreviewingArtifact(artifact)) emit("preview-artifact", artifact);
}

function showMapArtifact(artifact: ExecutionProgressArtifact) {
  emit("show-artifact-on-map", artifact);
}

function isDownloadingArtifact(artifact?: ExecutionProgressArtifact) {
  return Boolean(
    artifact &&
      props.downloadingArtifact &&
      String(props.downloadingArtifact.stageId) === String(artifact.stageId) &&
      props.downloadingArtifact.type === artifact.type
  );
}

function downloadArtifact(artifact: ExecutionProgressArtifact) {
  if (!isDownloadingArtifact(artifact)) emit("download-artifact", artifact);
}

function stageArtifactKey(view: RuntimeStageView) {
  return String(props.runtimeKey(view));
}

function stageArtifactId(view: RuntimeStageView) {
  return `task-progress-artifacts-${stageArtifactKey(view).replace(/[^a-z0-9_-]/gi, "-")}`;
}

function isStageArtifactsExpanded(view: RuntimeStageView) {
  return Boolean(
    view.stage && props.expandedArtifactStageIds.includes(view.stage.stageId)
  );
}

function toggleStageArtifacts(view: RuntimeStageView) {
  if (view.stage) emit("toggle-artifacts", view.stage.stageId);
}

function handleStageClick(event: MouseEvent, view: RuntimeStageView) {
  if (!view.stage) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest("button, a, [role='button']")
  ) {
    return;
  }
  toggleStageArtifacts(view);
}

function isMapArtifact(artifact: ExecutionProgressArtifact) {
  const view = artifactView(artifact);
  return (
    view.enabled && view.mode === "map" && props.isMapPreviewable(artifact)
  );
}

function canPreviewArtifact(artifact: ExecutionProgressArtifact) {
  const view = artifactView(artifact);
  return (
    isMapArtifact(artifact) ||
    (view.enabled &&
      ["image", "json", "text"].includes(view.mode) &&
      props.isPreviewable(artifact))
  );
}

function artifactPreviewHint(artifact: ExecutionProgressArtifact) {
  if (isMapArtifact(artifact)) return "在地图中查看";
  if (artifactView(artifact).enabled && props.isPreviewable(artifact)) {
    return "在线查看产物";
  }
  return (
    artifactView(artifact).reason || "该产物暂不支持在线查看，请下载后查看"
  );
}

function openArtifact(artifact: ExecutionProgressArtifact) {
  if (isMapArtifact(artifact)) showMapArtifact(artifact);
  else if (canPreviewArtifact(artifact)) previewArtifact(artifact);
}

function artifactFormat(artifact: ExecutionProgressArtifact) {
  return artifact.format || artifactView(artifact).format || artifact.type;
}

function artifactRetentionLabel(artifact: ExecutionProgressArtifact) {
  return artifact.retention === "FINAL" ? "最终产物" : "中间产物";
}

function artifactDescription(artifact: ExecutionProgressArtifact) {
  if (artifact.description?.trim()) return artifact.description.trim();
  const label =
    `${artifact.displayName || ""} ${artifact.type} ${artifact.uri}`.toLowerCase();
  if (/source|manifest|metadata|元数据|清单/.test(label)) {
    return "产品包解析出的元数据与文件匹配结果。";
  }
  if (/quality|qc|质量|校验/.test(label)) {
    return "用于检查产品质量、完整性和有效性的校验结果。";
  }
  if (/rgb|fusion|合成/.test(label)) {
    return "按所选波段生成的 RGB 彩色合成影像。";
  }
  if (/anomaly|显著|异常/.test(label)) {
    return "用于定位局部异常或显著变化区域的分析结果。";
  }
  if (/feature|特征|metric|统计/.test(label)) {
    return "从输入影像计算得到的专题特征和统计结果。";
  }
  if (/grid|网格|track|沿轨/.test(label)) {
    return "将观测数据整理为空间网格或沿轨分析结果。";
  }
  if (/\.json|json/.test(label)) {
    return "结构化处理摘要，记录本阶段的参数和执行结果。";
  }
  if (/\.csv|csv/.test(label)) return "可下载到本地的表格数据文件。";
  if (/\.tif|\.tiff|cog/.test(label)) {
    return "可在地图中查看的地理参考栅格影像。";
  }
  if (/\.png|\.jpg|\.jpeg|image|影像/.test(label)) {
    return "处理生成的预览影像文件。";
  }
  return "本阶段生成的处理产物，可根据格式查看或下载。";
}

function emptyArtifactHint(view: RuntimeStageView) {
  return view.status === "SUCCEEDED"
    ? "该阶段未生成可下载产物"
    : "该阶段尚未生成可下载产物";
}
</script>

<style scoped lang="less">
.task-progress-dialog__heading,
.task-progress-dialog__stage-heading,
.task-progress-dialog__footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

:global(.task-progress-dialog) {
  overflow: hidden;
  border: 1px solid #bfd9e5;
  border-radius: 7px;
  box-shadow: 0 18px 42px rgb(30 66 84 / 22%);
}

:global(.task-progress-dialog .el-dialog__header) {
  padding: 13px 16px 0;
  margin-right: 0;
  border-bottom: 0;
}

:global(.task-progress-dialog .el-dialog__body) {
  padding: 12px 16px 14px;
}

:global(.task-progress-dialog .el-dialog__footer) {
  padding: 10px 16px 14px;
  border-top: 1px solid #e1ebef;
}

.task-progress-dialog__heading {
  justify-content: flex-start;
  width: 100%;
}

.task-progress-dialog__footer {
  justify-content: space-between;
}

.task-progress-dialog__sections {
  border-top: 0;
  border-bottom: 0;
}

.task-progress-dialog__sections :deep(.el-collapse-item__header) {
  height: 42px;
  color: #314957;
  background: #f6fafb;
  border-color: #dce8ed;
}

.task-progress-dialog__sections :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-color: #dce8ed;
}

.task-progress-dialog__sections :deep(.el-collapse-item__content) {
  padding: 10px 0 2px;
}

.task-progress-dialog__section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.task-progress-dialog__section-title strong {
  color: #314957;
  font-size: 13px;
}

.task-progress-dialog__section-title small {
  overflow: hidden;
  color: #71838e;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__heading strong {
  color: #243746;
  font-size: 16px;
}

.task-progress-dialog__task-status,
.task-progress-dialog__stage-count {
  flex: 0 0 auto;
  padding: 1px 6px;
  color: #6c7f8a;
  font-size: 11px;
  line-height: 18px;
  background: #f1f5f6;
  border: 1px solid #d9e4e8;
  border-radius: 3px;
}

.task-progress-dialog__task-status.is-running {
  color: #0f6380;
  background: #e8f5f8;
  border-color: #bedee8;
}

.task-progress-dialog__task-status.is-success {
  color: #216b4c;
  background: #edf8f1;
  border-color: #c7e4d2;
}

.task-progress-dialog__task-status.is-danger {
  color: #9a3d3d;
  background: #fff3f3;
  border-color: #e8c5c5;
}

.task-progress-dialog__percent {
  flex: 0 0 auto;
  color: #176b84;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.task-progress-dialog__progress-track {
  height: 4px;
  margin: 10px -16px 0;
  overflow: hidden;
  background: #d8e6ec;
}

.task-progress-dialog__progress-track span {
  display: block;
  height: 100%;
  background: #2e7da3;
  transition: width 180ms ease;
}

.task-progress-dialog__stage-marker {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #9eafb8;
  border-radius: 50%;
}

.task-progress-dialog__stage-marker {
  align-self: center;
  margin-top: 0;
}

.task-progress-dialog__stage.is-succeeded .task-progress-dialog__stage-marker {
  background: #338467;
}

.task-progress-dialog__stage.is-failed .task-progress-dialog__stage-marker {
  background: #b44c4c;
}

.task-progress-dialog__stage.is-processing .task-progress-dialog__stage-marker {
  background: #2e7da3;
}

.task-progress-dialog__stage.is-needs_rerun
  .task-progress-dialog__stage-marker {
  background: #b5792d;
}

.task-progress-dialog__stage p,
.task-progress-dialog__time,
.task-progress-dialog__artifact small {
  color: #71838e;
  font-size: 11px;
  line-height: 1.4;
}

.task-progress-dialog__empty {
  display: grid;
  min-height: 132px;
  place-content: center;
  gap: 5px;
  padding: 18px;
  color: #71838e;
  text-align: center;
  background: #fbfdfe;
  border: 1px dashed #cbdde5;
  border-radius: 4px;
}

.task-progress-dialog__empty strong {
  color: #405665;
  font-size: 13px;
}

.task-progress-dialog__empty span {
  font-size: 11px;
  line-height: 1.5;
}

.task-progress-dialog__timeline {
  display: grid;
  max-height: min(50vh, 410px);
  gap: 5px;
  padding-right: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.task-progress-dialog__stage {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 9px 10px;
  background: #fbfdfe;
  border: 1px solid #dce8ed;
  border-radius: 4px;
}

.task-progress-dialog__stage.is-expandable {
  cursor: pointer;
}

.task-progress-dialog__stage.is-expandable:hover {
  border-color: #8abed9;
  box-shadow: 0 2px 8px rgb(42 104 127 / 10%);
}

.task-progress-dialog__stage.is-expandable:focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.task-progress-dialog__stage.is-processing {
  background: #f0f8fc;
  border-color: #8abed9;
}

.task-progress-dialog__stage.is-topic {
  background: #f2fbfd;
  border-color: #b8dce6;
  box-shadow: inset 3px 0 0 #3093ad;
}

.task-progress-dialog__stage.is-topic.is-waiting {
  background: #f8f7f2;
  border-color: #ddd2ae;
  box-shadow: inset 3px 0 0 #a88b49;
}

.task-progress-dialog__stage.is-topic.is-processing {
  background: #e5f6fa;
  border-color: #65b4c9;
}

.task-progress-dialog__stage.is-topic.is-succeeded {
  background: #edf9f7;
  border-color: #a9d8ca;
  box-shadow: inset 3px 0 0 #338467;
}

.task-progress-dialog__stage.is-succeeded {
  background: #f2faf6;
  border-color: #b9daca;
}

.task-progress-dialog__stage.is-failed {
  background: #fff6f6;
  border-color: #e3b9b9;
}

.task-progress-dialog__stage.is-needs_rerun {
  background: #fffaf1;
  border-color: #e6c38f;
}

.task-progress-dialog__stage.is-waiting {
  background: #fbfdfe;
  border-color: #dce8ed;
}

.task-progress-dialog__quality-stage {
  cursor: default;
}

.task-progress-dialog__stage-body {
  display: grid;
  grid-template-columns: minmax(132px, 1fr) minmax(0, 1.25fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.task-progress-dialog__stage-heading strong {
  min-width: 0;
  overflow: hidden;
  color: #314957;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__stage-heading span {
  flex: 0 0 auto;
  padding: 1px 5px;
  color: #5e7481;
  font-size: 11px;
  background: #edf3f6;
  border-radius: 3px;
}

.task-progress-dialog__stage-kind {
  flex: 0 0 auto;
  padding: 1px 5px;
  color: #697d88;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.35;
  background: #eef3f5;
  border-radius: 3px;
}

.task-progress-dialog__stage.is-topic .task-progress-dialog__stage-kind {
  color: #176d85;
  background: #dff2f6;
}

.task-progress-dialog__stage-description {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__stage-meta {
  margin: 0;
  white-space: nowrap;
}

.task-progress-dialog__error {
  grid-column: 1 / -1;
  display: grid;
  gap: 2px;
  margin-top: 6px;
  color: #a13f3f;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.task-progress-dialog__error code {
  color: inherit;
}

.task-progress-dialog__stage-expanded {
  display: grid;
  grid-column: 2 / -1;
  gap: 8px;
  padding-top: 8px;
  margin-top: -1px;
  border-top: 1px solid #dce8ed;
}

.task-progress-dialog__footer :deep(.el-button):focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.task-progress-dialog__artifact-list {
  display: grid;
  border-top: 1px solid #e2ecef;
}

.task-progress-dialog__artifact {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(150px, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 0;
  border-bottom: 1px solid #e6eef1;
}

.task-progress-dialog__artifact:last-child {
  border-bottom: 0;
}

.task-progress-dialog__artifact-main {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.task-progress-dialog__artifact-main > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.task-progress-dialog__artifact-main > .el-icon {
  flex: 0 0 auto;
  color: #5e899a;
}

.task-progress-dialog__artifact-main strong,
.task-progress-dialog__artifact-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__artifact-description {
  min-width: 0;
  overflow: hidden;
  color: #607883;
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__artifact-main strong {
  color: #38505d;
  font-size: 12px;
  font-weight: 600;
}

.task-progress-dialog__artifact-main small {
  color: #71838e;
  font-size: 10px;
}

.task-progress-dialog__artifact-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.task-progress-dialog__artifact-actions > span {
  display: inline-flex;
}

.task-progress-dialog__artifact-actions :deep(.el-button) {
  min-width: 0;
  padding: 4px 5px;
}

.task-progress-dialog__artifact-actions :deep(.el-button .el-icon) {
  margin-right: 3px;
}

.task-progress-dialog__artifact-empty {
  padding: 6px 0 0;
  margin: 0;
  color: #71838e;
  font-size: 11px;
  line-height: 1.45;
}

.task-progress-dialog__footer-spacer {
  flex: 1;
}

.task-progress-dialog__quality-actions {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 2px;
}

.task-progress-dialog__quality-actions :deep(.el-button) {
  min-width: 0;
  padding: 4px 5px;
}

.task-progress-dialog__quality-actions :deep(.el-button .el-icon) {
  margin-right: 3px;
}

@media (max-width: 560px) {
  .task-progress-dialog__stage-body {
    grid-template-columns: minmax(112px, 1fr) minmax(0, 1fr);
  }

  .task-progress-dialog__stage-meta {
    grid-column: 1 / -1;
  }

  .task-progress-dialog__stage-expanded {
    grid-column: 1 / -1;
    margin-left: 18px;
  }

  .task-progress-dialog__artifact {
    grid-template-columns: minmax(0, 1fr);
  }

  .task-progress-dialog__artifact-description {
    white-space: normal;
  }

  .task-progress-dialog__artifact-actions {
    justify-content: flex-start;
  }

  .task-progress-dialog__footer {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .task-progress-dialog__footer-spacer {
    display: none;
  }

  .task-progress-dialog__footer :deep(.el-button) {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .task-progress-dialog__progress-track span {
    transition: none;
  }
}
</style>
