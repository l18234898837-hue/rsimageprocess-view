<template>
  <el-dialog
    v-model="visible"
    class="task-history-dialog"
    width="min(1220px, calc(100vw - 32px))"
    append-to-body
    :close-on-click-modal="false"
    destroy-on-close
    aria-labelledby="task-history-dialog-title"
  >
    <template #header>
      <div class="task-history-dialog__heading">
        <div>
          <strong id="task-history-dialog-title">历史任务与产物</strong>
          <small>查看、下载和管理已完成任务的产物</small>
        </div>
        <dl v-if="storageSummary" class="task-history-dialog__storage">
          <div>
            <dt>可用产物</dt>
            <dd>{{ storageSummary.availableArtifactCount }} 个</dd>
          </div>
          <div>
            <dt>回收站占用</dt>
            <dd>{{ formatBytes(storageSummary.recycleBinBytes) }}</dd>
          </div>
          <div>
            <dt>估算总占用</dt>
            <dd>{{ formatBytes(storageSummary.totalArtifactBytes) }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <div class="task-history-dialog__filters" aria-label="历史任务筛选">
      <el-input
        v-model="filters.productCode"
        clearable
        placeholder="卫星 / 产品类型"
        @keyup.enter="loadHistory"
      />
      <el-select v-model="filters.lifecycle" clearable placeholder="任务状态">
        <el-option
          v-for="status in lifecycleOptions"
          :key="status"
          :label="lifecycleLabel(status)"
          :value="status"
        />
      </el-select>
      <el-date-picker
        v-model="completedRange"
        type="daterange"
        value-format="YYYY-MM-DDTHH:mm:ss"
        range-separator="至"
        start-placeholder="完成开始时间"
        end-placeholder="完成结束时间"
      />
      <el-select v-model="filters.retention" clearable placeholder="产物状态">
        <el-option
          v-for="status in retentionOptions"
          :key="status"
          :label="retentionLabel(status)"
          :value="status"
        />
      </el-select>
      <el-button type="primary" :loading="isLoading" @click="loadHistory"
        >查询</el-button
      >
    </div>

    <div class="task-history-dialog__content">
      <section class="task-history-dialog__list" aria-label="历史任务列表">
        <div class="task-history-dialog__list-heading">
          <span>共 {{ total }} 个任务</span>
          <small>仅显示当前用户创建的任务</small>
        </div>
        <div v-if="isLoading" class="task-history-dialog__empty" role="status">
          正在加载历史任务…
        </div>
        <div
          v-else-if="!items.length"
          class="task-history-dialog__empty"
          role="status"
        >
          没有符合筛选条件的历史任务。
        </div>
        <div v-else class="task-history-dialog__table-wrap">
          <table class="task-history-dialog__table">
            <thead>
              <tr>
                <th scope="col">任务</th>
                <th scope="col">产品</th>
                <th scope="col">完成时间</th>
                <th scope="col">状态</th>
                <th scope="col">产物</th>
                <th scope="col">占用</th>
                <th scope="col">保留状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="String(item.taskId)"
                :class="{ 'is-selected': selectedTask?.taskId === item.taskId }"
                tabindex="0"
                @click="selectTask(item)"
                @keydown.enter.prevent="selectTask(item)"
                @keydown.space.prevent="selectTask(item)"
              >
                <td>
                  <strong :title="item.taskName">{{ item.taskName }}</strong>
                  <small>{{ item.taskNo }}</small>
                </td>
                <td>{{ item.productCodes.join(" / ") || "—" }}</td>
                <td>{{ formatDate(item.completedAt) }}</td>
                <td>
                  <span class="task-history-dialog__tag is-lifecycle">
                    {{ lifecycleLabel(item.lifecycleStatus) }}
                  </span>
                </td>
                <td>{{ item.artifactCount }} 个</td>
                <td>{{ formatBytes(item.artifactSizeBytes) }}</td>
                <td>
                  <span
                    class="task-history-dialog__tag"
                    :class="`is-${item.retentionStatus.toLowerCase()}`"
                  >
                    {{ retentionLabel(item.retentionStatus) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="task-history-dialog__pagination">
          <el-button :disabled="page <= 1 || isLoading" @click="changePage(-1)"
            >上一页</el-button
          >
          <span>第 {{ page }} 页</span>
          <el-button
            :disabled="page * pageSize >= total || isLoading"
            @click="changePage(1)"
            >下一页</el-button
          >
        </div>
      </section>

      <aside class="task-history-dialog__detail" aria-label="任务产物详情">
        <div v-if="!selectedTask" class="task-history-dialog__detail-empty">
          <strong>选择一个历史任务</strong>
          <span>可查看任务产物、质量报告和保留状态。</span>
        </div>
        <template v-else>
          <header class="task-history-dialog__detail-heading">
            <div>
              <strong :title="selectedTask.taskName">{{
                selectedTask.taskName
              }}</strong>
              <small>{{ selectedTask.taskNo }}</small>
            </div>
            <span
              class="task-history-dialog__tag"
              :class="`is-${selectedRetentionStatus.toLowerCase()}`"
              >{{ retentionLabel(selectedRetentionStatus) }}</span
            >
          </header>
          <p v-if="selectedActions.reason" class="task-history-dialog__notice">
            {{ selectedActions.reason }}
          </p>
          <div class="task-history-dialog__detail-meta">
            <span
              >产物总大小
              <strong>{{ formatBytes(selectedArtifactSize) }}</strong></span
            >
            <span
              >清理时间 <strong>{{ cleanupTime }}</strong></span
            >
          </div>
          <div class="task-history-dialog__task-actions">
            <el-button
              v-if="selectedActions.canPin"
              size="small"
              :loading="isRetentionChanging"
              @click="changeRetention('PIN')"
              >长期保留</el-button
            >
            <el-button
              v-if="selectedActions.canRecycle"
              size="small"
              type="warning"
              :loading="isRetentionChanging"
              @click="recycleTask"
              >移入回收站</el-button
            >
            <el-button
              v-if="selectedActions.canRestore"
              size="small"
              type="success"
              :loading="isRetentionChanging"
              @click="changeRetention('RESTORE')"
              >恢复产物</el-button
            >
            <el-button
              v-if="selectedActions.canPurge"
              size="small"
              type="danger"
              :loading="isRetentionChanging"
              @click="purgeTask"
              >{{
                selectedRetentionStatus === "PURGE_FAILED"
                  ? "重试永久删除"
                  : "永久删除"
              }}</el-button
            >
            <el-tooltip :content="selectedActions.reason || '下载全部产物 ZIP'">
              <span>
                <el-button
                  size="small"
                  type="primary"
                  :disabled="!selectedActions.canDownload"
                  @click="
                    emit(
                      'download-result',
                      selectedTask.taskId,
                      selectedTask.taskNo
                    )
                  "
                  >下载全部 ZIP</el-button
                >
              </span>
            </el-tooltip>
            <el-tooltip :content="selectedActions.reason || '查看质量报告'">
              <span>
                <el-button
                  size="small"
                  :disabled="!selectedActions.canDownload"
                  @click="emit('view-quality-report', selectedTask.taskId)"
                  >查看质量报告</el-button
                >
              </span>
            </el-tooltip>
            <el-tooltip :content="selectedActions.reason || '下载质量报告'">
              <span>
                <el-button
                  size="small"
                  :disabled="!selectedActions.canDownload"
                  @click="emit('download-quality-report', selectedTask.taskId)"
                  >下载报告</el-button
                >
              </span>
            </el-tooltip>
          </div>

          <div
            v-if="isDetailLoading"
            class="task-history-dialog__empty"
            role="status"
          >
            正在加载任务详情…
          </div>
          <p v-else-if="detailError" class="task-history-dialog__detail-error">
            {{ detailError }}
          </p>
          <section v-else class="task-history-dialog__artifacts">
            <div class="task-history-dialog__subheading">
              <strong>任务阶段</strong>
              <span
                >{{
                  selectedProgress?.stages.length ??
                  detail?.detail.stages.length ??
                  0
                }}
                个</span
              >
            </div>
            <ol class="task-history-dialog__stages">
              <li v-for="stage in selectedStages" :key="String(stage.stageId)">
                <strong>{{ stage.stageCode || stage.stageKey }}</strong>
                <span>{{ stage.status }}</span>
              </li>
            </ol>
            <div class="task-history-dialog__subheading">
              <strong>产物</strong>
              <span>{{ selectedArtifacts.length }} 个</span>
            </div>
            <p
              v-if="!selectedArtifacts.length"
              class="task-history-dialog__artifact-empty"
            >
              {{ selectedActions.reason || "该任务没有可展示的产物。" }}
            </p>
            <article
              v-for="artifact in selectedArtifacts"
              :key="`${artifact.stageId}-${artifact.type}-${artifact.uri}`"
              class="task-history-dialog__artifact"
            >
              <div>
                <strong :title="artifactName(artifact)">{{
                  artifactName(artifact)
                }}</strong>
                <small
                  >{{ artifact.format || artifact.type }} ·
                  {{ formatBytes(artifact.sizeBytes || 0) }}</small
                >
              </div>
              <div class="task-history-dialog__artifact-actions">
                <el-tooltip :content="selectedActions.reason || '查看产物'">
                  <span>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="!selectedActions.canPreview"
                      @click="openArtifact(artifact)"
                      >查看</el-button
                    >
                  </span>
                </el-tooltip>
                <el-tooltip :content="selectedActions.reason || '下载产物'">
                  <span>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="
                        !selectedActions.canDownload ||
                        artifact.downloadable === false
                      "
                      @click="
                        emit('download-artifact', selectedTask.taskId, artifact)
                      "
                      >下载</el-button
                    >
                  </span>
                </el-tooltip>
              </div>
            </article>
          </section>
        </template>
      </aside>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import {
  changeProcessingTaskArtifactRetention,
  getProcessingProgress,
  getProcessingStorageSummary,
  getProcessingTaskHistory,
  getProcessingTaskHistoryDetail,
  purgeProcessingTaskArtifacts,
  type ArtifactRetentionOperation,
  type ExecutionProgressArtifact,
  type ExecutionProgressResponse,
  type ProcessingIdentifier,
  type ProcessingLifecycleStatus,
  type ProcessingStorageSummaryResponse,
  type TaskArtifactRetentionStatus,
  type TaskHistoryDetailResponse,
  type TaskHistoryItem,
  type TaskHistoryQueryParams
} from "@/api/multiSourceSatellite";
import {
  artifactActionsEnabled,
  historyActions
} from "@/features/multisource/taskHistory";
import { resolveArtifactView } from "@/features/multisource/artifactCapabilities";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "preview-artifact": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "download-artifact": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "download-result": [taskId: ProcessingIdentifier, taskNo: string];
  "show-artifact-on-map": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "view-quality-report": [taskId: ProcessingIdentifier];
  "download-quality-report": [taskId: ProcessingIdentifier];
}>();

const lifecycleOptions: ProcessingLifecycleStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELED"
];
const retentionOptions: TaskArtifactRetentionStatus[] = [
  "AVAILABLE",
  "PINNED",
  "RECYCLE_BIN",
  "PURGING",
  "PURGE_FAILED",
  "PURGED",
  "MISSING"
];

const filters = reactive<{
  productCode: string;
  lifecycle?: ProcessingLifecycleStatus;
  retention?: TaskArtifactRetentionStatus;
}>({
  productCode: "",
  lifecycle: undefined,
  retention: undefined
});
const completedRange = ref<string[]>([]);
const items = ref<TaskHistoryItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const selectedTask = ref<TaskHistoryItem>();
const detail = ref<TaskHistoryDetailResponse>();
const selectedProgress = ref<ExecutionProgressResponse>();
const storageSummary = ref<ProcessingStorageSummaryResponse>();
const isLoading = ref(false);
const isDetailLoading = ref(false);
const isRetentionChanging = ref(false);
const detailError = ref("");

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value)
});
const selectedRetentionStatus = computed<TaskArtifactRetentionStatus>(
  () =>
    detail.value?.retention.status ??
    selectedTask.value?.retentionStatus ??
    "MISSING"
);
const selectedActions = computed(() =>
  historyActions(selectedRetentionStatus.value)
);
const selectedArtifactSize = computed(
  () =>
    detail.value?.artifactSizeBytes ??
    selectedTask.value?.artifactSizeBytes ??
    0
);
const selectedStages = computed(
  () => selectedProgress.value?.stages ?? detail.value?.detail.stages ?? []
);
const selectedArtifacts = computed(
  () =>
    selectedProgress.value?.artifacts ?? detail.value?.detail.artifacts ?? []
);
const cleanupTime = computed(() => {
  const retention = detail.value?.retention;
  return formatDate(
    retention?.purgedAt || retention?.purgeStartedAt || retention?.recycledAt
  );
});

