<template>
  <section class="multi-source-flow" aria-labelledby="multi-source-title">
    <header class="multi-source-flow__heading">
      <span>MULTI-SOURCE DATA</span>
      <h3 id="multi-source-title">多源卫星数据处理</h3>
    </header>

    <div class="multi-source-flow__selector">
      <label for="product-template">产品类型</label>
      <select id="product-template" v-model="selectedTemplateId">
        <option :value="GF6_WFV_BROWSE_TEMPLATE.id">
          {{ GF6_WFV_BROWSE_TEMPLATE.label }}
        </option>
      </select>
    </div>

    <section class="multi-source-flow__page" aria-labelledby="upload-title">
      <div class="multi-source-flow__page-title">
        <span>01</span>
        <div>
          <strong id="upload-title">上传产品包</strong>
          <small>选择同一产品编号的 JPG、JGW 和 JSON 文件。</small>
        </div>
      </div>

      <div class="multi-source-flow__slots">
        <article
          v-for="slot in GF6_WFV_BROWSE_TEMPLATE.slots"
          :key="slot.id"
          class="multi-source-flow__slot"
          :class="`is-${slots[slot.id].status.toLowerCase()}`"
        >
          <div class="multi-source-flow__slot-heading">
            <div>
              <strong>{{ slot.label }}</strong>
              <small>{{ slot.extensions.join("、") }}</small>
            </div>
            <span>{{ slotStatusLabel(slots[slot.id].status) }}</span>
          </div>
          <input
            :id="`file-${slot.id}`"
            class="multi-source-flow__file-input"
            type="file"
            :accept="slot.extensions.join(',')"
            @change="handleFileChange(slot.id, $event)"
          />
          <label
            class="multi-source-flow__file-button"
            :for="`file-${slot.id}`"
          >
            <el-icon><DocumentAdd /></el-icon>
            <span>{{ slots[slot.id].file?.name || "选择文件" }}</span>
          </label>
          <small v-if="slots[slot.id].error" class="multi-source-flow__error">
            {{ slots[slot.id].error }}
          </small>
          <button
            v-if="slots[slot.id].file"
            class="multi-source-flow__remove"
            type="button"
            title="移除文件"
            @click="removeSlot(slot.id)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </article>
      </div>

      <div
        v-if="validationMessages.length"
        class="multi-source-flow__diagnostics"
        role="alert"
      >
        <span v-for="diagnostic in validationMessages" :key="diagnostic">{{
          diagnostic
        }}</span>
      </div>

      <footer class="multi-source-flow__page-action">
        <span>已上传 {{ uploadedSlotCount }}/3</span>
        <el-button
          type="primary"
          :disabled="!canPreflight || isBusy"
          @click="startTask"
        >
          开始处理
          <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </footer>
    </section>

    <section
      v-if="candidate"
      class="multi-source-flow__page"
      aria-labelledby="candidate-title"
    >
      <div class="multi-source-flow__page-title">
        <span>02</span>
        <div>
          <strong id="candidate-title">确认产品</strong>
          <small>后端已识别唯一支持的 GF-6 WFV 产品。</small>
        </div>
      </div>
      <div class="multi-source-flow__candidate">
        <strong>{{ candidate.packageId }}</strong>
        <small>状态：{{ candidate.supportStatus }}</small>
      </div>
      <footer class="multi-source-flow__page-action">
        <span>{{
          taskStatus ? taskStatusLabel : "已完成文件检查，点击上方开始处理"
        }}</span>
      </footer>
    </section>

    <section
      v-if="progress"
      class="multi-source-flow__page"
      aria-labelledby="progress-title"
    >
      <div class="multi-source-flow__page-title">
        <span>03</span>
        <div>
          <strong id="progress-title">处理进度</strong>
          <small>任务由服务器持续执行，页面刷新不会停止任务。</small>
        </div>
      </div>
      <div class="multi-source-flow__stages">
        <div
          v-for="stage in progress.stages"
          :key="stage.stageId"
          class="multi-source-flow__stage"
        >
          <span>{{ stageLabel(stage.stageKey) }}</span>
          <small>{{ stage.status }} · 第 {{ stage.attempt }} 次</small>
          <el-button
            v-if="canRetryStage(stage.status)"
            text
            type="warning"
            @click="retryTask"
          >
            重试
          </el-button>
        </div>
      </div>
      <footer class="multi-source-flow__page-action">
        <span>{{ taskStatusLabel }}</span>
        <div class="multi-source-flow__actions">
          <el-button v-if="canCancel" plain @click="cancelTask"
            >取消任务</el-button
          >
          <el-button
            v-if="taskStatus === 'SUCCEEDED'"
            type="primary"
            @click="downloadTask"
          >
            <el-icon><Download /></el-icon>
            下载 ZIP
          </el-button>
          <el-button v-if="isTerminal" plain @click="resetTask"
            >重新处理</el-button
          >
        </div>
      </footer>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ArrowRight,
  Delete,
  DocumentAdd,
  Download
} from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import {
  GF6_WFV_BROWSE_TEMPLATE,
  type SlotId
} from "@/features/multisource/productTemplates";
import { useProcessingTask } from "@/features/multisource/useProcessingTask";

