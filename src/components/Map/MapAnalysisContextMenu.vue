<template>
  <div
    v-show="visible"
    ref="menuRootRef"
    class="context-menu z-[1000]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mousedown.stop
    @contextmenu.prevent
  >
    <analysis-mode-panel @select="onSelect" @close="onClose" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";
import AnalysisModePanel from "./AnalysisModePanel.vue";

const emit = defineEmits<{
  select: [mode: "point" | "rectangle"];
  close: [];
}>();

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const menuRootRef = ref<HTMLElement | null>(null);
let menuHandler: Cesium.ScreenSpaceEventHandler | null = null;

const hide = () => {
  visible.value = false;
};

const onSelect = (mode: "point" | "rectangle") => {
  hide();
  emit("select", mode);
};

const onClose = () => {
  hide();
  map.clearDrawEntity();
  emit("close");
};

const onDocumentPointerDown = (e: MouseEvent) => {
  if (!visible.value) return;
  if (menuRootRef.value?.contains(e.target as Node)) return;
  if (map.isDrawPickActive()) return;
  hide();
};

defineExpose({ hide });

const getMenuPosition = (event: { position: Cesium.Cartesian2 }) => {
  const viewer = map.getViewer();
  const canvas = viewer.scene.canvas;
  const container = viewer.container as HTMLElement;
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: event.position.x + canvasRect.left - containerRect.left,
    y: event.position.y + canvasRect.top - containerRect.top
  };
};

const bindMapRightClick = () => {
  const viewer = map.getViewer();
  if (!viewer?.scene?.canvas) return;

  menuHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  menuHandler.setInputAction(event => {
    if (map.isDrawPickActive()) return;
    const pos = getMenuPosition(event);
    x.value = pos.x;
    y.value = pos.y;
    visible.value = true;
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
};

onMounted(() => {
  map.readyPromise.then(() => {
    bindMapRightClick();
  });
  document.addEventListener("mousedown", onDocumentPointerDown);
});

onUnmounted(() => {
  menuHandler?.destroy();
  menuHandler = null;
  document.removeEventListener("mousedown", onDocumentPointerDown);
});
</script>

<style lang="less" scoped>
.context-menu {
  position: absolute;
  pointer-events: auto;
}
</style>
