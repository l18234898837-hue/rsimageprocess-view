<template>
  <div class="feature-metric-picker" role="group" aria-label="特征选择">
    <label
      v-for="metric in metrics"
      :key="metric.value"
      class="feature-metric-picker__item"
      :class="{ 'is-selected': isSelected(metric.value) }"
    >
      <input
        type="checkbox"
        :checked="isSelected(metric.value)"
        :disabled="disabled"
        @change="toggle(metric.value, $event)"
      />
      <span class="feature-metric-picker__content">
        <span class="feature-metric-picker__heading">
          <strong>{{ metric.label }}</strong>
          <ParameterHint :label="metric.label" :text="metric.detail" />
        </span>
      </span>
      <span
        class="feature-metric-picker__meta"
        :title="`用途：${metric.description} · ${metric.output}`"
      >
        用途：{{ metric.description }} · {{ metric.output }}
      </span>
      <span
        v-if="
          metric.value === 'local_variance' &&
          isSelected(metric.value) &&
          $slots['local-variance']
        "
        class="feature-metric-picker__inline-parameter"
      >
        <slot name="local-variance" />
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import ParameterHint from "./ParameterHint.vue";
import type { FeatureMetricOption } from "./featureMetricLabels";

const props = withDefaults(
  defineProps<{
    modelValue: readonly string[];
    metrics: readonly FeatureMetricOption[];
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

function isSelected(metric: string) {
  return props.modelValue.includes(metric);
}

function toggle(metric: string, event: Event) {
  const selected = (event.target as HTMLInputElement).checked;
  const next = selected
    ? [...new Set([...props.modelValue, metric])]
    : props.modelValue.filter(value => value !== metric);
  emit("update:modelValue", next);
}
</script>