watch(
  () => props.modelValue,
  open => {
    if (open) void refresh();
  }
);

function responseData<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("后端响应缺少数据");
  return response.data;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function lifecycleLabel(status: ProcessingLifecycleStatus): string {
  return {
    CREATED: "已创建",
    RUNNING: "执行中",
    RECOVERY_PENDING: "等待恢复",
    SUCCEEDED: "已完成",
    FAILED: "执行失败",
    CANCELED: "已取消"
  }[status];
}

function retentionLabel(status: TaskArtifactRetentionStatus): string {
  return {
    AVAILABLE: "可用",
    PINNED: "长期保留",
    RECYCLE_BIN: "回收站",
    PURGING: "清理中",
    PURGE_FAILED: "清理失败",
    PURGED: "已永久删除",
    MISSING: "文件缺失"
  }[status];
}

function artifactName(artifact: ExecutionProgressArtifact): string {
  return artifact.displayName || artifact.uri.split("/").pop() || artifact.type;
}

function historyQuery(): TaskHistoryQueryParams {
  return {
    productCode: filters.productCode.trim() || undefined,
    lifecycle: filters.lifecycle,
    completedFrom: completedRange.value[0] || undefined,
    completedTo: completedRange.value[1] || undefined,
    retention: filters.retention,
    page: page.value,
    pageSize
  };
}

