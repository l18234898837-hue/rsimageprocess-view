<template>
  <el-dialog
    v-model="visible"
    class="task-progress-dialog"
    width="min(600px, calc(100vw - 32px))"
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
          class="task-progress-dialog__status"
          :class="`is-${taskStatusTone}`"
        >
          {{ taskStatus ? taskStatusLabel : "任务尚未启动" }}
        </span>
      </div>
    </template>

    <div class="task-progress-dialog__body">
      <div class="task-progress-dialog__summary">
        <div class="task-progress-dialog__summary-copy">
          <strong
            >{{ completedStageCount }} /
            {{ runtimeStageViews.length }} 个阶段已完成</strong
          >
          <span v-if="!taskStatus">启动任务后将在这里显示实时阶段状态。</span>
          <span v-else>阶段状态会随任务执行自动更新。</span>
        </div>
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

      <div
        v-if="runtimeCurrentStage"
        class="task-progress-dialog__current"
        aria-live="polite"
      >
        <span
          class="task-progress-dialog__current-dot"
          :class="`is-${taskStatusTone}`"
        />
        <div>
          <small>当前阶段</small>
          <strong>{{ stageTitle(runtimeCurrentStage) }}</strong>
          <span>{{ stageDescription(runtimeCurrentStage) }}</span>
          <time v-if="runtimeCurrentStage.stage?.startedAt">
            开始于 {{ runtimeCurrentStage.stage.startedAt }}
          </time>
        </div>
      </div>

      <div
        class="task-progress-dialog__timeline"
        aria-label="阶段状态：等待执行、正在执行、已完成、执行失败、需要重新执行"
      >
        <article
          v-for="view in runtimeStageViews"
          :key="runtimeKey(view)"
          class="task-progress-dialog__stage"
          :class="[
            `is-${view.status.toLowerCase()}`,
            isTopicStage(view) ? 'is-topic' : 'is-preprocess'
          ]"
        >
          <span class="task-progress-dialog__stage-marker" aria-hidden="true" />
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
            <div
              v-if="view.artifacts.length"
              class="task-progress-dialog__artifacts"
            >
              <button
                type="button"
                class="task-progress-dialog__artifact-toggle"
                :aria-expanded="isExpanded(view.stage?.stageId)"
                @click="
                  view.stage && emit('toggle-artifacts', view.stage.stageId)
                "
              >
                <span>产物 {{ view.artifacts.length }} 个</span>
                <el-icon
                  :class="{ 'is-expanded': isExpanded(view.stage?.stageId) }"
                >
                  <ArrowDown />
                </el-icon>
              </button>
              <div
                v-if="view.stage && isExpanded(view.stage.stageId)"
                class="task-progress-dialog__artifact-list"
              >
                <div
                  v-for="artifact in view.artifacts"
                  :key="`${artifact.stageId}-${artifact.type}-${artifact.uri}`"
                  class="task-progress-dialog__artifact"
                >
                  <div>
                    <code :title="artifactName(artifact)">{{
                      artifactName(artifact)
                    }}</code>
                    <small
                      >{{ artifactPresentation(artifact).kind }} ·
                      {{ artifactPresentation(artifact).sizeLabel }} ·
                      {{ artifactPresentation(artifact).retentionLabel }}</small
                    >
                  </div>
                  <el-button
                    v-if="isPreviewable(artifact)"
                    text
                    type="primary"
                    :loading="previewingArtifact === artifact"
                    @click="emit('preview-artifact', artifact)"
                    >查看</el-button
                  >
                  <el-button
                    v-else
                    text
                    type="primary"
                    :loading="downloadingArtifact === artifact"
                    :disabled="artifact.downloadable === false"
                    @click="emit('download-artifact', artifact)"
                    >下载</el-button
                  >
                </div>
              </div>
            </div>
          </div>
          <div
            class="task-progress-dialog__stage-actions"
            aria-label="阶段产物操作"
          >
            <el-tooltip
              :content="
                previewableArtifact(view)
                  ? '查看可预览产物'
                  : '当前阶段没有可直接查看的产物'
              "
              placement="top"
              effect="light"
            >
              <span>
                <el-button
                  circle
                  text
                  type="primary"
                  aria-label="查看阶段产物"
                  :loading="previewingArtifact === previewableArtifact(view)"
                  :disabled="!previewableArtifact(view)"
                  @click="previewStageArtifact(view)"
                >
                  <el-icon><View /></el-icon>
                </el-button>
              </span>
            </el-tooltip>
            <el-tooltip
              :content="
                downloadableArtifact(view)
                  ? '下载阶段产物'
                  : '当前阶段没有可下载的产物'
              "
              placement="top"
              effect="light"
            >
              <span>
                <el-button
                  circle
                  text
                  type="primary"
                  aria-label="下载阶段产物"
                  :loading="downloadingArtifact === downloadableArtifact(view)"
                  :disabled="!downloadableArtifact(view)"
                  @click="downloadStageArtifact(view)"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
              </span>
            </el-tooltip>
            <el-tooltip
              :content="
                isStageDetailExpanded(view) ? '收起处理说明' : '展开处理说明'
              "
              placement="top"
              effect="light"
            >
              <el-button
                circle
                text
                aria-label="展开阶段处理说明"
                class="task-progress-dialog__stage-details-toggle"
                :aria-expanded="isStageDetailExpanded(view)"
                :aria-controls="stageDetailId(view)"
                @click="toggleStageDetails(view)"
              >
                <el-icon
                  :class="{ 'is-expanded': isStageDetailExpanded(view) }"
                >
                  <ArrowDown />
                </el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div
            v-if="isStageDetailExpanded(view)"
            :id="stageDetailId(view)"
            class="task-progress-dialog__stage-details"
          >
            <strong>处理说明</strong>
            <p>{{ stageDetailHint(view) }}</p>
          </div>
          <el-button
            v-if="view.stage && canRetry(view.stage.status)"
            text
            type="warning"
            :disabled="isBusy"
            @click="emit('retry-stage', view.stage.stageId)"
            >重试</el-button
          >
        </article>
      </div>
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
          :loading="isDownloadingResult"
          @click="emit('download-result')"
        >
          <el-icon v-if="!isDownloadingResult"><Download /></el-icon>
          {{ isDownloadingResult ? "正在准备 ZIP" : "下载最终 ZIP" }}
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
import { ArrowDown, Download, View } from "@element-plus/icons-vue";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage,
  ProcessingIdentifier,
  ProcessingLifecycleStatus
} from "@/api/multiSourceSatellite";
import {
  processingStepStatusLabel,
  formatStageDuration,
  artifactPresentation,
  type ProcessingStepViewStatus,
  type RuntimeStageView
} from "@/features/multisource/processingRunState";

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
  canRetry: (status: string) => boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "toggle-artifacts": [stageId: ExecutionProgressStage["stageId"]];
  "preview-artifact": [artifact: ExecutionProgressArtifact];
  "download-artifact": [artifact: ExecutionProgressArtifact];
  "retry-stage": [stageId: ProcessingIdentifier];
  cancel: [];
  "download-result": [];
  reset: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value)
});
const expandedStageDetailKeys = ref<string[]>([]);

