import { computed, onBeforeUnmount, reactive, ref, shallowRef } from "vue";
import {
  cancelProcessingTask,
  createProcessingTask,
  dispatchProcessingTask,
  downloadProcessingArtifact,
  downloadProcessingResult,
  getProcessingProgress,
  preflightProcessingTask,
  retryProcessingStage,
  uploadStaticFile,
  type ExecutionProgressArtifact,
  type ExecutionProgressResponse,
  type PreflightCandidate,
  type ProcessingIdentifier,
  type ProcessingLifecycleStatus,
  type PreflightResponse
} from "@/api/multiSourceSatellite";
import {
  GF6_WFV_L1A_TEMPLATE,
  basenameWithoutExtension,
  validateProductFiles,
  type ProductFiles,
  type ProductFileSlot,
  type ProductTemplate,
  type SlotId
} from "./productTemplates";
import {
  artifactDownloadFileName,
  assertTemplateSwitchAllowed,
  authorizeArtifactDownload,
  buildPreflightAssets,
  extractProcessingErrorMessage,
  isProcessingTaskActive,
  isRetryableStageStatus,
  resetProcessingRunState,
  resetSlotStates,
  resultZipFileName,
  selectPreflightCandidate,
  serializeParameterSnapshot,
  translateProcessingErrorMessage
} from "./processingTaskRules";

export type SlotStatus =
  | "EMPTY"
  | "SELECTED"
  | "UPLOADING"
  | "UPLOADED"
  | "FAILED";
export type TaskStatus = ProcessingLifecycleStatus;

export interface SlotState {
  status: SlotStatus;
  file?: File;
  sysFileId?: string | number;
  error?: string;
  uploadProgress?: number;
}

const SLOT_IDS: readonly SlotId[] = [
  "browseImage",
  "georeference",
  "main",
  "metadata",
  "browse",
  "observation",
  "geo1k",
  "l1_0500m",
  "l1_1000m",
  "l1_2000m",
  "l1_4000m",
  "geo_4000m",
  "mainTiffTile0",
  "mainTiffTile1",
  "mainTiffTile2",
  "metadataXml",
  "rpcRpb",
  "nav",
  "tileIndexTil"
];

