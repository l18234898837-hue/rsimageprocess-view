<template>
  <div
    class="output-band-picker"
    :style="{ '--output-band-columns': String(columns) }"
    :aria-label="ariaLabel"
  >
    <div class="output-band-picker__summary">
      <span>已选 {{ selectedBands.length }} / {{ bands.length }}</span>
    </div>
    <p class="output-band-picker__hint">
      选择要写入标准产品的波段；后续 RGB 融合和显著性检测只能使用已选波段。
    </p>
    <section
      v-for="group in groupedBands"
      :key="group.label"
      class="output-band-picker__group"
    >
      <div v-if="group.showLabel" class="output-band-picker__group-title">
        {{ group.label }}
      </div>
      <div class="output-band-picker__grid">
        <label
          v-for="band in group.bands"
          :key="String(band.value)"
          :class="[
            'output-band-picker__option',
            `is-${band.tone ?? 'standard'}`,
            { 'is-selected': selectedBands.includes(band.value) }
          ]"
          :title="band.description ?? `${band.label}，${band.category}`"
        >
          <input
            v-model="selectedBands"
            type="checkbox"
            :value="band.value"
            :disabled="disabled"
          />
          <span class="output-band-picker__accent" aria-hidden="true" />
          <strong>{{ band.label }}</strong>
          <small>{{ band.category }}</small>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface OutputBandOption {
  value: string | number;
  label: string;
  category: string;
  description?: string;
  tone?: "blue" | "green" | "red" | "infrared" | "thermal" | "standard";
  group?: string;
}

const selectedBands = defineModel<(string | number)[]>({ required: true });
const props = withDefaults(
  defineProps<{
    bands: readonly OutputBandOption[];
    columns?: number;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    columns: 4,
    disabled: false,
    ariaLabel: "输出波段选择"
  }
);

const groupedBands = computed(() => {
  const groups = new Map<string, OutputBandOption[]>();
  for (const band of props.bands) {
    const label = band.group ?? "";
    groups.set(label, [...(groups.get(label) ?? []), band]);
  }
  return [...groups].map(([label, bands]) => ({
    label,
    bands,
    showLabel: groups.size > 1
  }));
});
</script>
