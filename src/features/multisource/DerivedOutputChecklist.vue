<template>
  <section class="derived-output-checklist" aria-label="派生输出状态">
    <div class="derived-output-checklist__heading">
      <span>派生输出</span>
      <small>由上方功能选择决定</small>
    </div>
    <div class="derived-output-checklist__items">
      <label v-for="item in items" :key="item.key">
        <input
          type="checkbox"
          :checked="visibleSteps.includes(item.key)"
          disabled
        />
        <i class="derived-output-checklist__indicator" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visibleSteps: readonly string[];
    items?: readonly { key: string; label: string }[];
  }>(),
  {
    items: () => [
      { key: "feature-extraction", label: "特征提取" },
      { key: "rgb-fusion", label: "多波段融合" },
      { key: "anomaly-detection", label: "显著性检测" }
    ]
  }
);
</script>
