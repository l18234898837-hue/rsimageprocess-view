import { computed, onBeforeUnmount, reactive, ref } from "vue";
import {
  cancelProcessingTask,
  createProcessingTask,
  downloadProcessingResult,
  getProcessingProgress,
  preflightProcessingTask,
  retryProcessingStage,
  startProcessingTask,
  uploadStaticFile,
  type ExecutionProgressResponse,
  type PreflightCandidate,
  type ProcessingAssetRequest,
  type ProcessingLifecycleStatus,
  type PreflightResponse
} from "@/api/multiSourceSatellite";
import {
  DEFAULT_PROCESS_SNAPSHOT,
  GF6_WFV_BROWSE_TEMPLATE,
  basenameWithoutExtension,
  validateProductFiles,
  type ProductFiles,
  type ProductFileSlot,
  type SlotId
} from "./productTemplates";

export type SlotStatus =
  | "EMPTY"
  | "SELECTED"
  | "UPLOADING"
  | "UPLOADED"
  | "FAILED";
export type TaskStatus = ProcessingLifecycleStatus;

const WORKER_ERROR_MESSAGES: Record<string, string> = {
  "文件授权已过期，请重新点击开始处理": "文件检查已过期，系统会自动重新检查",
  "Worker 执行失败，请稍后重试": "处理服务暂时不可用，请稍后重试"
};

export interface SlotState {
  status: SlotStatus;
  file?: File;
  sysFileId?: string | number;
  error?: string;
}

const TERMINAL_STATUSES = new Set<ProcessingLifecycleStatus>([
  "SUCCEEDED",
  "FAILED",
  "CANCELED"
]);

function responseData<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("后端响应缺少数据");
  return response.data;
}

