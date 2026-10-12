<template>
  <Teleport to="body">
    <section
      ref="panel"
      class="ignore-band-help"
      role="dialog"
      aria-modal="false"
      aria-label="波段说明"
      tabindex="-1"
      :style="panelStyle"
      @pointerdown.capture="activate"
      @focusin="activate"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <header class="ignore-band-help__header" @pointerdown="startDrag">
        <div>
          <strong>波段说明</strong>
          <span>{{ title }}</span>
        </div>
        <button type="button" aria-label="关闭波段说明" @click="emit('close')">
          ×
        </button>
      </header>
      <div
        class="ignore-band-help__body"
        :style="{ gridTemplateColumns: `${leftWidth}px 8px minmax(0, 1fr)` }"
      >
        <nav
          class="ignore-band-help__list"
          aria-label="浏览波段说明"
          tabindex="0"
        >
          <p>仅切换说明，不改变勾选</p>
          <section v-for="group in groups" :key="group.label">
            <h3 v-if="group.label">{{ group.label }}</h3>
            <button
              v-for="band in group.bands"
              :key="band.value"
              type="button"
              :aria-pressed="band.value === activeValue"
              @click="emit('select', band.value)"
            >
              <strong>{{ band.label }}</strong>
              <small>{{ band.category }}</small>
            </button>
          </section>
        </nav>
        <div
          class="ignore-band-help__splitter"
          role="separator"
          aria-label="调整波段列表与说明宽度"
          aria-orientation="vertical"
          :aria-valuemin="Math.round(splitBounds.minimum)"
          :aria-valuemax="Math.round(splitBounds.maximum)"
          :aria-valuenow="Math.round(leftWidth)"
          tabindex="0"
          @pointerdown="startInteraction('split', $event)"
          @keydown="resizeSplitWithKeyboard"
        />
        <article
          ref="detail"
          class="ignore-band-help__detail"
          aria-label="当前波段详情"
          tabindex="0"
        >
          <template v-if="activeBand">
            <h2 aria-live="polite">{{ activeBand.label }}</h2>
            <span class="ignore-band-help__purpose">{{
              activeBand.category
            }}</span>
            <dl>
              <dt>用途</dt>
              <dd>{{ activeBand.description }}</dd>
              <dt>常用搭配</dt>
              <dd>{{ activeBand.pairing }}</dd>
              <dt>光谱信息</dt>
              <dd>{{ activeBand.wavelength }}</dd>
            </dl>
          </template>
        </article>
      </div>
      <div
        v-for="handle in BAND_HELP_RESIZE_HANDLES"
        :key="handle"
        class="ignore-band-help__resize"
        :data-handle="handle"
        aria-hidden="true"
        @pointerdown.stop="startInteraction(handle, $event)"
      />
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";
import type { OutputBandOption } from "./outputBandOptions";
import { useFloatingPanelStack } from "./floatingPanelStack";
import { bandHelpPanelLayout } from "./bandHelpPanelState";
import {
  BAND_HELP_RESIZE_HANDLES,
  bandHelpSplitBounds,
  bandHelpSplitWidth,
  clampBandHelpValue,
  fitBandHelpRect,
  resizeBandHelpRect,
  type BandHelpRect,
  type BandHelpResizeHandle
} from "./bandHelpPanelGeometry";

const props = defineProps<{
  bands: readonly OutputBandOption[];
  activeValue: string | number;
  title: string;
}>();
const emit = defineEmits<{ select: [value: string | number]; close: [] }>();
const panel = ref<HTMLElement>();
const detail = ref<HTMLElement>();
const { panelZIndex, bringToFront } = useFloatingPanelStack();
const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight
});
const defaultRect = () => ({
  left: Math.max(8, (window.innerWidth - 720) / 2),
  top: 110,
  width: 720,
  height: 460
});
const rect = computed(
  () => bandHelpPanelLayout.rect ?? fitBandHelpRect(defaultRect(), viewport())
);
const panelStyle = computed(() => ({
  left: `${rect.value.left}px`,
  top: `${rect.value.top}px`,
  width: `${rect.value.width}px`,
  height: `${rect.value.height}px`,
  zIndex: panelZIndex("band-help")
}));
const splitBounds = computed(() => bandHelpSplitBounds(rect.value.width));
const leftWidth = computed(() =>
  bandHelpSplitWidth(rect.value.width, bandHelpPanelLayout.splitRatio)
);
const activeBand = computed(() =>
  props.bands.find(band => band.value === props.activeValue)
);
const groups = computed(() => {
  const grouped = new Map<string, OutputBandOption[]>();
  for (const band of props.bands) {
    const label = band.group ?? "";
    grouped.set(label, [...(grouped.get(label) ?? []), band]);
  }
  return [...grouped].map(([label, bands]) => ({ label, bands }));
});
type InteractionKind = "drag" | "split" | BandHelpResizeHandle;
let interaction: {
  kind: InteractionKind;
  pointerId: number;
  startX: number;
  startY: number;
  rect: BandHelpRect;
  leftWidth: number;
  target: HTMLElement;
} | null = null;

