<template>
  <section class="multi-source-flow" aria-labelledby="multi-source-title">
    <header class="multi-source-flow__heading">
      <span>MULTI-SOURCE DATA</span>
      <h3 id="multi-source-title">多源卫星数据处理</h3>
    </header>

    <nav class="multi-source-flow__track" aria-label="处理步骤">
      <span class="multi-source-flow__track-line" aria-hidden="true" />
      <button
        v-for="item in steps"
        :key="item.step"
        class="multi-source-flow__track-step"
        :class="{
          'is-active': activeStep === item.step,
          'is-complete': completedStep >= item.step,
          'is-available': canEnterStep(item.step)
        }"
        type="button"
        :disabled="!canEnterStep(item.step) || isProcessing"
        :aria-current="activeStep === item.step ? 'step' : undefined"
        @click="goToStep(item.step)"
      >
        <span class="multi-source-flow__track-node">{{ item.step }}</span>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <Transition name="multi-source-slide" mode="out-in">
      <section
        v-if="activeStep === 1"
        key="upload"
        class="multi-source-flow__page"
      >
        <div class="multi-source-flow__page-title">
          <span>01</span>
          <div>
            <strong>上传数据</strong>
            <small>每次添加一份卫星数据，并标注其卫星种类。</small>
          </div>
        </div>

        <el-upload
          ref="uploadRef"
          class="multi-source-flow__upload"
          action="#"
          :auto-upload="false"
          :multiple="false"
          :show-file-list="false"
          :on-change="handleFileChange"
        >
          <button class="multi-source-flow__upload-trigger" type="button">
            <el-icon><DocumentAdd /></el-icon>
            <span>选择一份卫星数据</span>
            <small>支持任意文件格式</small>
          </button>
        </el-upload>

        <div v-if="sourceFiles.length" class="multi-source-flow__ledger">
          <article
            v-for="(item, index) in sourceFiles"
            :key="item.id"
            class="multi-source-flow__file-row"
          >
            <div class="multi-source-flow__file-name">
              <span>{{ String(index + 1).padStart(2, "0") }}</span>
              <div>
                <strong :title="item.fileName">{{ item.fileName }}</strong>
                <small>{{ formatFileSize(item.size) }}</small>
              </div>
              <button
                type="button"
                :aria-label="`移除 ${item.fileName}`"
                title="移除数据"
                @click="removeFile(item.id)"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </div>
            <el-select
              v-model="item.satelliteType"
              class="multi-source-flow__satellite-select"
              placeholder="选择卫星种类"
              aria-label="卫星种类"
              @change="completedStep = 0"
            >
              <el-option
                v-for="option in satelliteOptions"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </article>
        </div>

        <div v-else class="multi-source-flow__empty-upload">
          尚未添加卫星数据
        </div>

        <footer class="multi-source-flow__page-action">
          <span>已添加 {{ sourceFiles.length }} 份数据</span>
          <el-button
            type="primary"
            :disabled="!sourceFiles.length"
            @click="completeUpload"
          >
            下一步
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </footer>
      </section>

      <section
        v-else-if="activeStep === 2"
        key="process"
        class="multi-source-flow__page"
      >
        <div class="multi-source-flow__page-title">
          <span>02</span>
          <div>
            <strong>处理数据</strong>
            <small>选择本次任务需要执行的处理能力。</small>
          </div>
        </div>

        <template v-if="!isProcessing">
          <el-checkbox-group
            v-model="selectedOperations"
            class="multi-source-flow__operation-list"
            aria-label="处理能力"
          >
            <el-checkbox
              v-for="operation in operationOptions"
              :key="operation.value"
              :value="operation.value"
              class="multi-source-flow__operation"
            >
              <span class="multi-source-flow__operation-name">{{
                operation.label
              }}</span>
            </el-checkbox>
          </el-checkbox-group>

          <footer
            class="multi-source-flow__page-action multi-source-flow__page-action--split"
          >
            <el-button plain @click="goToStep(1)">返回上传</el-button>
            <el-button
              type="primary"
              :disabled="!selectedOperations.length"
              @click="startProcessing"
            >
              开始处理
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </footer>
        </template>

        <div v-else class="multi-source-flow__processing" aria-live="polite">
          <div class="multi-source-flow__processing-orbit">
            <el-icon><Loading /></el-icon>
          </div>
          <strong>正在处理卫星数据</strong>
          <small
            >已提交 {{ sourceFiles.length }} 份数据，结果包即将生成。</small
          >
          <span>处理中，请稍候…</span>
        </div>
      </section>

      <section v-else key="result" class="multi-source-flow__page">
        <div class="multi-source-flow__page-title">
          <span>03</span>
          <div>
            <strong>查看结果</strong>
            <small>处理完成后，可下载本次任务的结果包。</small>
          </div>
        </div>

        <div class="multi-source-flow__result-card">
          <div class="multi-source-flow__result-mark">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <strong>处理已完成</strong>
          <small :title="result?.fileName">{{ result?.fileName }}</small>
          <el-button type="primary" @click="downloadResult">
            <el-icon><Download /></el-icon>
            下载结果包
          </el-button>
        </div>

        <footer class="multi-source-flow__page-action">
          <span>可返回上一步重新选择处理能力。</span>
          <el-button plain @click="prepareAnotherProcess">重新处理</el-button>
        </footer>
      </section>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { UploadFile, UploadInstance } from "element-plus";
