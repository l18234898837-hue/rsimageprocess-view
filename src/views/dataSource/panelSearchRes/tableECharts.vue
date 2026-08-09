<template>
  <el-dialog
    v-model="innerVisible"
    title="波长"
    width="800px"
    destroy-on-close
    append-to-body
    style="z-index: 9999; pointer-events: auto"
    @opened="onDialogOpened"
    @closed="onDialogClosed"
  >
    <div ref="chartRef" class="chart-box" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps<{
  modelValue: boolean;
  opticalData?: any[];
}>();

const emit = defineEmits<{
  "update:modelValue": [boolean];
}>();

const innerVisible = computed({
  get: () => props.modelValue,
  set: v => emit("update:modelValue", v)
});

const chartRef = ref<HTMLElement | null>(null);
let chartInst: echarts.ECharts | null = null;

const getWavelength = (item: any) => {
  const num = Number(item?.wavelength);
  return Number.isNaN(num) ? 0 : num;
};

const getDataValue = (item: any) => {
  const num = Number(item?.data);
  return Number.isNaN(num) ? 0 : num;
};

const buildOption = (): echarts.EChartsOption => {
  const rows = Array.isArray(props.opticalData) ? props.opticalData : [];
  if (!rows.length) {
    return {
      title: { text: "暂无波长数据", left: "center", top: "middle" }
    };
  }

  const sorted = [...rows].sort((a, b) => getWavelength(a) - getWavelength(b));
  const xAxisData = sorted.map(item => String(item?.wavelength ?? ""));
  const seriesData = sorted.map(item => getDataValue(item));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: "60", right: "40", top: "40", bottom: "80" },
    xAxis: {
      type: "category",
      name: "波长",
      boundaryGap: false,
      data: xAxisData
    },
    yAxis: { type: "value", name: "数据" },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 1000
      },
      {
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: "数据",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2 },
        data: seriesData
      }
    ]
  };
};

const renderChart = () => {
  if (!chartRef.value) return;
  chartInst?.dispose();
  chartInst = echarts.init(chartRef.value);
  chartInst.setOption(buildOption());
  chartInst.resize();
};

const disposeChart = () => {
  chartInst?.dispose();
  chartInst = null;
};

const onDialogOpened = async () => {
  await nextTick();
  renderChart();
};

const onDialogClosed = () => {
  disposeChart();
};

watch(
  () => props.modelValue,
  async open => {
    if (!open) return;
    await nextTick();
    renderChart();
  },
  { immediate: true }
);

watch(
  () => props.opticalData,
  async () => {
    if (!props.modelValue) return;
    await nextTick();
    renderChart();
  },
  { deep: true }
);
</script>

<style scoped>
.chart-box {
  width: 100%;
  height: 360px;
}
</style>
