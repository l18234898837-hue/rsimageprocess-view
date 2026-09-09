<template>
  <el-dialog
    v-model="visible"
    class="task-progress-dialog"
    width="min(720px, calc(100vw - 32px))"
    append-to-body
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
          :class="`is-${view.status.toLowerCase()}`"
        >
          <span class="task-progress-dialog__stage-marker" aria-hidden="true" />
          <div class="task-progress-dialog__stage-body">
            <div class="task-progress-dialog__stage-heading">
              <strong>{{ stageTitle(view) }}</strong>
              <span>{{ statusLabel(view.status) }}</span>
            </div>
            <p>{{ stageDescription(view) }}</p>
            <small
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
            <time
              v-if="view.stage?.startedAt"
              class="task-progress-dialog__time"
            >
              {{ view.stage.startedAt }} →
              {{ view.stage.finishedAt || "运行中" }}
            </time>

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
import { computed } from "vue";
import { ArrowDown, Download } from "@element-plus/icons-vue";
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
  max-height: min(52vh, 430px);
  gap: 6px;
  padding-right: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.task-progress-dialog__stage {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 10px;
  background: #f8fbfc;
  border: 1px solid #d6e2e8;
  border-radius: 5px;
}

.task-progress-dialog__stage.is-processing {
  background: #f0f8fc;
  border-color: #8abed9;
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
  min-width: 0;
  flex: 1;
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
  color: #647585;
  font-size: 11px;
}

.task-progress-dialog__stage p {
  margin: 4px 0 0;
}

.task-progress-dialog__error {
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

.task-progress-dialog__time {
  display: block;
  margin-top: 5px;
}

.task-progress-dialog__artifacts {
  margin-top: 7px;
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