import {
  ArrowRight,
  CircleCheck,
  Delete,
  DocumentAdd,
  Download,
  Loading
} from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import {
  downloadMultiSourceSatelliteResult,
  runMultiSourceSatelliteProcess,
  type MultiSourceProcessResult
} from "@/api/multiSourceSatellite";

type SourceFile = {
  id: string;
  fileName: string;
  size: number;
  satelliteType: string;
};

const steps = [
  { step: 1, label: "上传数据" },
  { step: 2, label: "处理数据" },
  { step: 3, label: "查看结果" }
];

const satelliteOptions = [
  "HY-1 系列",
  "HY-2 系列",
  "CFOSAT",
  "风云三号/四号",
  "高分系列",
  "1 米 C-SAR",
  "SPOT 等商业卫星"
];

const operationOptions = [
  {
    value: "feature-extraction",
    label: "通用特征提取"
  },
  {
    value: "multi-band-fusion",
    label: "多波段融合"
  },
  {
    value: "saliency-detection",
    label: "显著性检测"
  }
];

const uploadRef = ref<UploadInstance>();
const sourceFiles = ref<SourceFile[]>([]);
const selectedOperations = ref<string[]>([]);
const activeStep = ref(1);
const completedStep = ref(0);
const isProcessing = ref(false);
const result = ref<MultiSourceProcessResult>();

const canEnterStep = (step: number) => step <= completedStep.value + 1;

const goToStep = (step: number) => {
  if (canEnterStep(step) && !isProcessing.value) {
    activeStep.value = step;
  }
};

const handleFileChange = (file: UploadFile) => {
  sourceFiles.value.push({
    id: `${file.uid}-${Date.now()}`,
    fileName: file.name,
    size: file.size || 0,
    satelliteType: ""
  });
  completedStep.value = 0;
  result.value = undefined;
  nextTick(() => uploadRef.value?.clearFiles());
};

const removeFile = (id: string) => {
  sourceFiles.value = sourceFiles.value.filter(item => item.id !== id);
  completedStep.value = 0;
  result.value = undefined;
};

const formatFileSize = (size: number) => {
  if (!size) return "文件大小未知";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const completeUpload = () => {
  if (!sourceFiles.value.length) {
    message("请先添加一份卫星数据", { type: "warning" });
    return;
  }
  if (sourceFiles.value.some(item => !item.satelliteType)) {
    message("请为每份数据选择卫星种类", { type: "warning" });
    return;
  }
  completedStep.value = Math.max(completedStep.value, 1);
  activeStep.value = 2;
};

const startProcessing = async () => {
  if (!selectedOperations.value.length) {
    message("请至少选择一项处理能力", { type: "warning" });
    return;
  }

  isProcessing.value = true;
  try {
    const response = await runMultiSourceSatelliteProcess({
      files: sourceFiles.value.map(item => ({
        fileName: item.fileName,
        satelliteType: item.satelliteType,
        size: item.size
      })),
      operations: selectedOperations.value
    });
    result.value = response.data as MultiSourceProcessResult;
    completedStep.value = 2;
    activeStep.value = 3;
    message("数据处理完成，结果包已生成", { type: "success" });
  } catch {
    message("处理任务未完成，请稍后重试", { type: "error" });
  } finally {
    isProcessing.value = false;
  }
};

const downloadResult = async () => {
  if (!result.value) return;

  try {
    const response = await downloadMultiSourceSatelliteResult(
      result.value.resultId
    );
    const blob =
      response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data]);
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = result.value.fileName;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    message("结果包已开始下载", { type: "success" });
  } catch {
    message("结果包下载失败，请稍后重试", { type: "error" });
  }
};

const prepareAnotherProcess = () => {
  result.value = undefined;
  completedStep.value = 1;
  activeStep.value = 2;
};
</script>