const selectedTemplateId = ref(GF6_WFV_BROWSE_TEMPLATE.id);
const {
  slots,
  validation,
  allSlotsUploaded,
  candidate,
  taskStatus,
  progress,
  uploadSlot,
  removeSlot,
  runPreflight,
  startProcessing,
  translateError,
  cancel,
  retry,
  downloadResult,
  reset
} = useProcessingTask();

const uploadedSlotCount = computed(
  () => Object.values(slots).filter(slot => slot.status === "UPLOADED").length
);
const validationMessages = computed(() => {
  const result = validation.value;
  return [
    ...result.missingSlots.map(slot => `缺少${slot.label}`),
    ...result.invalidExtensions.map(
      item =>
        `${item.slot.label}格式错误，仅支持${item.expectedExtensions.join("、")}`
    ),
    ...(result.mismatchedBasenames ? ["三个文件的产品编号必须一致"] : [])
  ];
});
const canPreflight = computed(
  () => allSlotsUploaded.value && validation.value.valid
);
const isBusy = ref(false);
const isTaskActive = computed(
  () =>
    taskStatus.value === "RUNNING" || taskStatus.value === "RECOVERY_PENDING"
);
const isTerminal = computed(() =>
  ["SUCCEEDED", "FAILED", "CANCELED"].includes(taskStatus.value || "")
);
const canCancel = computed(
  () => taskStatus.value === "CREATED" || taskStatus.value === "RUNNING"
);
const taskStatusLabel = computed(() => {
  const labels: Record<string, string> = {
    CREATED: "任务已创建",
    RUNNING: "正在处理",
    RECOVERY_PENDING: "等待恢复",
    SUCCEEDED: "处理完成",
    FAILED: "处理失败",
    CANCELED: "任务已取消"
  };
  return labels[taskStatus.value || ""] || "等待创建任务";
});

function slotStatusLabel(status: string) {
  return (
    (
      {
        EMPTY: "待上传",
        SELECTED: "已选择",
        UPLOADING: "上传中",
        UPLOADED: "已上传",
        FAILED: "失败"
      } as Record<string, string>
    )[status] || status
  );
}

function stageLabel(stageKey: string) {
  return (
    (
      {
        VALIDATE_BROWSE: "验证浏览产品",
        GEOREFERENCE_BROWSE: "解析地理参考",
        EXTRACT_VISUAL_FEATURES: "提取视觉特征",
        WRITE_BROWSE_REPORT: "生成浏览报告"
      } as Record<string, string>
    )[stageKey] || stageKey
  );
}

function canRetryStage(status: string) {
  return status === "FAILED" || status === "RECOVERY_PENDING";
}

async function handleFileChange(slotId: SlotId, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await uploadSlot(slotId, file);
}

async function preflightTask() {
  try {
    await runPreflight();
    message("产品预检通过", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "产品预检失败", {
      type: "error"
    });
  }
}