function fileMatchesExtensions(
  fileName: string,
  extensions: readonly string[]
) {
  const normalized = fileName.toLowerCase();
  return extensions.some(extension =>
    normalized.endsWith(extension.toLowerCase())
  );
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

function responseBlob(response: unknown): Blob {
  const value = (response as { data?: unknown })?.data;
  if (value instanceof Blob) return value;
  if (response instanceof Blob) return response;
  return new Blob([value ?? response] as BlobPart[]);
}

function uploadErrorMessage(error: unknown): string {
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  if (
    responseData &&
    typeof responseData === "object" &&
    "msg" in responseData &&
    typeof responseData.msg === "string" &&
    responseData.msg.trim()
  ) {
    return responseData.msg;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "上传失败，可重试该文件";
}

function isPreflightSessionUnavailable(error: unknown): boolean {
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  return !!(
    responseData &&
    typeof responseData === "object" &&
    "msg" in responseData &&
    typeof responseData.msg === "string" &&
    responseData.msg.includes("预检会话已失效")
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function useProcessingTask(
  initialTemplate: ProductTemplate = GF6_WFV_L1A_TEMPLATE
) {
  const activeTemplate = shallowRef(initialTemplate);
  const slots = reactive<Record<SlotId, SlotState>>(
    Object.fromEntries(
      SLOT_IDS.map(slotId => [slotId, { status: "EMPTY" }])
    ) as Record<SlotId, SlotState>
  );
  const preflight = ref<PreflightResponse>();
  const candidate = ref<PreflightCandidate>();
  const taskId = ref<ProcessingIdentifier>();
  const taskStatus = ref<TaskStatus>();
  const progress = ref<ExecutionProgressResponse>();
  const errorMessage = ref("");
  const unchangedPollCount = ref(0);
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let lastProgressSignature = "";

  const files = computed<ProductFiles>(() =>
    Object.fromEntries(SLOT_IDS.map(slotId => [slotId, slots[slotId].file]))
  );
  const validation = computed(() =>
    validateProductFiles(files.value, activeTemplate.value)
  );
  const allSlotsUploaded = computed(() =>
    activeTemplate.value.slots
      .filter(slot => slot.required)
      .every(slot => {
        const state = slots[slot.id];
        return state.status === "UPLOADED" && state.sysFileId !== undefined;
      })
  );
  const isTaskActive = computed(() =>
    isProcessingTaskActive(taskId.value, taskStatus.value)
  );
  const isUploading = computed(() =>
    activeTemplate.value.slots.some(
      slot => slots[slot.id].status === "UPLOADING"
    )
  );
  const isDownloadingResult = ref(false);

  function stopPolling() {
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
  }

  function clearTaskContext() {
    const cleared = resetProcessingRunState({
      preflight: preflight.value,
      candidate: candidate.value,
      taskStatus: taskStatus.value,
      progress: progress.value,
      errorMessage: errorMessage.value
    });
    stopPolling();
    preflight.value = cleared.preflight;
    candidate.value = cleared.candidate;
    taskId.value = undefined;
    taskStatus.value = cleared.taskStatus;
    progress.value = cleared.progress;
    errorMessage.value = cleared.errorMessage;
    unchangedPollCount.value = 0;
    lastProgressSignature = "";
  }

  function clearRunView() {
    const cleared = resetProcessingRunState({
      preflight: preflight.value,
      candidate: candidate.value,
      taskStatus: taskStatus.value,
      progress: progress.value,
      errorMessage: errorMessage.value
    });
    stopPolling();
    preflight.value = cleared.preflight;
    candidate.value = cleared.candidate;
    taskStatus.value = cleared.taskStatus;
    progress.value = cleared.progress;
    errorMessage.value = cleared.errorMessage;
    unchangedPollCount.value = 0;
    lastProgressSignature = "";
  }

  function clearSlots() {
    resetSlotStates(slots, SLOT_IDS);
  }

  function assertTaskInactive() {
    if (isTaskActive.value) {
      throw new Error("任务正在执行，请先取消任务或等待任务结束后再更换产品");
    }
  }

  function setTemplate(template: ProductTemplate) {
    if (template.id === activeTemplate.value.id) return;
    assertTemplateSwitchAllowed(
      taskId.value,
      taskStatus.value,
      isUploading.value
    );
    clearTaskContext();
    clearSlots();
    activeTemplate.value = template;
  }

  function setSlotError(slotId: SlotId, error: string) {
    slots[slotId] = { ...slots[slotId], status: "FAILED", error };
  }

  function setUploadedSlot(
    slotId: SlotId,
    fileName: string,
    sysFileId: string | number
  ) {
    assertTaskInactive();
    const slot = slotTemplate(slotId);
    const file = new File([], fileName, { type: "application/octet-stream" });
    if (!fileMatchesExtensions(fileName, slot.extensions)) {
      setSlotError(
        slotId,
        `${slot.label}格式错误，仅支持${slot.extensions.join("、")}`
      );
      return;
    }
    slots[slotId] = {
      status: "UPLOADED",
      file,
      sysFileId,
      uploadProgress: 100
    };
  }

  function slotTemplate(slotId: SlotId): ProductFileSlot {
    const slot = activeTemplate.value.slots.find(item => item.id === slotId);
    if (!slot) throw new Error(`当前产品不存在上传槽位: ${slotId}`);
    return slot;
  }

  async function uploadSlot(slotId: SlotId, file: File) {
    assertTaskInactive();
    clearTaskContext();
    const slot = slotTemplate(slotId);
    if (!fileMatchesExtensions(file.name, slot.extensions)) {
      setSlotError(
        slotId,
        `${slot.label}格式错误，仅支持${slot.extensions.join("、")}`
      );
      return;
    }
    slots[slotId] = { status: "UPLOADING", file, uploadProgress: 0 };
    try {
      const response = responseData(
        await uploadStaticFile(file, uploadProgress => {
          if (slots[slotId].status === "UPLOADING") {
            slots[slotId] = {
              ...slots[slotId],
              uploadProgress
            };
          }
        })
      );
      slots[slotId] = { status: "UPLOADED", file, sysFileId: response.id };
    } catch (error) {
      setSlotError(slotId, uploadErrorMessage(error));
    }
  }

  function removeSlot(slotId: SlotId) {
    assertTaskInactive();
    slots[slotId] = { status: "EMPTY" };
    clearTaskContext();
  }

  function buildAssets() {
    return buildPreflightAssets(activeTemplate.value, slots);
  }

  async function runPreflight() {
    errorMessage.value = "";
    if (!allSlotsUploaded.value || !validation.value.valid) {
      throw new Error(
        `请先补齐并校验 ${activeTemplate.value.slots.filter(slot => slot.required).length} 个产品文件`
      );
    }
    const result = responseData(
      await preflightProcessingTask({ assets: buildAssets() })
    );
    const matchedCandidate = selectPreflightCandidate(
      result.candidates,
      activeTemplate.value
    );
    preflight.value = result;
    candidate.value = matchedCandidate;
    return matchedCandidate;
  }

  function productName() {
    const file = activeTemplate.value.slots
      .map(slot => slots[slot.id].file)
      .find(Boolean);
    return file
      ? basenameWithoutExtension(file.name)
      : activeTemplate.value.productCode;
  }

  async function startExistingTask(existingTaskId: ProcessingIdentifier) {
    const dispatch = responseData(await dispatchProcessingTask(existingTaskId));
    taskId.value = existingTaskId;
    taskStatus.value = dispatch.dispatched ? "RUNNING" : "CREATED";
    await pollProgress();
    return existingTaskId;
  }

  async function createAndStart(
    parameterSnapshot: Readonly<object> = activeTemplate.value.parameterSnapshot
  ) {
    if (!preflight.value || !candidate.value) {
      throw new Error("请先完成产品预检");
    }
    const created = responseData(
      await createProcessingTask({
        name: productName(),
        preflightToken: preflight.value.preflightToken,
        candidateId: candidate.value.id,
        parameterSnapshot: serializeParameterSnapshot(parameterSnapshot)
      })
    );
    taskId.value = created.taskId;
    return startExistingTask(created.taskId);
  }

  async function startProcessing(
    parameterSnapshot: Readonly<object> = activeTemplate.value.parameterSnapshot
  ) {
    clearTaskContext();
    try {
      if (!candidate.value || !preflight.value) await runPreflight();
      try {
        return await createAndStart(parameterSnapshot);
      } catch (error) {
        // The backend keeps preflight state in memory. If it was restarted
        // between preflight and create, refresh the server-side selection
        // once and retry the create request with the new token.
        if (!isPreflightSessionUnavailable(error)) throw error;
        await runPreflight();
        return await createAndStart(parameterSnapshot);
      }
    } catch (error) {
      clearTaskContext();
      throw error;
    }
  }

  function translateError(error: unknown, fallback: string) {
    const message = extractProcessingErrorMessage(error);
    return translateProcessingErrorMessage(message) || fallback;
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
    schedulePoll(0);
  }

  async function retry(stageId?: ProcessingIdentifier) {
    const failedStage = progress.value?.stages.find(
      stage =>
        (stageId === undefined || stage.stageId === stageId) &&
        isRetryableStageStatus(stage.status)
    );
    if (!failedStage) throw new Error("当前没有可重试阶段");
    const existingTaskId = taskId.value;
    if (existingTaskId === undefined) {
      throw new Error("任务标识已失效，请重新创建任务");
    }
    const previousCandidate = candidate.value;
    clearRunView();
    await retryProcessingStage(failedStage.stageId);
    await startExistingTask(existingTaskId);
    candidate.value = previousCandidate;
  }

  async function downloadResult(): Promise<boolean> {
    if (isDownloadingResult.value) return false;
    if (taskId.value === undefined || taskStatus.value !== "SUCCEEDED") {
      throw new Error("任务尚未完成");
    }
    const currentTaskId = taskId.value;
    const currentTemplate = activeTemplate.value;
    isDownloadingResult.value = true;
    try {
      return await downloadProcessingResult(
        currentTaskId,
        resultZipFileName(currentTemplate)
      );
    } finally {
      isDownloadingResult.value = false;
    }
  }

  async function getArtifactBlob(artifact: ExecutionProgressArtifact) {
    if (taskId.value === undefined) throw new Error("任务标识已失效");
    const currentArtifact = authorizeArtifactDownload(
      progress.value?.artifacts || [],
      artifact
    );
    const response = await downloadProcessingArtifact(
      taskId.value,
      currentArtifact.type
    );
    return responseBlob(response);
  }

  async function downloadArtifact(artifact: ExecutionProgressArtifact) {
    const blob = await getArtifactBlob(artifact);
    saveBlob(blob, artifactDownloadFileName(artifact));
  }

  function reset() {
    assertTaskInactive();
    clearTaskContext();
    clearSlots();
  }

  onBeforeUnmount(stopPolling);

  return {
    activeTemplate,
    slots,
    files,
    validation,
    allSlotsUploaded,
    isTaskActive,
    isUploading,
    isDownloadingResult,
    preflight,
    candidate,
    taskId,
    taskStatus,
    progress,
    errorMessage,
    setTemplate,
    uploadSlot,
    setUploadedSlot,
    removeSlot,
    runPreflight,
    createAndStart,
    startProcessing,
    translateError,
    cancel,
    retry,
    downloadResult,
    downloadArtifact,
    getArtifactBlob,
    stopPolling,
    reset
  };
}