function activate() {
  bringToFront("band-help");
}
function startDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest("button")) return;
  startInteraction("drag", event);
}
function startInteraction(kind: InteractionKind, event: PointerEvent) {
  if (event.button !== 0) return;
  stopInteraction();
  event.preventDefault();
  activate();
  const target = event.currentTarget as HTMLElement;
  interaction = {
    kind,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    rect: { ...rect.value },
    leftWidth: leftWidth.value,
    target
  };
  target.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", moveInteraction);
  window.addEventListener("pointerup", stopInteraction);
  window.addEventListener("pointercancel", stopInteraction);
  window.addEventListener("blur", stopInteraction);
}
function setSplitWidth(width: number) {
  const bounds = splitBounds.value;
  bandHelpPanelLayout.splitRatio =
    clampBandHelpValue(width, bounds.minimum, bounds.maximum) /
    bounds.available;
}
function moveInteraction(event: PointerEvent) {
  if (!interaction || event.pointerId !== interaction.pointerId) return;
  const deltaX = event.clientX - interaction.startX;
  const deltaY = event.clientY - interaction.startY;
  if (interaction.kind === "split") {
    setSplitWidth(interaction.leftWidth + deltaX);
  } else if (interaction.kind === "drag") {
    bandHelpPanelLayout.rect = fitBandHelpRect(
      {
        ...interaction.rect,
        left: interaction.rect.left + deltaX,
        top: interaction.rect.top + deltaY
      },
      viewport()
    );
  } else {
    bandHelpPanelLayout.rect = resizeBandHelpRect(
      interaction.rect,
      interaction.kind,
      deltaX,
      deltaY,
      viewport()
    );
  }
}
function stopInteraction() {
  if (interaction?.target.hasPointerCapture(interaction.pointerId))
    interaction.target.releasePointerCapture(interaction.pointerId);
  interaction = null;
  window.removeEventListener("pointermove", moveInteraction);
  window.removeEventListener("pointerup", stopInteraction);
  window.removeEventListener("pointercancel", stopInteraction);
  window.removeEventListener("blur", stopInteraction);
}
function resizeSplitWithKeyboard(event: KeyboardEvent) {
  let width = leftWidth.value;
  if (event.key === "ArrowLeft") width -= 16;
  else if (event.key === "ArrowRight") width += 16;
  else if (event.key === "Home") width = splitBounds.value.minimum;
  else if (event.key === "End") width = splitBounds.value.maximum;
  else return;
  event.preventDefault();
  setSplitWidth(width);
}
function syncViewport() {
  stopInteraction();
  bandHelpPanelLayout.rect = fitBandHelpRect(rect.value, viewport());
}
async function revealActiveBand() {
  await nextTick();
  panel.value
    ?.querySelector<HTMLElement>('nav button[aria-pressed="true"]')
    ?.scrollIntoView({ block: "nearest" });
  detail.value?.scrollTo({ top: 0 });
}
watch(() => props.activeValue, revealActiveBand);
onMounted(() => {
  syncViewport();
  activate();
  panel.value?.focus({ preventScroll: true });
  revealActiveBand();
  window.addEventListener("resize", syncViewport);
});
onBeforeUnmount(() => {
  stopInteraction();
  window.removeEventListener("resize", syncViewport);
});
</script>

<style scoped>
.ignore-band-help {
  position: fixed;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  font:
    13px/1.6 "Segoe UI",
    "Microsoft YaHei",
    sans-serif;
  color: #183247;
  background: #fff;
  border: 1px solid #afcbd8;
  border-radius: 8px;
  box-shadow: 0 12px 40px rgb(20 53 75 / 22%);
}