async function startTask() {
  isBusy.value = true;
  try {
    await startProcessing();
    message("任务已启动", { type: "success" });
  } catch (error) {
    message(translateError(error, "开始处理失败，请重试"), {
      type: "error"
    });
  } finally {
    isBusy.value = false;
  }
}

async function cancelTask() {
  await cancel();
  message("已发送取消请求", { type: "success" });
}

async function retryTask() {
  try {
    await retry();
    message("任务已重新启动", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "任务重试失败", {
      type: "error"
    });
  }
}

async function downloadTask() {
  try {
    await downloadResult();
    message("结果 ZIP 已开始下载", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "结果下载失败", {
      type: "error"
    });
  }
}

function resetTask() {
  reset();
}
</script>

<style lang="less" scoped>
.multi-source-flow {
  box-sizing: border-box;
  padding: 4px 16px 26px;
  overflow: hidden;
  color: #2863a7;
}

.multi-source-flow__heading {
  padding: 13px 14px 12px;
  background: #f1f8fc;
  border: 1px solid #c8e5f4;
  border-radius: 4px;
}

.multi-source-flow__heading span {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #2b9fe8;
  letter-spacing: 1.55px;
}

.multi-source-flow__heading h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.multi-source-flow__selector {
  display: grid;
  gap: 5px;
  margin: 14px 4px 10px;
}

.multi-source-flow__selector label,
.multi-source-flow__selector select {
  font-size: 13px;
}

.multi-source-flow__selector select {
  min-height: 32px;
  padding: 4px 8px;
  color: #346c9e;
  background: #fff;
  border: 1px solid #cde6f6;
  border-radius: 3px;
}

.multi-source-flow__page {
  margin-top: 14px;
}

.multi-source-flow__page-title {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 0 4px 11px;
  border-bottom: 1px solid #c9e9fb;
}

.multi-source-flow__page-title > span {
  font-size: 13px;
  font-weight: 700;
  color: #4ba9e5;
}

.multi-source-flow__page-title strong,
.multi-source-flow__page-title small {
  display: block;
}

.multi-source-flow__page-title strong {
  font-size: 16px;
}

.multi-source-flow__page-title small {
  margin-top: 3px;
  color: #8298b4;
}

.multi-source-flow__slots,
.multi-source-flow__stages {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.multi-source-flow__slot,
.multi-source-flow__candidate,
.multi-source-flow__stage {
  position: relative;
  padding: 10px;
  background: #fbfeff;
  border: 1px solid #d5ebf9;
  border-radius: 4px;
}

.multi-source-flow__slot-heading,
.multi-source-flow__stage {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.multi-source-flow__slot-heading strong,
.multi-source-flow__slot-heading small,
.multi-source-flow__stage span,
.multi-source-flow__stage small,
.multi-source-flow__candidate strong,
.multi-source-flow__candidate small {
  display: block;
}

.multi-source-flow__slot-heading strong,
.multi-source-flow__candidate strong {
  color: #4276ab;
}

.multi-source-flow__slot-heading small,
.multi-source-flow__stage small,
.multi-source-flow__candidate small {
  margin-top: 3px;
  color: #829ab3;
}

.multi-source-flow__slot-heading > span {
  font-size: 12px;
  color: #43a6e5;
}

.multi-source-flow__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.multi-source-flow__file-button {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  margin-top: 8px;
  padding: 7px 8px;
  color: #4779af;
  cursor: pointer;
  border: 1px dashed #78c7f3;
  border-radius: 3px;
}

.multi-source-flow__file-button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.multi-source-flow__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #92afd0;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.multi-source-flow__error,
.multi-source-flow__diagnostics span {
  display: block;
  margin-top: 5px;
  color: #d86c72;
}

.multi-source-flow__diagnostics {
  margin-top: 8px;
  font-size: 12px;
}

.multi-source-flow__page-action {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 15px 3px 0;
}

.multi-source-flow__page-action > span {
  color: #8ba4bb;
  font-size: 12px;
}

.multi-source-flow__actions {
  display: flex;
  gap: 8px;
}
</style>
