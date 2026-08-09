<template>
  <div
    v-show="visible && positioned"
    ref="bubbleRef"
    class="chart_bubble z-[1000]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mousedown.stop
  >
    <echarts-dom
      ref="chartPanelRef"
      :active="visible"
      :analysis-data="analysisData"
      @close="emit('close')"
      @drag-start="onPanelDragStart"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";
import EchartsDom from "./echartsDom.vue";

const MARKER_OFFSET_X = 100;

const props = defineProps<{
  visible: boolean;
  lng?: number | null;
  lat?: number | null;
  analysisData?: any[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const x = ref(0);
const y = ref(0);
const positioned = ref(false);
const isManualPosition = ref(false);
const bubbleRef = ref<HTMLElement | null>(null);
const chartPanelRef = ref<InstanceType<typeof EchartsDom> | null>(null);
let postRenderRemover: (() => void) | null = null;

const onPanelDragStart = (e: MouseEvent) => {
  if (e.button !== 0) return;
  e.preventDefault();
  isManualPosition.value = true;
  const startX = e.clientX;
  const startY = e.clientY;
  const originX = x.value;
  const originY = y.value;

  const onMove = (ev: MouseEvent) => {
    x.value = originX + ev.clientX - startX;
    y.value = originY + ev.clientY - startY;
    chartPanelRef.value?.resize();
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
};

const toContainerPosition = (screen: Cesium.Cartesian2) => {
  const viewer = map.getViewer();
  const canvas = viewer.scene.canvas;
  const container = viewer.container as HTMLElement;
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: screen.x + MARKER_OFFSET_X + canvasRect.left - containerRect.left,
    y: screen.y + canvasRect.top - containerRect.top
  };
};

const updatePosition = () => {
  if (isManualPosition.value) return;
  if (!props.visible || props.lng == null || props.lat == null) {
    positioned.value = false;
    return;
  }
  const viewer = map.getViewer();
  if (!viewer?.scene) {
    positioned.value = false;
    return;
  }
  const cartesian = Cesium.Cartesian3.fromDegrees(props.lng, props.lat);
  const screen = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
    viewer.scene,
    cartesian
  );
  if (!screen || !Cesium.defined(screen)) {
    positioned.value = false;
    return;
  }
  const pos = toContainerPosition(screen);
  x.value = pos.x;
  y.value = pos.y;
  positioned.value = true;
  chartPanelRef.value?.resize();
};

const bindPostRender = () => {
  const viewer = map.getViewer();
  if (!viewer?.scene) return;
  const onPostRender = () => {
    if (!props.visible) return;
    updatePosition();
  };
  viewer.scene.postRender.addEventListener(onPostRender);
  postRenderRemover = () => {
    viewer.scene.postRender.removeEventListener(onPostRender);
  };
};

watch(
  () => [props.visible, props.lng, props.lat, props.analysisData] as const,
  ([visible, lng, lat], prev) => {
    if (!visible) {
      positioned.value = false;
      isManualPosition.value = false;
      return;
    }
    if (prev && (lng !== prev[1] || lat !== prev[2])) {
      isManualPosition.value = false;
    }
    updatePosition();
  },
  { deep: true }
);

onMounted(() => {
  map.readyPromise.then(() => {
    bindPostRender();
    updatePosition();
  });
});

onUnmounted(() => {
  postRenderRemover?.();
  postRenderRemover = null;
});
</script>

<style lang="less" scoped>
.chart_bubble {
  position: absolute;
  pointer-events: auto;
  transform: translateY(-50%);
}
</style>
