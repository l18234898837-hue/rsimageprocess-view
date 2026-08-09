<template>
  <div
    v-show="showSearchPanel"
    class="search_res border-[1px] border-[#87cbf0]"
    :style="{
      width: '100%'
    }"
  >
    <div
      class="w-full h-[40px] text-[16px] leading-[40px] pl-8 relative rounded-b-[5px] text-white"
      :style="{
        backgroundImage: 'url(' + headerBgImg + ')',
        backgroundSize: '100% 100%',
        width: panelCollapse ? '120px' : '100%'
      }"
    >
      {{ "检索结果" }}
    </div>
    <div
      :class="[
        'bg-[rgba(255,255,255,0.8)] box-border py-[10px]',
        'bg-[rgba(255,255,255,0.7)] rounded-md border-[1px] border-[#87cbf0]'
      ]"
      :style="{
        height: panelCollapse ? '0' : 'auto',
        // padding: panelCollapse ? '0' : '10px',
        margin: '15px'
      }"
    >
      <el-tabs
        v-model="activeName"
        type="card"
        class="demo-tabs"
        @tab-click="handleTabClick"
      >
        <el-tab-pane label="全部" name="all">
          <allTableData />
        </el-tab-pane>
        <el-tab-pane label="公共" name="public">
          <publicTableData />
        </el-tab-pane>
        <el-tab-pane label="个人" name="private">
          <userTableData />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TabsPaneContext } from "element-plus";
import bus from "@/utils/bus";
import allTableData from "./all.vue";
import publicTableData from "./public.vue";
import userTableData from "./private.vue";

import headerBgImg from "@/assets/common/header-bg.png";

const showOnlineTable = ref(false);

const panelCollapse = ref(false);
const showSearchPanel = ref(false);

const activeName = ref("all");

bus.on("showOnlineTable", (val: boolean) => {
  showOnlineTable.value = val;
});

bus.on("showSearchPanel", (val: boolean) => {
  showSearchPanel.value = val;
  bus.emit("legendRightWidth", true);
});

const handleTabClick = (tab: TabsPaneContext, event: Event) => {};
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none;
}

.search_res {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 20vw;
  height: auto;
  // margin: 20px;
  overflow-y: scroll;
  color: #545353;
  background: rgb(255 255 255 / 90%);
  border-radius: 5px;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  width: 50%;
  // font-family: "Source Han Sans SC";
  font-style: normal;
  font-weight: 400;
  color: #545353;
  text-align: center;
  text-transform: none;
  letter-spacing: 1px;
  border: none;
  // border-radius: 15px;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  background: #b3d3f6;
  border: none;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  font-style: normal;
  font-weight: 400;
  color: #218cf1;
  text-align: center;
  text-transform: none;
  letter-spacing: 1px;
  background: linear-gradient(180deg, rgb(228 242 255 / 20%) 0%, #e4f2ff 100%);
  background-color: #a7d7ff;
  border: none;
}

:deep(.el-tabs--card > .el-tabs__header) {
  margin: 10px;
  margin-top: 0;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

:deep(.is-top) {
  border-radius: 20px;
}
</style>