async function loadHistory() {
  isLoading.value = true;
  try {
    const result = responseData(await getProcessingTaskHistory(historyQuery()));
    items.value = result.items;
    total.value = result.total;
    if (
      selectedTask.value &&
      !items.value.some(item => item.taskId === selectedTask.value?.taskId)
    ) {
      selectedTask.value = undefined;
      detail.value = undefined;
      selectedProgress.value = undefined;
    }
  } catch (error) {
    message(error instanceof Error ? error.message : "历史任务加载失败", {
      type: "error"
    });
  } finally {
    isLoading.value = false;
  }
}

async function loadStorageSummary() {
  try {
    storageSummary.value = responseData(await getProcessingStorageSummary());
  } catch {
    storageSummary.value = undefined;
  }
}

async function refresh() {
  await Promise.all([loadHistory(), loadStorageSummary()]);
}

async function selectTask(task: TaskHistoryItem) {
  selectedTask.value = task;
  detail.value = undefined;
  selectedProgress.value = undefined;
  detailError.value = "";
  isDetailLoading.value = true;
  try {
    const nextDetail = responseData(
      await getProcessingTaskHistoryDetail(task.taskId)
    );
    detail.value = nextDetail;
    if (artifactActionsEnabled(nextDetail.retention.status)) {
      selectedProgress.value = responseData(
        await getProcessingProgress(task.taskId)
      );
    }
  } catch (error) {
    detailError.value =
      error instanceof Error ? error.message : "任务详情加载失败";
  } finally {
    isDetailLoading.value = false;
  }
}

