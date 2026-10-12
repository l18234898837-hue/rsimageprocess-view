<template>
  <div
    class="output-band-picker"
    :style="{ '--output-band-columns': String(columns) }"
    :aria-label="ariaLabel"
  >
    <div class="output-band-picker__summary">
      <span>已选 {{ selectedBands.length }} / {{ bands.length }}</span>
    </div>
    <div
      v-if="presets.length"
      class="output-band-picker__presets"
      role="group"
      aria-label="按用途选择输出波段"
    >
      <span>按用途选择</span>
      <el-tooltip
        v-for="preset in presets"
        :key="preset.label"
        :content="presetHelpText(preset)"
        placement="top"
        effect="light"
        :trigger="['hover', 'focus']"
        :trigger-keys="[]"
        :show-after="180"
        :popper-style="{
          maxWidth: 'min(420px, calc(100vw - 32px))',
          overflowWrap: 'anywhere'
        }"
      >
        <button
          type="button"
          :aria-pressed="isPresetSelected(preset)"
          :disabled="disabled"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </el-tooltip>
    </div>
    <p class="output-band-picker__hint">
      选择要写入标准产品的波段；后续多波段融合和显著性检测只能使用已选波段。
      <template v-if="presets.length"
        >快捷选择仅调整输出波段，不改变融合组合或检测来源。</template
      >
    </p>
    <component
      :is="collapseGroups ? 'details' : 'section'"
      v-for="(group, groupIndex) in groupedBands"
      :key="group.label"
      class="output-band-picker__group"
      :open="collapseGroups && groupIndex === 0"
    >
      <summary v-if="collapseGroups" class="output-band-picker__group-title">
        {{ group.label }}
        <small
          >已选
          {{
            group.bands.filter(band => selectedBands.includes(band.value))
              .length
          }}
          / {{ group.bands.length }}</small
        >
      </summary>
      <div v-else-if="group.showLabel" class="output-band-picker__group-title">
        {{ group.label }}
      </div>
      <div class="output-band-picker__grid">
        <div
          v-for="band in group.bands"
          :key="String(band.value)"
          :class="[
            'output-band-picker__option',
            `is-${band.tone ?? 'standard'}`,
            { 'is-selected': selectedBands.includes(band.value) }
          ]"
        >
          <label class="output-band-picker__selection">
            <span class="output-band-picker__accent" aria-hidden="true" />
            <input
              v-model="selectedBands"
              type="checkbox"
              :value="band.value"
              :disabled="disabled"
              :aria-label="band.label"
            />
            <strong>{{ band.label }}</strong>
            <small>{{ band.category }}</small>
          </label>
          <button
            type="button"
            class="output-band-picker__info"
            :aria-label="`查看${band.label}说明`"
            :aria-expanded="
              activeBandHelpOwner === panelOwner &&
              activeBand?.value === band.value
            "
            @click="openBandHelp(band.value, $event)"
          >
            说明
          </button>
        </div>
      </div>
    </component>
    <BandHelpFloatingPanel
      v-if="activeBandHelpOwner === panelOwner && activeValue !== null"
      :bands="bands"
      :active-value="activeValue"
      :title="ariaLabel"
      @select="activeValue = $event"
      @close="closeBandHelp"
    />
    <p class="output-band-picker__detail-hint">
      点击卡片“说明”打开波段说明浮窗，不改变勾选。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import BandHelpFloatingPanel from "./BandHelpFloatingPanel.vue";
import { activeBandHelpOwner } from "./bandHelpPanelState";
import { useFloatingPanelStack } from "./floatingPanelStack";
import {
  bandsForPreset,
  type OutputBandOption,
  type OutputBandPreset
} from "./outputBandOptions";

const selectedBands = defineModel<(string | number)[]>({ required: true });
const props = withDefaults(
  defineProps<{
    bands: readonly OutputBandOption[];
    presets?: readonly OutputBandPreset[];
    columns?: number;
    disabled?: boolean;
    helpEnabled?: boolean;
    collapseGroups?: boolean;
    ariaLabel?: string;
  }>(),
  {
    presets: () => [],
    columns: 2,
    disabled: false,
    helpEnabled: true,
    collapseGroups: false,
    ariaLabel: "输出波段选择"
  }
);

const panelOwner = Symbol("band-help");
const { bringToFront } = useFloatingPanelStack();
const activeValue = ref<string | number | null>(null);
let helpTrigger: HTMLElement | null = null;
function openBandHelp(value: string | number, event: MouseEvent) {
  if (!props.helpEnabled) return;
  activeValue.value = value;
  helpTrigger = event.currentTarget as HTMLElement;
  activeBandHelpOwner.value = panelOwner;
  bringToFront("band-help");
}
async function closeBandHelp() {
  if (activeBandHelpOwner.value !== panelOwner) return;
  activeBandHelpOwner.value = null;
  await nextTick();
  if (helpTrigger?.isConnected && helpTrigger.getClientRects().length)
    helpTrigger.focus({ preventScroll: true });
}
onBeforeUnmount(() => {
  if (activeBandHelpOwner.value === panelOwner)
    activeBandHelpOwner.value = null;
});
watch(
  () => props.helpEnabled,
  enabled => {
    if (!enabled && activeBandHelpOwner.value === panelOwner)
      activeBandHelpOwner.value = null;
  }
);
const activeBand = computed(() =>
  props.bands.find(band => band.value === activeValue.value)
);
function applyPreset(preset: OutputBandPreset) {
  if (!props.disabled)
    selectedBands.value = bandsForPreset(preset, props.bands);
}
function presetHelpText(preset: OutputBandPreset) {
  const labels = bandsForPreset(preset, props.bands).map(
    value => props.bands.find(band => band.value === value)?.label
  );
  return `${preset.description} 选中波段：${labels.join("、")}。`;
}
function isPresetSelected(preset: OutputBandPreset) {
  return (
    selectedBands.value.length === preset.bands.length &&
    preset.bands.every(value => selectedBands.value.includes(value))
  );
}
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
