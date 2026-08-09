<template>
  <div
    v-show="showTable"
    :class="[
      'bg-white rounded-[5px] w-[20vw] border border-[#87cbf0]',
      'pointer-events-auto overflow-hidden relative'
    ]"
  >
    <div
      class="w-[20vw] h-[40px] text-[16px] leading-[40px] pl-8 rounded-b-[5px] text-white fixed"
      :style="{
        backgroundImage: 'url(' + headerBgImg + ')',
        backgroundSize: '100% 100%'
      }"
    >
      观测数据详情
    </div>
    <div class="p-4 h-[1000px] overflow-y-auto mt-[30px]">
      <div class="mb-4 h-[1200px] p-1">
        <el-form
          ref="leftFormRef"
          label-position="right"
          label-width="4vw"
          :model="form"
        >
          <el-form-item label="数据名称:" prop="">
            {{ form.sdId }}
          </el-form-item>
          <el-form-item label="仪器类型:" prop="">
            {{ form.deviceModel }}
          </el-form-item>
          <el-form-item label="产生时间:" prop="">
            {{ `${form.date} ${form.time}` }}
          </el-form-item>
          <el-form-item label="经纬度:" prop="">
            {{ `${form.longitude}, ${form.latitude}` }}
          </el-form-item>

          <el-form-item label="水深:" prop="waterDepth">
            {{ form.waterDepth }}
          </el-form-item>
          <el-form-item label="站点名称:" prop="site">
            {{ form.site }}
          </el-form-item>
          <el-form-item label="Chla:" prop="chla">
            {{ form.chla }}
          </el-form-item>
          <el-form-item label="SPM:" prop="spm">
            {{ form.spm }}
          </el-form-item>
          <el-form-item label="TSM:" prop="tsm">
            {{ form.tsm }}
          </el-form-item>
          <el-form-item label="CDOM:" prop="cdom">
            {{ form.cdom }}
          </el-form-item>
          <el-form-item label="PIM:" prop="pim">
            {{ form.pim }}
          </el-form-item>
          <el-form-item label="pimPer:" prop="pimper">
            {{ form.pimPer ? Number(form.pimPer).toFixed(2) + "%" : "" }}
          </el-form-item>
          <el-form-item label="POM:" prop="pom">
            {{ form.pom }}
          </el-form-item>
          <el-form-item label="pomPer:" prop="pomper">
            {{ form.pomPer ? Number(form.pomPer).toFixed(4) + "%" : "" }}
          </el-form-item>
          <el-form-item label="SST:" prop="sst">
            {{ form.sst }}
          </el-form-item>
          <el-form-item label="salinity:" prop="salinity">
            {{ form.salinity }}
          </el-form-item>
          <el-form-item label="ag:" prop="ag">
            {{ form.ag }}
          </el-form-item>
          <el-form-item label="s:" prop="s">
            {{ form.s }}
          </el-form-item>
          <el-form-item label="SSH:" prop="ssh">
            {{ form.ssh }}
          </el-form-item>
          <el-form-item label="wind:" prop="wind">
            {{ form.wind }}
          </el-form-item>
          <el-form-item label="current:" prop="current">
            {{ form.current }}
          </el-form-item>
          <el-form-item label="波长:" prop="waveLengthDataList">
            <template
              v-if="
                form.waveLengthDataList && form.waveLengthDataList.length > 0
              "
            >
              <el-tooltip
                v-model:visible="waveTableTooltipVisible"
                content="点击表格可查看折现图"
                placement="top"
                effect="dark"
                manual-mode
              >
                <div
                  class="wave-table-wrap"
                  style="cursor: pointer; width: 100%"
                  @mouseenter="showWaveTableTooltip"
                  @mouseleave="hideWaveTableTooltip"
                >
                  <el-table
                    :data="form.waveLengthDataList"
                    style="width: 100%"
                    border
                    height="300px"
                    size="small"
                    @row-click="handleWaveTableClick(form.waveLengthDataList)"
                  >
                    <el-table-column label="数据" prop="data" />
                    <el-table-column label="波长" prop="wavelength" />
                  </el-table>
                </div>
              </el-tooltip>
            </template>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
  <table-e-charts
    v-if="waveChartVisible"
    v-model="waveChartVisible"
    :optical-data="waveChartData"
  />
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import bus from "@/utils/bus";
import TableECharts from "./tableECharts.vue";

import headerBgImg from "@/assets/common/header-bg.png";

const showTable = ref(false);
const form = ref<any>({});
const waveTableTooltipVisible = ref(false);
const waveChartVisible = ref(false);
const waveChartData = ref<any[]>([]);
let waveTableTooltipTimer: ReturnType<typeof setTimeout> | null = null;

const handleWaveTableClick = (dataList: any[]) => {
  waveChartData.value = Array.isArray(dataList) ? dataList : [];
  waveChartVisible.value = true;
};

const clearWaveTableTooltipTimer = () => {
  if (!waveTableTooltipTimer) return;
  clearTimeout(waveTableTooltipTimer);
  waveTableTooltipTimer = null;
};

const showWaveTableTooltip = () => {
  clearWaveTableTooltipTimer();
  waveTableTooltipVisible.value = true;
  waveTableTooltipTimer = setTimeout(() => {
    waveTableTooltipVisible.value = false;
    waveTableTooltipTimer = null;
  }, 1500);
};

const hideWaveTableTooltip = () => {
  waveTableTooltipVisible.value = false;
  clearWaveTableTooltipTimer();
};

bus.on("showInstrumentDetail", instrumentData => {
  showTable.value = true;
  console.log("instrumentData", instrumentData);
  form.value = instrumentData;
  bus.emit("legendRightWidth", true);
});

bus.on("clearSearchInstrumentData", () => {
  showTable.value = false;
  form.value = {};
  waveChartVisible.value = false;
  waveChartData.value = [];
  hideWaveTableTooltip();
  bus.emit("legendRightWidth", false);
});

onUnmounted(() => {
  clearWaveTableTooltipTimer();
});
</script>

<style lang="scss" scoped>
:deep(.el-form-item) {
  margin-bottom: 0;
}

.wave-table-wrap {
  width: 100%;
}
</style>