const STAGE_DETAIL_HINTS: Record<string, string> = {
  "upload-validation":
    "检查产品包完整性、文件类型与命名匹配关系，完成后才会进入后续处理。",
  "feature-extraction":
    "在标准产品基础上计算统计、梯度和局部纹理等特征，详细指标由参数工作台配置。",
  "rgb-fusion": "按选定红、绿、蓝通道生成彩色合成结果，并应用设定的显示拉伸。",
  "anomaly-detection":
    "基于已选波段或派生特征识别局部显著变化，阈值和邻域窗口可在参数工作台调整。",
  "along-track-feature-extraction":
    "沿轨计算高度计观测的统计与变化特征，为后续专题处理提供输入。",
  "track-gridding": "将沿轨观测转换为规则空间网格，便于地图浏览和区域比较。",
  "map-preview": "生成适合在地图中快速浏览的专题结果图层。"
};

const progressPercent = computed(() =>
  Math.max(0, Math.min(100, Math.round(props.progressPercent)))
);

function statusLabel(status: ProcessingStepViewStatus) {
  return processingStepStatusLabel(status);
}

function isExpanded(stageId?: ProcessingIdentifier) {
  return (
    stageId !== undefined && props.expandedArtifactStageIds.includes(stageId)
  );
}

function previewableArtifact(view: RuntimeStageView) {
  return view.artifacts.find(artifact => props.isPreviewable(artifact));
}

function downloadableArtifact(view: RuntimeStageView) {
  return view.artifacts.find(artifact => artifact.downloadable !== false);
}

function previewStageArtifact(view: RuntimeStageView) {
  const artifact = previewableArtifact(view);
  if (artifact) emit("preview-artifact", artifact);
}

function downloadStageArtifact(view: RuntimeStageView) {
  const artifact = downloadableArtifact(view);
  if (artifact) emit("download-artifact", artifact);
}

function isTopicStage(view: RuntimeStageView) {
  return view.step.kind === "target";
}

function stageDetailKey(view: RuntimeStageView) {
  return String(props.runtimeKey(view));
}