async function refreshSelectedTask() {
  const currentTaskId = selectedTask.value?.taskId;
  await refresh();
  if (currentTaskId === undefined) return;
  const updated = items.value.find(item => item.taskId === currentTaskId);
  if (updated) await selectTask(updated);
}

function changePage(delta: number) {
  page.value = Math.max(1, page.value + delta);
  void loadHistory();
}

async function changeRetention(operation: ArtifactRetentionOperation) {
  if (!selectedTask.value || isRetentionChanging.value) return;
  isRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskArtifactRetention(
        selectedTask.value.taskId,
        operation
      )
    );
    message(operation === "PIN" ? "任务产物已长期保留" : "任务产物已恢复", {
      type: "success"
    });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "产物状态更新失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

async function recycleTask() {
  if (!selectedTask.value || isRetentionChanging.value) return;
  try {
    await ElMessageBox.confirm(
      "移入回收站后将立即禁用该任务的查看和下载，可在保留期内恢复。",
      "移入回收站",
      {
        confirmButtonText: "移入回收站",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }
  isRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskArtifactRetention(
        selectedTask.value.taskId,
        "RECYCLE"
      )
    );
    message("任务产物已移入回收站", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "移入回收站失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

async function purgeTask() {
  if (!selectedTask.value || isRetentionChanging.value) return;
  const target = selectedTask.value;
  let input: string;
  try {
    const result = await ElMessageBox.prompt(
      `请输入任务编号 ${target.taskNo} 以确认永久删除。该操作会异步清理该任务的全部输出和预览缓存，无法恢复。`,
      "永久删除任务产物",
      {
        confirmButtonText: "永久删除",
        cancelButtonText: "取消",
        inputPlaceholder: target.taskNo,
        inputValue: "",
        inputPattern: new RegExp(`^${escapeRegExp(target.taskNo)}$`),
        inputErrorMessage: "任务编号不匹配"
      }
    );
    input = result.value.trim();
  } catch {
    return;
  }
  if (input !== target.taskNo) return;
  isRetentionChanging.value = true;
  try {
    responseData(await purgeProcessingTaskArtifacts(target.taskId, input));
    message("已提交永久清理任务", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "永久清理提交失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openArtifact(artifact: ExecutionProgressArtifact) {
  if (!selectedTask.value || !selectedActions.value.canPreview) return;
  if (resolveArtifactView(artifact).mode === "map") {
    emit("show-artifact-on-map", selectedTask.value.taskId, artifact);
  } else {
    emit("preview-artifact", selectedTask.value.taskId, artifact);
  }
}
</script>

<style>
.task-history-dialog .el-dialog__header {
  padding: 18px 22px 14px;
  margin-right: 0;
  background: linear-gradient(110deg, #e9f6fb 0%, #f7fbfd 58%, #fff 100%);
  border-bottom: 1px solid #c8dce5;
}

.task-history-dialog .el-dialog__body {
  padding: 16px 22px 22px;
}

.task-history-dialog__heading,
.task-history-dialog__heading > div,
.task-history-dialog__storage,
.task-history-dialog__storage div,
.task-history-dialog__detail-heading,
.task-history-dialog__detail-heading > div,
.task-history-dialog__artifact,
.task-history-dialog__artifact > div,
.task-history-dialog__list-heading,
.task-history-dialog__subheading,
.task-history-dialog__pagination,
.task-history-dialog__detail-meta,
.task-history-dialog__task-actions,
.task-history-dialog__artifact-actions {
  display: flex;
}

.task-history-dialog__heading,
.task-history-dialog__detail-heading,
.task-history-dialog__list-heading,
.task-history-dialog__subheading,
.task-history-dialog__pagination,
.task-history-dialog__artifact {
  align-items: center;
  justify-content: space-between;
}

.task-history-dialog__heading {
  gap: 24px;
}

.task-history-dialog__heading > div,
.task-history-dialog__detail-heading > div,
.task-history-dialog__artifact > div {
  flex-direction: column;
  min-width: 0;
}

.task-history-dialog__heading strong {
  font-size: 18px;
  color: #153a51;
}

.task-history-dialog__heading small {
  margin-top: 4px;
  font-size: 12px;
  color: #617c8c;
}

.task-history-dialog__storage {
  flex: 0 0 auto;
  gap: 18px;
}

.task-history-dialog__storage div {
  flex-direction: column;
  min-width: 78px;
  padding-left: 14px;
  border-left: 1px solid #c6dce6;
}

.task-history-dialog__storage dt {
  font-size: 11px;
  color: #6b8593;
}

.task-history-dialog__storage dd {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #153a51;
}

.task-history-dialog__filters {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 118px minmax(230px, 1.35fr) 126px auto;
  gap: 10px;
  margin-bottom: 14px;
}

.task-history-dialog__content {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  min-height: 510px;
  border: 1px solid #d2e1e7;
}

.task-history-dialog__list {
  min-width: 0;
  padding: 14px;
  background: #fbfdfe;
  border-right: 1px solid #d2e1e7;
}

.task-history-dialog__list-heading {
  margin-bottom: 10px;
  font-size: 12px;
  color: #365566;
}

.task-history-dialog__list-heading small,
.task-history-dialog__artifact small,
.task-history-dialog__detail-heading small {
  font-size: 11px;
  color: #6e8490;
}

.task-history-dialog__table-wrap {
  overflow: auto;
}

.task-history-dialog__table {
  width: 100%;
  min-width: 655px;
  font-size: 12px;
  color: #2b4b5b;
  border-collapse: collapse;
}

.task-history-dialog__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 9px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #557383;
  text-align: left;
  white-space: nowrap;
  background: #edf5f8;
}

.task-history-dialog__table td {
  padding: 10px 8px;
  border-bottom: 1px solid #e3edf1;
}

.task-history-dialog__table tbody tr {
  cursor: pointer;
}

.task-history-dialog__table tbody tr:hover,
.task-history-dialog__table tbody tr:focus-visible,
.task-history-dialog__table tbody tr.is-selected {
  background: #e4f5fb;
  outline: none;
}

.task-history-dialog__table strong,
.task-history-dialog__table small {
  display: block;
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-history-dialog__table small {
  margin-top: 3px;
  color: #79909b;
}

.task-history-dialog__tag {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 0 7px;
  font-size: 11px;
  color: #326175;
  white-space: nowrap;
  background: #e8f1f4;
  border-radius: 3px;
}

.task-history-dialog__tag.is-lifecycle,
.task-history-dialog__tag.is-available {
  color: #1e6b68;
  background: #dcf1ed;
}

.task-history-dialog__tag.is-pinned {
  color: #68550b;
  background: #fff1bd;
}

.task-history-dialog__tag.is-recycle_bin {
  color: #9a5d13;
  background: #fff0dd;
}

.task-history-dialog__tag.is-purging {
  color: #47667c;
  background: #e3edf3;
}

.task-history-dialog__tag.is-purge_failed,
.task-history-dialog__tag.is-purged,
.task-history-dialog__tag.is-missing {
  color: #8a3d3d;
  background: #fbe4e4;
}

.task-history-dialog__pagination {
  gap: 9px;
  margin-top: 12px;
  font-size: 12px;
  color: #607986;
}

.task-history-dialog__detail {
  min-width: 0;
  padding: 16px;
  background: #fff;
}

.task-history-dialog__detail-empty,
.task-history-dialog__empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  font-size: 12px;
  color: #718994;
  text-align: center;
}

.task-history-dialog__detail-empty strong {
  color: #426477;
}

.task-history-dialog__notice,
.task-history-dialog__detail-error {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #845818;
  background: #fff8df;
  border-left: 3px solid #dba941;
}

.task-history-dialog__detail-error {
  color: #8d3e3e;
  background: #fff0f0;
  border-left-color: #c76666;
}

.task-history-dialog__detail-meta {
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 14px 0;
  font-size: 12px;
  color: #6d8490;
}

.task-history-dialog__detail-meta strong {
  margin-left: 4px;
  color: #35596b;
}

.task-history-dialog__task-actions {
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 16px;
}

.task-history-dialog__subheading {
  padding-bottom: 7px;
  margin-top: 16px;
  font-size: 12px;
  color: #36596a;
  border-bottom: 1px solid #dce8ed;
}

.task-history-dialog__subheading span {
  font-size: 11px;
  color: #748a95;
}

.task-history-dialog__stages {
  display: grid;
  gap: 5px;
  padding: 0;
  margin: 10px 0;
  list-style: none;
}

.task-history-dialog__stages li {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 7px 8px;
  font-size: 11px;
  color: #4a6878;
  background: #f5f9fa;
  border-left: 2px solid #77bad0;
}

.task-history-dialog__stages span {
  color: #6c8390;
}

.task-history-dialog__artifact {
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #e4edf1;
}

.task-history-dialog__artifact > div:first-child {
  flex: 1;
}

.task-history-dialog__artifact strong {
  overflow: hidden;
  font-size: 12px;
  color: #35596a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-history-dialog__artifact small {
  margin-top: 3px;
}

.task-history-dialog__artifact-actions {
  flex: 0 0 auto;
  gap: 2px;
}

.task-history-dialog__artifact-empty {
  margin: 12px 0;
  font-size: 12px;
  color: #738994;
}

@media (width <= 900px) {
  .task-history-dialog__filters {
    grid-template-columns: 1fr 1fr;
  }

  .task-history-dialog__content {
    grid-template-columns: 1fr;
  }

  .task-history-dialog__list {
    border-right: 0;
    border-bottom: 1px solid #d2e1e7;
  }

  .task-history-dialog__storage {
    display: none;
  }
}
</style>
