<template>
  <section class="storage-summary" aria-label="存储统计">
    <div v-loading="loading" class="storage-summary__grid">
      <article
        v-for="item in cards"
        :key="item.label"
        class="storage-summary__card"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.detail }}</small>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ProcessingStorageSummaryResponse } from "@/api/multiSourceSatellite";

const props = withDefaults(
  defineProps<{
    summary: ProcessingStorageSummaryResponse | null;
    loading?: boolean;
  }>(),
  { loading: false }
);

function formatBytes(value?: number): string {
  if (!Number.isFinite(value) || !value || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

const cards = computed(() => {
  const summary = props.summary;
  return [
    {
      label: "原始输入",
      value: formatBytes(summary?.sourceBytes),
      detail: "受源文件保留策略管理"
    },
    {
      label: "任务产物",
      value: formatBytes(summary?.artifactBytes),
      detail: "任务输出与中间产物"
    },
    {
      label: "Worker 目录",
      value: formatBytes(summary?.workerBytes),
      detail: "独立于任务保留期"
    },
    {
      label: "ZIP / 孤立上传",
      value: formatBytes(summary?.zipBytes),
      detail: "待识别的压缩包与孤立文件"
    },
    {
      label: "可回收空间",
      value: formatBytes(summary?.reclaimableBytes),
      detail: "符合当前清理条件的数据"
    },
    {
      label: "清理失败",
      value: `${summary?.cleanupFailures ?? 0} 项`,
      detail: "下次扫描会再次尝试"
    }
  ];
});
</script>

<style scoped lang="scss">
.storage-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.storage-summary__card {
  display: grid;
  min-height: 116px;
  padding: 14px 16px;
  color: #3c4650;
  background: #fff;
  border: 1px solid #dfe4e8;
  border-radius: 6px;

  span {
    font-size: 13px;
    line-height: 20px;
    color: #66717c;
  }

  strong {
    align-self: center;
    font-size: 22px;
    font-weight: 600;
    line-height: 28px;
  }

  small {
    align-self: end;
    font-size: 12px;
    line-height: 18px;
    color: #8a949e;
  }
}

@media (width <= 880px) {
  .storage-summary__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 560px) {
  .storage-summary__grid {
    grid-template-columns: 1fr;
  }
}
</style>