export function useProcessingTask() {
  const slots = reactive<Record<SlotId, SlotState>>({
    browseImage: { status: "EMPTY" },
    georeference: { status: "EMPTY" },
    metadata: { status: "EMPTY" }
  });
  const preflight = ref<PreflightResponse>();
  const candidate = ref<PreflightCandidate>();
  const taskId = ref<number>();
  const taskStatus = ref<TaskStatus>();
  const progress = ref<ExecutionProgressResponse>();
  const errorMessage = ref("");
  const unchangedPollCount = ref(0);
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let lastProgressSignature = "";

  const files = computed<ProductFiles>(() => ({
    browseImage: slots.browseImage.file,
    georeference: slots.georeference.file,
    metadata: slots.metadata.file
  }));

  const validation = computed(() => validateProductFiles(files.value));
  const allSlotsUploaded = computed(() =>
    GF6_WFV_BROWSE_TEMPLATE.slots.every(slot => {
      const state = slots[slot.id];
      return state.status === "UPLOADED" && state.sysFileId !== undefined;
    })
  );

  function stopPolling() {
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
  }

  function clearTaskContext() {
    stopPolling();
    preflight.value = undefined;
    candidate.value = undefined;
    taskId.value = undefined;
    taskStatus.value = undefined;
    progress.value = undefined;
    unchangedPollCount.value = 0;
    lastProgressSignature = "";
  }

  function setSlotError(slotId: SlotId, error: string) {
    slots[slotId] = { ...slots[slotId], status: "FAILED", error };
  }

  function slotTemplate(slotId: SlotId): ProductFileSlot {
    const slot = GF6_WFV_BROWSE_TEMPLATE.slots.find(item => item.id === slotId);
    if (!slot) throw new Error(`未知上传槽位: ${slotId}`);
    return slot;
  }

  async function uploadSlot(slotId: SlotId, file: File) {
    clearTaskContext();
    const slot = slotTemplate(slotId);
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!slot.extensions.includes(extension)) {
      setSlotError(
        slotId,
        `${slot.label}格式错误，仅支持${slot.extensions.join("、")}`
      );
      return;
    }
    slots[slotId] = { status: "UPLOADING", file };
    try {
      const response = responseData(await uploadStaticFile(file));
      slots[slotId] = { status: "UPLOADED", file, sysFileId: response.id };
    } catch {
      setSlotError(slotId, "上传失败，可重试该文件");
    }
  }

  function removeSlot(slotId: SlotId) {
    slots[slotId] = { status: "EMPTY" };
    clearTaskContext();
  }

  function buildAssets(): ProcessingAssetRequest[] {
    return GF6_WFV_BROWSE_TEMPLATE.slots.map(slot => {
      const fileId = slots[slot.id].sysFileId;
      if (fileId === undefined) throw new Error(`${slot.label}尚未上传完成`);
      return {
        sourceType: "SYS_FILE",
        sourceId: fileId,
        role: slot.role,
        ordinal: 0,
        required: true
      };
    });
  }

  async function runPreflight() {
    errorMessage.value = "";
    if (!allSlotsUploaded.value || !validation.value.valid) {
      throw new Error("请先补齐并校验三个产品文件");
    }
    const result = responseData(
      await preflightProcessingTask({ assets: buildAssets() })
    );
    const supported = result.candidates.filter(
      item => item.supportStatus === "SUPPORTED"
    );
    if (
      supported.length !== 1 ||
      !supported[0].packageId.startsWith("GF6-WFV-LEVEL1A-")
    ) {
      throw new Error("预检未返回唯一的 GF-6 WFV 支持候选");
    }
    preflight.value = result;
    candidate.value = supported[0];
    return supported[0];
  }

  function productName() {
    const file =
      slots.browseImage.file ?? slots.georeference.file ?? slots.metadata.file;
    return file ? basenameWithoutExtension(file.name) : "GF6-WFV-BROWSE";
  }

  async function startExistingTask(existingTaskId: number) {
    const started = responseData(await startProcessingTask(existingTaskId));
    taskId.value = existingTaskId;
    taskStatus.value = started.newlySubmitted ? "RUNNING" : "CREATED";
    schedulePoll(0);
    return existingTaskId;
  }

  async function createAndStart() {
    if (!preflight.value || !candidate.value)
      throw new Error("请先完成产品预检");
    const created = responseData(
      await createProcessingTask({
        name: productName(),
        preflightToken: preflight.value.preflightToken,
        candidateId: candidate.value.id,
        parameterSnapshot: JSON.stringify(DEFAULT_PROCESS_SNAPSHOT)
      })
    );
    taskId.value = created.taskId;
    return startExistingTask(created.taskId);
  }

  async function startProcessing() {
    errorMessage.value = "";
    try {
      if (!candidate.value || !preflight.value) {
        await runPreflight();
      }
      return await createAndStart();
    } catch (error) {
      clearTaskContext();
      throw error;
    }
  }

  function translateError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : "";
    return WORKER_ERROR_MESSAGES[message] || message || fallback;
  }

  function schedulePoll(delay: number) {
    stopPolling();
    if (taskId.value === undefined) return;
    pollTimer = setTimeout(pollProgress, delay);
  }

  async function pollProgress() {
    if (taskId.value === undefined) return;
    try {
      const result = responseData(await getProcessingProgress(taskId.value));
      const signature = JSON.stringify(result);
      unchangedPollCount.value =
        signature === lastProgressSignature ? unchangedPollCount.value + 1 : 0;
      lastProgressSignature = signature;
      progress.value = result;
      taskStatus.value = result.lifecycleStatus;
      if (!TERMINAL_STATUSES.has(result.lifecycleStatus)) {
        schedulePoll(unchangedPollCount.value >= 10 ? 5000 : 2000);
      } else {
        stopPolling();
      }
    } catch {
      schedulePoll(5000);
    }
  }

  async function cancel() {
    if (taskId.value === undefined) return;
    stopPolling();
    await cancelProcessingTask(taskId.value);
  }

  async function retry() {
    const failedStage = progress.value?.stages.find(
      stage => stage.status === "FAILED" || stage.status === "RECOVERY_PENDING"
    );
    if (!failedStage) throw new Error("当前没有可重试阶段");
    await retryProcessingStage(failedStage.stageId);
    if (taskId.value === undefined)
      throw new Error("任务标识已失效，请重新创建任务");
    await startExistingTask(taskId.value);
  }

  async function downloadResult() {
    if (taskId.value === undefined || taskStatus.value !== "SUCCEEDED") {
      throw new Error("任务尚未完成");
    }
    const response = await downloadProcessingResult(taskId.value);
    const responseDataValue = (response as { data?: unknown })?.data;
    const blob =
      responseDataValue instanceof Blob
        ? responseDataValue
        : response instanceof Blob
          ? response
          : new Blob([responseDataValue ?? response]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gf6-wfv-result.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    clearTaskContext();
    (Object.keys(slots) as SlotId[]).forEach(slotId => {
      slots[slotId] = { status: "EMPTY" };
    });
  }

  onBeforeUnmount(stopPolling);

  return {
    slots,
    files,
    validation,
    allSlotsUploaded,
    preflight,
    candidate,
    taskId,
    taskStatus,
    progress,
    errorMessage,
    uploadSlot,
    removeSlot,
    runPreflight,
    createAndStart,
    startProcessing,
    translateError,
    cancel,
    retry,
    downloadResult,
    stopPolling,
    reset
  };
}
