<template>
  <main v-if="isAdministrator" class="processing-storage">
    <header class="processing-storage__heading">
      <div>
        <h1>处理存储管理</h1>
        <p>按原始输入、任务产物和运行目录分别查看占用与清理策略。</p>
      </div>
      <el-tooltip content="刷新统计与策略" placement="bottom">
        <el-button
          :icon="Refresh"
          circle
          :loading="isLoading"
          aria-label="刷新统计与策略"
          @click="refresh"
        />
      </el-tooltip>
    </header>

    <StorageSummaryCards :summary="summary" :loading="isLoading" />

    <StoragePolicyForm :policy="policy" :saving="isSaving" @save="savePolicy" />
  </main>

  <main v-else class="processing-storage processing-storage--forbidden">
    <el-result
      icon="warning"
      title="无权访问存储管理"
      sub-title="仅管理员可以查看和修改工作空间清理策略。"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { useUserStoreHook } from "@/store/modules/user";
import StorageSummaryCards from "@/components/ProcessingStorage/StorageSummaryCards.vue";
import StoragePolicyForm from "@/components/ProcessingStorage/StoragePolicyForm.vue";
import {
  getProcessingStoragePolicy,
  getProcessingStorageSummary,
  updateProcessingStoragePolicy,
  type ProcessingStorageSummaryResponse,
  type WorkspaceStoragePolicy,
  type WorkspaceStoragePolicyRequest
} from "@/api/multiSourceSatellite";

const userStore: any = useUserStoreHook();
const summary = ref<ProcessingStorageSummaryResponse | null>(null);
const policy = ref<WorkspaceStoragePolicy | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isAdministrator = computed(
  () => userStore.roles?.includes("admin") ?? false
);

function responseData<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("后端响应缺少数据");
  return response.data;
}

function isPolicyConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const response = (
    error as {
      response?: { status?: number; data?: { code?: number } };
    }
  ).response;
  return response?.status === 409 || response?.data?.code === 409;
}

async function loadPolicy() {
  const response = await getProcessingStoragePolicy();
  policy.value = responseData(response);
}

async function refresh() {
  if (!isAdministrator.value) return;
  isLoading.value = true;
  try {
    const [summaryResponse] = await Promise.all([
      getProcessingStorageSummary(),
      loadPolicy()
    ]);
    summary.value = responseData(summaryResponse);
  } catch (error) {
    message(error instanceof Error ? error.message : "加载存储管理信息失败", {
      type: "error"
    });
  } finally {
    isLoading.value = false;
  }
}

async function savePolicy(request: WorkspaceStoragePolicyRequest) {
  if (!policy.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const response = await updateProcessingStoragePolicy(
      request,
      policy.value.workspaceKey
    );
    policy.value = responseData(response);
    message("工作空间清理策略已保存", { type: "success" });
  } catch (error) {
    if (isPolicyConflict(error)) {
      try {
        await loadPolicy();
        message("策略已被其他管理员更新，已加载最新版本，请确认后重新保存。", {
          type: "warning"
        });
      } catch (reloadError) {
        message(
          reloadError instanceof Error
            ? reloadError.message
            : "策略已发生冲突，重新加载最新版本失败",
          { type: "error" }
        );
      }
      return;
    }
    message(error instanceof Error ? error.message : "保存清理策略失败", {
      type: "error"
    });
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  if (isAdministrator.value) void refresh();
});

watch(isAdministrator, administrator => {
  if (administrator && !policy.value) void refresh();
});
</script>

<style scoped lang="scss">
.processing-storage {
  display: grid;
  gap: 16px;
  width: min(1180px, 100%);
  min-height: 100%;
  padding: 22px;
  margin: 0 auto;
  color: #303841;
  background: #f5f7f8;
}

.processing-storage__heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #dfe4e8;

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 28px;
  }

  p {
    margin-top: 4px;
    font-size: 13px;
    line-height: 20px;
    color: #6f7a84;
  }
}

.processing-storage--forbidden {
  display: grid;
  place-items: center;
}

@media (width <= 600px) {
  .processing-storage {
    padding: 16px;
  }
}
</style>
