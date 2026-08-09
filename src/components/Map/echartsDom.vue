<template>
  <div class="chart_panel" @mousedown="onPanelMouseDown">
    <div class="panel__title">时序分析</div>
    <span class="panel__close" title="关闭" @click.stop="emit('close')">
      ×
    </span>
    <div ref="chartRef" class="chart-box" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from "vue";
import * as echarts from "echarts";
import dayjs from "dayjs";

const props = defineProps<{
  active?: boolean;
  analysisData?: any[];
}>();

const emit = defineEmits<{
  close: [];
  "drag-start": [MouseEvent];
}>();

const onPanelMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest(".chart-box")) return;
  if (target.closest(".panel__close")) return;
  emit("drag-start", e);
};

const chartRef = ref<HTMLElement | null>(null);
let chartInst: echarts.ECharts | null = null;

/** 过滤无效数值 */
const isValidValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "string" && value.trim().toLowerCase() === "nan") {
    return false;
  }
  return !Number.isNaN(Number(value));
};

const parseValue = (value: unknown) => Number(Number(value).toFixed(2));

const buildValidRows = () => {
  const rows = Array.isArray(props.analysisData) ? props.analysisData : [];
  return rows
    .filter(item => isValidValue(item?.value))
    .map(item => ({
      ...item,
      value: parseValue(item.value),
      time: dayjs(String(item?.productTime)).valueOf()
    }))
    .filter(item => !Number.isNaN(item.time))
    .sort((a, b) => a.time - b.time);
};

const buildOption = (): echarts.EChartsOption => {
  const rows = buildValidRows();
  if (!rows.length) {
    return {
      title: { text: "暂无时序数据", left: "center", top: "middle" }
    };
  }

  const lineData = rows.map(item => [
    dayjs(item.time).format("YYYY-MM-DD HH:mm:ss"),
    item.value
  ]);

  return {
    tooltip: {
      trigger: "axis",
      formatter(params: any) {
        const list = Array.isArray(params) ? params : [params];
        const idx = list[0]?.dataIndex ?? 0;
        const row = rows[idx];
        if (!row) return "";
        return [
          `时间：${dayjs(row.time).format("YYYY-MM-DD HH:mm:ss")}`,
          `数值：${row.value}`,
          row.name ? `数据：${row.name}` : ""
        ]
          .filter(Boolean)
          .join("<br/>");
      }
    },
    grid: { left: "60", right: "60", top: "40", bottom: "70" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: lineData.map(item => item[0])
    },
    yAxis: { type: "value", name: "数值" },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { start: 0, end: 100 }
    ],
    series: [
      {
        name: "时序",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        connectNulls: false,
        lineStyle: { width: 2 },
        data: lineData.map(item => item[1])
      }
    ]
  };
};

const renderChart = () => {
  if (!chartRef.value) return;
  chartInst?.dispose();
  chartInst = echarts.init(chartRef.value);
  chartInst.setOption(buildOption(), true);
  chartInst.resize();
};

const disposeChart = () => {
  chartInst?.dispose();
  chartInst = null;
};

watch(
  () => [props.active, props.analysisData] as const,
  async ([active]) => {
    if (!active) {
      disposeChart();
      return;
    }
    await nextTick();
    renderChart();
  },
  { deep: true }
);

defineExpose({ resize: () => chartInst?.resize() });

onUnmounted(() => {
  disposeChart();
});
</script>

<style lang="less" scoped>
.chart_panel {
  position: relative;
  width: 560px;
  padding: 8px 10px 10px;
  border: 2px solid rgba(187, 187, 187, 0.6);
  background: #fff;
  cursor: move;
  user-select: none;
  // 加隐形，类似卡片
  box-shadow: 0 10 10px 0 rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 10px;
  background-color: #fff;
  color: #000;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}

.panel__title {
  margin-bottom: 6px;
  color: #545353;
  font-family: YouSheBiaoTiHei, sans-serif;
  font-size: 14px;
}

.panel__close {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  font-size: 14px;
  color: #888;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #95ccfc;
  }
}

.chart-box {
  width: 100%;
  height: 300px;
  cursor: default;
  user-select: auto;
}
</style>