function stageDetailId(view: RuntimeStageView) {
  return `task-progress-detail-${stageDetailKey(view).replace(/[^a-z0-9_-]/gi, "-")}`;
}

function isStageDetailExpanded(view: RuntimeStageView) {
  return expandedStageDetailKeys.value.includes(stageDetailKey(view));
}

function toggleStageDetails(view: RuntimeStageView) {
  const key = stageDetailKey(view);
  expandedStageDetailKeys.value = isStageDetailExpanded(view)
    ? expandedStageDetailKeys.value.filter(value => value !== key)
    : [...expandedStageDetailKeys.value, key];
}

function stageDetailHint(view: RuntimeStageView) {
  return (
    STAGE_DETAIL_HINTS[view.step.key] ||
    (isTopicStage(view)
      ? "该专题处理将在前置标准产品完成后执行，详细过程提示将在此处展示。"
      : "该预处理阶段完成后将自动衔接下一步骤，详细过程提示将在此处展示。")
  );
}
</script>

<style scoped lang="less">
.task-progress-dialog__heading,
.task-progress-dialog__summary,
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
  padding: 13px 16px 11px;
  margin-right: 0;
  border-bottom: 1px solid #d8e6ec;
}

:global(.task-progress-dialog .el-dialog__body) {
  padding: 12px 16px 14px;
}

:global(.task-progress-dialog .el-dialog__footer) {
  padding: 10px 16px 14px;
  border-top: 1px solid #e1ebef;
}

.task-progress-dialog__heading,
.task-progress-dialog__summary,
.task-progress-dialog__footer {
  justify-content: space-between;
}

.task-progress-dialog__heading strong {
  color: #243746;
  font-size: 16px;
}

.task-progress-dialog__status {
  padding: 3px 8px;
  color: #2e718d;
  font-size: 12px;
  background: #edf7fa;
  border: 1px solid #c7e3ea;
  border-radius: 4px;
}

.task-progress-dialog__status.is-success {
  color: #267451;
  background: #eff9f3;
  border-color: #b9daca;
}

.task-progress-dialog__status.is-danger {
  color: #a13f3f;
  background: #fff4f4;
  border-color: #e3b9b9;
}

.task-progress-dialog__summary {
  color: #405665;
}

.task-progress-dialog__summary-copy {
  display: grid;
  gap: 4px;
}

.task-progress-dialog__summary-copy strong {
  color: #243746;
  font-size: 14px;
}

.task-progress-dialog__summary-copy span {
  color: #71838e;
  font-size: 12px;
}

.task-progress-dialog__percent {
  color: #2e718d;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.task-progress-dialog__progress-track {
  height: 8px;
  margin: 10px 0 14px;
  overflow: hidden;
  background: #e8eef1;
  border-radius: 4px;
}

.task-progress-dialog__progress-track span {
  display: block;
  height: 100%;
  background: #2e7da3;
  transition: width 180ms ease;
}

.task-progress-dialog__current {
  display: flex;
  gap: 10px;
  padding: 11px 12px;
  margin-bottom: 12px;
  background: #f4f9fc;
  border: 1px solid #cfe1e9;
  border-radius: 5px;
}

.task-progress-dialog__current-dot,
.task-progress-dialog__stage-marker {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 5px;
  background: #9eafb8;
  border-radius: 50%;
}

.task-progress-dialog__stage-marker {
  align-self: center;
  margin-top: 0;
}

.task-progress-dialog__current-dot.is-success,
.task-progress-dialog__stage.is-succeeded .task-progress-dialog__stage-marker {
  background: #338467;
}

.task-progress-dialog__current-dot.is-danger,
.task-progress-dialog__stage.is-failed .task-progress-dialog__stage-marker {
  background: #b44c4c;
}

.task-progress-dialog__current-dot.is-running,
.task-progress-dialog__stage.is-processing .task-progress-dialog__stage-marker {
  background: #2e7da3;
}

.task-progress-dialog__stage.is-needs_rerun
  .task-progress-dialog__stage-marker {
  background: #b5792d;
}

.task-progress-dialog__current div {
  display: grid;
  gap: 3px;
}

.task-progress-dialog__current small,
.task-progress-dialog__current span,
.task-progress-dialog__current time,
.task-progress-dialog__stage p,
.task-progress-dialog__time,
.task-progress-dialog__artifact small {
  color: #71838e;
  font-size: 11px;
  line-height: 1.4;
}