<style lang="less" scoped>
.multi-source-flow {
  --deep-blue: #2863a7;
  --sky-blue: #269fe9;
  --pale-blue: #eaf7ff;
  --line-blue: #c9e9fb;
  box-sizing: border-box;
  padding: 4px 16px 26px;
  overflow: hidden;
  color: var(--deep-blue);
}

.multi-source-flow__heading {
  padding: 13px 14px 12px;
  background: linear-gradient(135deg, #f8fdff 0%, #e8f5ff 100%);
  border: 1px solid rgba(117, 196, 241, 0.58);
  border-radius: 4px;
  box-shadow: 0 7px 16px rgba(67, 153, 211, 0.08);
}

.multi-source-flow__heading span {
  display: block;
  margin-bottom: 5px;
  font-family: "Arial Narrow", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #2b9fe8;
  letter-spacing: 1.55px;
}

.multi-source-flow__heading h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--deep-blue);
  letter-spacing: 0.7px;
}

.multi-source-flow__track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 17px 8px 17px;
}

.multi-source-flow__track-line {
  position: absolute;
  top: 8px;
  right: 14%;
  left: 14%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    #73c5f4 14%,
    #73c5f4 86%,
    transparent
  );
}

.multi-source-flow__track-step {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 0;
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
  color: #91a7bb;
  cursor: default;
  background: transparent;
  border: 0;
}

.multi-source-flow__track-step.is-available {
  cursor: pointer;
}

.multi-source-flow__track-step:disabled {
  cursor: default;
}

.multi-source-flow__track-node {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  font-family: "Arial Narrow", sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #5caee1;
  background: #fff;
  border: 2px solid #50b2ec;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(126, 209, 248, 0.14);
  transition: 180ms ease;
}

.multi-source-flow__track-step.is-active,
.multi-source-flow__track-step.is-complete {
  color: #3477b6;
}

.multi-source-flow__track-step.is-active .multi-source-flow__track-node {
  color: #fff;
  background: var(--sky-blue);
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(38, 159, 233, 0.28);
}

.multi-source-flow__track-step.is-complete:not(.is-active)
  .multi-source-flow__track-node {
  color: #fff;
  background: #69bff0;
  border-color: #69bff0;
}

.multi-source-flow__page {
  min-height: 258px;
}

.multi-source-flow__page-title {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 0 4px 11px;
  border-bottom: 1px solid var(--line-blue);
}

.multi-source-flow__page-title > span {
  padding-top: 1px;
  font-family: "Arial Narrow", "Microsoft YaHei", sans-serif;
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
  font-weight: 600;
  line-height: 1.25;
  color: #3b6fa9;
}

.multi-source-flow__page-title small {
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.5;
  color: #8298b4;
}

.multi-source-flow__upload {
  display: block;
  margin-top: 12px;
}

.multi-source-flow__upload :deep(.el-upload) {
  display: block;
  width: 100%;
}

