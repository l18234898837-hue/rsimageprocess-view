<template>
  <div class="roi-map-picker">
    <div class="roi-map-picker__actions">
      <button
        type="button"
        :class="[
          'roi-map-picker__button',
          'roi-map-picker__button--draw',
          { 'is-active': drawingActive }
        ]"
        :disabled="disabled || !bounds"
        :title="
          drawingActive
            ? '关闭地图框选，取消当前绘制'
            : '在地图上拖动框选处理范围，范围不能超出数据覆盖区域'
        "
        :aria-label="drawingActive ? '关闭地图框选' : '在地图上框选 ROI'"
        @click="toggleDrawing"
      >
        {{ drawingActive ? "关闭框选" : "地图框选" }}
      </button>
      <button
        type="button"
        class="roi-map-picker__button roi-map-picker__button--secondary"
        :disabled="disabled"
        title="使用上传数据的完整覆盖范围，不裁剪处理区域"
        aria-label="使用数据全幅，关闭范围裁剪"
        @click="useFullExtent"
      >
        使用全幅
      </button>
    </div>
    <p v-if="!bounds" class="roi-map-picker__message is-warning">
      上传并解析定位元数据后才能框选 ROI。
    </p>
    <p v-else class="roi-map-picker__message">
      可选范围：{{ formatBounds(bounds) }}。框选结果必须完全落在数据覆盖范围内。
    </p>
    <p v-if="errorMessage" class="roi-map-picker__message is-error">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";

export type RoiBounds = [number, number, number, number];

const props = withDefaults(
  defineProps<{
    modelValue: RoiBounds | null;
    bounds: RoiBounds | null;
    disabled?: boolean;
  }>(),
  { disabled: false }
);
const emit = defineEmits<{
  "update:modelValue": [value: RoiBounds | null];
}>();
const errorMessage = ref("");
const drawingActive = ref(false);
const footprintEntityId = "multisource-roi-footprint";

function isContained(roi: RoiBounds, bounds: RoiBounds) {
  return (
    roi[0] >= bounds[0] &&
    roi[1] >= bounds[1] &&
    roi[2] <= bounds[2] &&
    roi[3] <= bounds[3] &&
    roi[0] < roi[2] &&
    roi[1] < roi[3]
  );
}

function showFootprint() {
  const viewer = map.getViewer();
  if (!viewer || !props.bounds) return;
  const [west, south, east, north] = props.bounds;
  const existing = viewer.entities.getById(footprintEntityId);
  if (existing) viewer.entities.remove(existing);
  viewer.entities.add({
    id: footprintEntityId,
    name: "数据覆盖范围",
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        west,
        south,
        east,
        south,
        east,
        north,
        west,
        north,
        west,
        south
      ]),
      width: 3,
      material: Cesium.Color.fromCssColorString("#00e5ff"),
      depthFailMaterial: Cesium.Color.fromCssColorString("#00e5ff"),
      clampToGround: true
    }
  });
}

function toggleDrawing() {
  if (drawingActive.value) {
    map.clearDrawEntity();
    drawingActive.value = false;
    errorMessage.value = "";
    return;
  }
  startDrawing();
}

function startDrawing() {
  if (props.disabled || !props.bounds) return;
  errorMessage.value = "";
  drawingActive.value = true;
  showFootprint();
  const viewer = map.getViewer();
  if (viewer) {
    const [west, south, east, north] = props.bounds;
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(west, south, east, north)
    });
  }
  map.drawRectangle(
    (_wkt, _geojson, points) => {
      if (!points || points.length < 4) return;
      const lons = points.map(point => point.lng);
      const lats = points.map(point => point.lat);
      const roi: RoiBounds = [
        Math.min(...lons),
        Math.min(...lats),
        Math.max(...lons),
        Math.max(...lats)
      ];
      if (!isContained(roi, props.bounds!)) {
        errorMessage.value = "ROI 超出上传数据覆盖范围，请重新框选。";
        map.clearDrawEntity();
        drawingActive.value = false;
        return;
      }
      errorMessage.value = "";
      emit("update:modelValue", roi);
      drawingActive.value = false;
    },
    { onCancel: () => (drawingActive.value = false) }
  );
}

function useFullExtent() {
  if (!props.bounds) return;
  map.clearDrawEntity();
  drawingActive.value = false;
  errorMessage.value = "";
  emit("update:modelValue", null);
}

function formatBounds(bounds: RoiBounds) {
  return bounds.map(value => value.toFixed(4)).join(", ");
}

watch(
  () => props.bounds,
  bounds => {
    if (map.getViewer()) map.clearDrawEntity();
    drawingActive.value = false;
    const viewer = map.getViewer();
    const existing = viewer?.entities.getById(footprintEntityId);
    if (existing && viewer) viewer.entities.remove(existing);
    if (bounds) {
      void map.readyPromise.then(() => {
        showFootprint();
        const viewer = map.getViewer();
        if (viewer) {
          const [west, south, east, north] = bounds;
          viewer.camera.flyTo({
            destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
            duration: 0.6
          });
        }
      });
    }
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  void map.readyPromise.then(showFootprint);
});

onBeforeUnmount(() => {
  const viewer = map.getViewer();
  const entity = viewer?.entities.getById(footprintEntityId);
  if (entity && viewer) viewer.entities.remove(entity);
});
</script>

<style scoped>
.roi-map-picker {
  display: grid;
  gap: 6px;
  margin-top: 9px;
}

.roi-map-picker__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.roi-map-picker__button {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 30px;
  padding: 5px 4px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: #263238;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid;
  border-radius: 4px;
}

.roi-map-picker__button--draw {
  border-color: #3d9bc3;
}

.roi-map-picker__button--draw.is-active {
  color: #fff;
  background: #3d9bc3;
  border-color: #237a9f;
  box-shadow: 0 0 0 2px rgb(61 155 195 / 18%);
}

.roi-map-picker__button--secondary {
  color: #263238;
  background: #fff;
  border-color: #52a779;
}

button:disabled {
  color: #66757d;
  cursor: not-allowed;
  background: #f5f7f8;
  opacity: 1;
}

.roi-map-picker__message {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #a9c9d9;
}

.roi-map-picker__message.is-warning {
  color: #f2d28a;
}

.roi-map-picker__message.is-error {
  color: #ff9c9c;
}
</style>