.task-progress-dialog__current strong {
  color: #243746;
  font-size: 14px;
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

.task-progress-dialog__stage.is-processing {
  background: #f0f8fc;
  border-color: #8abed9;
}

.task-progress-dialog__stage.is-topic {
  background: #f2fbfd;
  border-color: #b8dce6;
  box-shadow: inset 3px 0 0 #3093ad;
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

.task-progress-dialog__artifacts {
  grid-column: 1 / -1;
  margin-top: 7px;
}

.task-progress-dialog__stage-details {
  display: grid;
  grid-column: 2 / -1;
  grid-template-columns: 60px minmax(0, 1fr);
  gap: 8px;
  padding: 7px 9px;
  margin-top: -2px;
  color: #5f7783;
  background: #f5f9fa;
  border: 1px solid #dce8ed;
  border-radius: 3px;
}

.task-progress-dialog__stage-details strong {
  color: #45616e;
  font-size: 11px;
  font-weight: 600;
}

.task-progress-dialog__stage-details p {
  min-width: 0;
  margin: 0;
  color: inherit;
  font-size: 11px;
  line-height: 1.45;
}

.task-progress-dialog__stage.is-topic .task-progress-dialog__stage-details {
  color: #387182;
  background: #eaf7fa;
  border-color: #b9dce6;
}

.task-progress-dialog__stage-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  padding-top: 1px;
}

.task-progress-dialog__stage-actions > span {
  display: inline-flex;
}

.task-progress-dialog__stage-actions :deep(.el-button) {
  width: 28px;
  height: 28px;
  margin: 0;
  color: #0f5f78;
  background: #e7f4f7;
  border: 1px solid #91c5d5;
}

.task-progress-dialog__stage-actions
  :deep(
    .el-button:not(.is-disabled):not(
        .task-progress-dialog__stage-details-toggle
      ):hover
  ) {
  color: #074e65;
  background: #d6edf3;
  border-color: #5fa6bd;
}

.task-progress-dialog__stage-actions :deep(.el-button.is-disabled) {
  color: #527481;
  background: #edf4f6;
  border-color: #b4cbd3;
}

.task-progress-dialog__stage-actions
  :deep(.task-progress-dialog__stage-details-toggle) {
  color: #607b88;
  background: transparent;
  border-color: transparent;
}

.task-progress-dialog__stage-actions
  :deep(.task-progress-dialog__stage-details-toggle:hover) {
  color: #176b84;
  background: #e7f4f7;
  border-color: #b9dce6;
}

.task-progress-dialog__stage-details-toggle .el-icon {
  transition: transform 150ms ease;
}

.task-progress-dialog__stage-details-toggle .el-icon.is-expanded {
  transform: rotate(180deg);
}

.task-progress-dialog__stage.is-succeeded
  .task-progress-dialog__stage-actions
  :deep(
    .el-button:not(.is-disabled):not(
        .task-progress-dialog__stage-details-toggle
      )
  ) {
  color: #176446;
  background: #e4f4eb;
  border-color: #8fc8a7;
}

.task-progress-dialog__stage.is-succeeded
  .task-progress-dialog__stage-actions
  :deep(
    .el-button:not(.is-disabled):not(
        .task-progress-dialog__stage-details-toggle
      ):hover
  ) {
  color: #0e5338;
  background: #d4eddf;
  border-color: #61a985;
}

.task-progress-dialog__artifact-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 5px;
  color: #2e718d;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
}

.task-progress-dialog__artifact-toggle:hover {
  background: #edf7fa;
  border-color: #c7e3ea;
}

.task-progress-dialog__artifact-toggle:focus-visible,
.task-progress-dialog__footer :deep(.el-button):focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.task-progress-dialog__artifact-toggle .el-icon {
  transition: transform 150ms ease;
}

.task-progress-dialog__artifact-toggle .el-icon.is-expanded {
  transform: rotate(180deg);
}

.task-progress-dialog__artifact-list {
  display: grid;
  gap: 4px;
  padding: 5px 0 0 8px;
}

.task-progress-dialog__artifact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.task-progress-dialog__artifact > div {
  display: grid;
  min-width: 0;
}

.task-progress-dialog__artifact code {
  overflow: hidden;
  color: #405665;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__footer-spacer {
  flex: 1;
}

@media (max-width: 560px) {
  .task-progress-dialog__stage-body {
    grid-template-columns: minmax(112px, 1fr) minmax(0, 1fr);
  }

  .task-progress-dialog__stage-meta {
    grid-column: 1 / -1;
  }

  .task-progress-dialog__stage-details {
    grid-template-columns: 1fr;
    gap: 3px;
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
  .task-progress-dialog__progress-track span,
  .task-progress-dialog__artifact-toggle .el-icon {
    transition: none;
  }
}
</style>