.multi-source-flow__upload-trigger {
  display: grid;
  width: 100%;
  min-height: 66px;
  place-items: center;
  align-content: center;
  gap: 4px;
  color: #4779af;
  cursor: pointer;
  background: linear-gradient(135deg, #fbfeff, #f1faff);
  border: 1px dashed #78c7f3;
  border-radius: 4px;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.multi-source-flow__upload-trigger:hover {
  background: #eaf7ff;
  border-color: #279fe7;
  transform: translateY(-1px);
}

.multi-source-flow__upload-trigger .el-icon {
  font-size: 18px;
  color: #279fe7;
}

.multi-source-flow__upload-trigger span {
  font-size: 15px;
  font-weight: 600;
}

.multi-source-flow__upload-trigger small {
  font-size: 12px;
  color: #87a2bd;
}

.multi-source-flow__ledger {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.multi-source-flow__file-row {
  padding: 8px;
  background: #fcfeff;
  border: 1px solid #d5ebf9;
  border-radius: 4px;
}

.multi-source-flow__file-name {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 22px;
  gap: 7px;
  align-items: center;
  margin-bottom: 7px;
}

.multi-source-flow__file-name > span {
  font-family: "Arial Narrow", sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #58aee5;
}

.multi-source-flow__file-name strong,
.multi-source-flow__file-name small {
  display: block;
}

.multi-source-flow__file-name strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: #4577ac;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.multi-source-flow__file-name small {
  margin-top: 1px;
  font-size: 12px;
  line-height: 1.2;
  color: #8aa2ba;
}

.multi-source-flow__file-name button {
  display: grid;
  width: 22px;
  height: 22px;
  padding: 0;
  place-items: center;
  color: #92afd0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 3px;
}

.multi-source-flow__file-name button:hover {
  color: #e26d72;
  background: #fff3f3;
}

.multi-source-flow__satellite-select {
  width: 100%;
}

.multi-source-flow__satellite-select :deep(.el-select__wrapper) {
  min-height: 30px;
  box-shadow: 0 0 0 1px #cde6f6 inset;
}

.multi-source-flow__satellite-select :deep(.el-select__selected-item),
.multi-source-flow__satellite-select :deep(.el-select__placeholder) {
  font-size: 14px;
}

.multi-source-flow__empty-upload {
  padding: 23px 0;
  margin-top: 10px;
  font-size: 13px;
  color: #9bb0c1;
  text-align: center;
  border-bottom: 1px solid #e1f0fa;
}

.multi-source-flow__page-action {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 15px 3px 0;
}

.multi-source-flow__page-action > span {
  font-size: 12px;
  line-height: 1.35;
  color: #8ba4bb;
}

.multi-source-flow__page-action :deep(.el-button) {
  min-height: 29px;
  padding: 6px 11px;
  margin: 0;
  font-size: 14px;
  border-radius: 3px;
}

.multi-source-flow__page-action--split {
  justify-content: flex-end;
}

.multi-source-flow__operation-list {
  display: grid;
  gap: 9px;
  margin-top: 13px;
}

.multi-source-flow__operation {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  min-height: 42px;
  padding: 8px 10px;
  margin: 0;
  background: #fbfeff;
  border: 1px solid #d9edf9;
  border-radius: 4px;
}

.multi-source-flow__operation:hover {
  background: #f2faff;
  border-color: #a4d9f5;
}

.multi-source-flow__operation :deep(.el-checkbox__input) {
  margin-top: 0;
}

.multi-source-flow__operation :deep(.el-checkbox__label) {
  min-width: 0;
  padding-left: 0;
}

.multi-source-flow__operation-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  color: #4276ab;
}

.multi-source-flow__processing {
  display: grid;
  min-height: 198px;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
}

.multi-source-flow__processing-orbit {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 3px;
  place-items: center;
  color: #269fe9;
  border: 1px solid #9bd7f6;
  border-radius: 50%;
  box-shadow: 0 0 0 7px rgba(137, 210, 247, 0.13);
}

.multi-source-flow__processing-orbit .el-icon {
  font-size: 21px;
  animation: multi-source-spin 1s linear infinite;
}

.multi-source-flow__processing strong {
  font-size: 16px;
  font-weight: 600;
  color: #4074a9;
}

.multi-source-flow__processing small,
.multi-source-flow__processing > span {
  max-width: 210px;
  font-size: 13px;
  line-height: 1.55;
  color: #859db6;
}

.multi-source-flow__processing > span {
  color: #43a6e5;
}

.multi-source-flow__result-card {
  display: grid;
  min-height: 185px;
  place-items: center;
  align-content: center;
  gap: 8px;
  margin-top: 13px;
  background: linear-gradient(135deg, #faffff 0%, #eef9ff 100%);
  border: 1px solid #cfeaf9;
  border-radius: 4px;
  text-align: center;
}

.multi-source-flow__result-mark {
  display: grid;
  width: 39px;
  height: 39px;
  place-items: center;
  font-size: 23px;
  color: #32ab80;
  background: #effbf6;
  border-radius: 50%;
}

.multi-source-flow__result-card > strong {
  font-size: 16px;
  font-weight: 600;
  color: #3c73a7;
}

.multi-source-flow__result-card > small {
  max-width: 82%;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.3;
  color: #829ab3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.multi-source-flow__result-card :deep(.el-button) {
  min-height: 31px;
  margin-top: 3px;
  font-size: 14px;
  border-radius: 3px;
}

.multi-source-slide-enter-active,
.multi-source-slide-leave-active {
  transition:
    opacity 210ms ease,
    transform 210ms ease;
}

.multi-source-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.multi-source-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

@keyframes multi-source-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .multi-source-flow__upload-trigger,
  .multi-source-flow__track-node,
  .multi-source-slide-enter-active,
  .multi-source-slide-leave-active {
    transition: none;
  }

  .multi-source-flow__processing-orbit .el-icon {
    animation: none;
  }
}

@media screen and (max-width: 1100px) {
  .multi-source-flow {
    padding-right: 10px;
    padding-left: 10px;
  }

  .multi-source-flow__track {
    margin-right: 1px;
    margin-left: 1px;
  }

  .multi-source-flow__track-step {
    font-size: 11px;
  }
}
</style>
