<template>
  <section class="storage-policy" aria-labelledby="storage-policy-heading">
    <header class="storage-policy__heading">
      <div>
        <h2 id="storage-policy-heading">工作空间清理策略</h2>
        <p>策略仅影响之后符合条件的扫描对象。</p>
      </div>
      <el-tag effect="plain">{{ policy?.workspaceKey || "default" }}</el-tag>
    </header>

    <el-form
      ref="formRef"
      :model="draft"
      :rules="rules"
      label-position="top"
      class="storage-policy__form"
    >
      <el-form-item label="原始输入保留期" prop="inputRetentionDays">
        <el-input-number
          v-model="draft.inputRetentionDays"
          :min="0"
          :max="3650"
          :precision="0"
          controls-position="right"
          :disabled="disabled"
        />
        <span class="storage-policy__unit">天</span>
        <small>0 表示不设置自动过期时间。</small>
      </el-form-item>

      <el-form-item label="Worker 目录清理间隔" prop="workerDirectoryTtlHours">
        <el-input-number
          v-model="draft.workerDirectoryTtlHours"
          :min="1"
          :max="8760"
          :precision="0"
          controls-position="right"
          :disabled="disabled"
        />
        <span class="storage-policy__unit">小时</span>
        <small>默认 48 小时，独立于源文件和任务产物。</small>
      </el-form-item>

      <el-form-item label="孤立上传清理间隔" prop="orphanUploadTtlHours">
        <el-input-number
          v-model="draft.orphanUploadTtlHours"
          :min="24"
          :max="8760"
          :precision="0"
          controls-position="right"
          :disabled="disabled"
        />
        <span class="storage-policy__unit">小时</span>
        <small>至少 24 小时，避免清理仍在上传的文件。</small>
      </el-form-item>

      <el-form-item label="自动清理" prop="autoCleanupEnabled">
        <el-switch
          v-model="draft.autoCleanupEnabled"
          :disabled="disabled"
          active-text="启用"
          inactive-text="停用"
          @change="confirmAutoCleanup"
        />
      </el-form-item>

      <el-alert
        :closable="false"
        type="info"
        show-icon
        title="启用自动清理后，已有历史记录不会自动纳入清理范围。"
      />

      <div class="storage-policy__actions">
        <el-button :disabled="disabled" @click="restorePolicy"
          >恢复当前策略</el-button
        >
        <el-button
          type="primary"
          :loading="saving"
          :disabled="disabled"
          @click="submit"
        >
          保存策略
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import type {
  WorkspaceStoragePolicy,
  WorkspaceStoragePolicyRequest
} from "@/api/multiSourceSatellite";

interface PolicyDraft {
  inputRetentionDays: number;
  workerDirectoryTtlHours: number;
  orphanUploadTtlHours: number;
  autoCleanupEnabled: boolean;
}

const props = withDefaults(
  defineProps<{
    policy: WorkspaceStoragePolicy | null;
    saving?: boolean;
  }>(),
  { saving: false }
);

const emit = defineEmits<{
  save: [request: WorkspaceStoragePolicyRequest];
}>();

const formRef = ref<FormInstance>();
const draft = reactive<PolicyDraft>({
  inputRetentionDays: 14,
  workerDirectoryTtlHours: 48,
  orphanUploadTtlHours: 24,
  autoCleanupEnabled: false
});

const rules: FormRules<PolicyDraft> = {
  inputRetentionDays: [
    {
      type: "number",
      min: 0,
      max: 3650,
      message: "请输入 0 至 3650 天",
      trigger: "change"
    }
  ],
  workerDirectoryTtlHours: [
    {
      type: "number",
      min: 1,
      max: 8760,
      message: "请输入至少 1 小时",
      trigger: "change"
    }
  ],
  orphanUploadTtlHours: [
    {
      type: "number",
      min: 24,
      max: 8760,
      message: "孤立上传清理间隔不得少于 24 小时",
      trigger: "change"
    }
  ]
};

const disabled = computed(() => !props.policy || props.saving);

function applyPolicy(policy: WorkspaceStoragePolicy | null) {
  if (!policy) return;
  Object.assign(draft, {
    inputRetentionDays: policy.inputRetentionDays,
    workerDirectoryTtlHours: policy.workerDirectoryTtlHours,
    orphanUploadTtlHours: policy.orphanUploadTtlHours,
    autoCleanupEnabled: policy.autoCleanupEnabled
  });
}

watch(() => props.policy, applyPolicy, { immediate: true });

function restorePolicy() {
  applyPolicy(props.policy);
  formRef.value?.clearValidate();
}

async function confirmAutoCleanup(enabled: boolean) {
  if (!enabled) return;
  try {
    await ElMessageBox.confirm(
      "自动清理将在之后的计划扫描中执行。已有历史记录不会自动纳入清理范围。",
      "启用自动清理",
      {
        confirmButtonText: "启用自动清理",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    draft.autoCleanupEnabled = false;
  }
}

async function submit() {
  if (!props.policy) return;
  const valid = await formRef.value?.validate();
  if (!valid) return;
  emit("save", {
    ...draft,
    expectedVersion: props.policy.version
  });
}
</script>

<style scoped lang="scss">
.storage-policy {
  padding: 18px;
  background: #fff;
  border: 1px solid #dfe4e8;
  border-radius: 6px;
}

.storage-policy__heading {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #e7ebee;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #303841;
  }

  p {
    margin-top: 3px;
    font-size: 13px;
    line-height: 20px;
    color: #74808b;
  }
}

.storage-policy__form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 18px;
  padding-top: 16px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 5px;
    font-size: 13px;
    line-height: 20px;
    color: #47515b;
  }

  :deep(.el-input-number) {
    width: 132px;
  }
}

.storage-policy__unit {
  margin-left: 8px;
  font-size: 13px;
  color: #66717c;
}

.storage-policy__form small {
  display: block;
  width: 100%;
  margin-top: 5px;
  font-size: 12px;
  line-height: 18px;
  color: #85909a;
}

.storage-policy__form :deep(.el-alert) {
  grid-column: 1 / -1;
  margin-top: 4px;
}

.storage-policy__actions {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}

@media (width <= 800px) {
  .storage-policy__form {
    grid-template-columns: 1fr;
  }
}
</style>
