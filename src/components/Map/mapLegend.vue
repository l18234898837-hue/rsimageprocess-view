<template>
  <div
    v-show="legendShow"
    :class="[
      'map-legend top-[300px]',
      rightWidth ? 'right-[22vw]' : 'right-[15px]'
    ]"
  >
    <!--  Canvas 生成的图例  -->
    <div class="legend-container">
      <img :src="legendImgUrl" alt="色带图例" class="legend-img" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import bus from "@/utils/bus";
import { useLayerStore } from "@/store/modules/layer";
// 导入你写的工具类
import {
  generateColorLegend,
  generateHorizontalColorRamp
} from "@/utils/colorLegend";

const store = useLayerStore();

// ====================== 组件属性（你要的）======================
interface Props {
  minValue?: number; // 最小值
  maxValue?: number; // 最大值
  colorRamp?: number[][]; // 颜色数组 [[r,g,b], [r,g,b]...]
  show?: boolean; // 显示隐藏
  width?: number; // 图例宽度
  height?: number; // 图例高度
}

// 先定义类型
interface UpdateLegendConfig {
  minValue?: number;
  maxValue?: number;
  colorRamp?: number[][];
}

const props = withDefaults(defineProps<Props>(), {
  minValue: 0,
  maxValue: 30,
  colorRamp: () => [
    [0, 255, 0],
    [255, 255, 0],
    [255, 125, 0],
    [255, 0, 120],
    [0, 120, 120]
  ], // 默认绿黄红
  show: false,
  width: 80,
  height: 200
});

// ====================== 原有控制逻辑 ======================
const legendShow = ref<boolean>(props.show);
const rightWidth = ref<boolean>(false);
const legendImgUrl = ref<string>("");

// 监听外部控制
bus.on("legendRightWidth", (val: boolean) => {
  rightWidth.value = val;
});

bus.on("showOrHideLegend", (show: boolean) => {
  legendShow.value = !show;
});

// ==============================================
// 🔥 新增：内部可修改的图例配置（支持事件动态改）
// ==============================================
const legendConfig = ref({
  minValue: props.minValue,
  maxValue: props.maxValue,
  colorRamp: [...props.colorRamp]
});

// ==============================================
// 🔥 新增：监听事件 → 修改色带、最大、最小值
// ==============================================
bus.on("updateLegend", (config: UpdateLegendConfig) => {
  // debugger;
  if (config.minValue !== undefined)
    legendConfig.value.minValue = config.minValue;
  if (config.maxValue !== undefined)
    legendConfig.value.maxValue = config.maxValue;
  if (config.colorRamp !== undefined)
    legendConfig.value.colorRamp = config.colorRamp.map(color => [...color]);
});

// ====================== 核心：自动生成图例 ======================
const createLegend = async () => {
  const { minValue, maxValue, colorRamp } = legendConfig.value;
  if (!colorRamp.length) {
    store.setLegendImageDataUrl("");
    return;
  }

  const base64 = await generateColorLegend(
    minValue,
    maxValue,
    colorRamp,
    props.width,
    props.height
  );
  legendImgUrl.value = base64;
  store.setLegendImageDataUrl(base64);
};

// 初始化 + 属性变化时自动刷新图例
onMounted(() => {
  createLegend();

  // 监听 props 变化同步到内部
  watch(
    () => props.minValue,
    v => {
      legendConfig.value.minValue = v;
    }
  );
  watch(
    () => props.maxValue,
    v => {
      legendConfig.value.maxValue = v;
    }
  );
  watch(
    () => props.colorRamp,
    v => {
      legendConfig.value.colorRamp = v;
    },
    { deep: true }
  );

  // 监听内部配置变化 → 自动刷新图例
  watch(legendConfig, () => createLegend(), { deep: true });
});

// 对外暴露
defineExpose({
  legendShow,
  refreshLegend: createLegend
});
</script>

<style lang="scss" scoped>
.map-legend {
  position: absolute;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 5px;

  // 背景半透明（适配地图）
}

.legend-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend-img {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