.ignore-band-help *,
.ignore-band-help *::before,
.ignore-band-help *::after {
  box-sizing: border-box;
}

.ignore-band-help__header {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 10px 16px;
  touch-action: none;
  cursor: move;
  user-select: none;
  background: #e7f4f9;
  border-bottom: 1px solid #d5e2e9;
  border-radius: 8px 8px 0 0;
}

.ignore-band-help__header div {
  min-width: 0;
}

.ignore-band-help__header strong {
  display: block;
  font-size: 15px;
}

.ignore-band-help__header span {
  display: block;
  font-size: 11px;
  color: #63798a;
  overflow-wrap: anywhere;
}

.ignore-band-help__header button {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 23px;
  color: #426477;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.ignore-band-help__body {
  display: grid;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.ignore-band-help__list,
.ignore-band-help__detail {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.ignore-band-help__list {
  padding: 12px;
  background: #f5f9fb;
}

.ignore-band-help__list p {
  margin: 0 0 10px;
  font-size: 11px;
  color: #63798a;
}

.ignore-band-help__list h3 {
  margin: 12px 0 6px;
  font-size: 12px;
  color: #526c7c;
}

.ignore-band-help__list button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 6px;
  font: inherit;
  color: #36566b;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d5e2e9;
  border-radius: 5px;
}

.ignore-band-help__list button strong,
.ignore-band-help__list button small {
  display: block;
  overflow-wrap: anywhere;
}

.ignore-band-help__list button small {
  margin-top: 2px;
  font-size: 11px;
  color: #63798a;
}

.ignore-band-help__list button[aria-pressed="true"] {
  color: #0f6076;
  background: #e7f4f7;
  border-color: #187f9c;
  box-shadow: inset 3px 0 #187f9c;
}

.ignore-band-help__splitter {
  position: relative;
  touch-action: none;
  cursor: col-resize;
  background: #edf3f6;
}

.ignore-band-help__splitter::after {
  position: absolute;
  top: 45%;
  bottom: 45%;
  left: 3px;
  width: 2px;
  min-height: 20px;
  content: "";
  background: #94b1c1;
  border-radius: 2px;
}

.ignore-band-help__splitter:hover {
  background: #d5e8f1;
}

.ignore-band-help__detail {
  padding: 20px;
}

.ignore-band-help__detail h2 {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.ignore-band-help__purpose {
  display: inline-block;
  padding: 3px 8px;
  color: #0f6076;
  background: #e7f4f7;
  border-radius: 4px;
}

.ignore-band-help__detail dl {
  margin: 20px 0;
}

.ignore-band-help__detail dt {
  margin-top: 18px;
  font-size: 12px;
  font-weight: 700;
  color: #63798a;
}

.ignore-band-help__detail dd {
  margin: 5px 0 0;
  overflow-wrap: anywhere;
}

.ignore-band-help button:focus-visible,
.ignore-band-help [tabindex="0"]:focus-visible {
  outline: 2px solid #187f9c;
  outline-offset: -2px;
}

.ignore-band-help__resize {
  position: absolute;
  touch-action: none;
}

.ignore-band-help__resize[data-handle="n"],
.ignore-band-help__resize[data-handle="s"] {
  right: 10px;
  left: 10px;
  height: 8px;
  cursor: ns-resize;
}

.ignore-band-help__resize[data-handle="n"] {
  top: -4px;
}

.ignore-band-help__resize[data-handle="s"] {
  bottom: -4px;
}

.ignore-band-help__resize[data-handle="e"],
.ignore-band-help__resize[data-handle="w"] {
  top: 10px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.ignore-band-help__resize[data-handle="e"] {
  right: -4px;
}

.ignore-band-help__resize[data-handle="w"] {
  left: -4px;
}

.ignore-band-help__resize[data-handle="ne"],
.ignore-band-help__resize[data-handle="nw"],
.ignore-band-help__resize[data-handle="se"],
.ignore-band-help__resize[data-handle="sw"] {
  width: 14px;
  height: 14px;
}

.ignore-band-help__resize[data-handle="ne"] {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.ignore-band-help__resize[data-handle="nw"] {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.ignore-band-help__resize[data-handle="se"] {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.ignore-band-help__resize[data-handle="sw"] {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}
</style>
