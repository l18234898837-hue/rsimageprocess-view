<template>
  <div>
    <el-dialog v-model="setTimeoutVisible" title="定时处理工具" width="950px">
      <el-tabs
        v-show="showDowloadTable"
        v-model="activeName"
        type="border-card"
        class="demo-tabs"
        @tab-click="handleClick"
      >
        <el-tab-pane
          label="定时任务"
          name="first"
          style="border: 1px solid rgb(210 210 212 / 30%)"
        >
          <div v-if="showDowloadTable" class="flex bg-[#f1f2f2]">
            <div
              :class="[
                'p-2 cursor-pointer',
                actionButton ? 'bg-[#ffffff]' : ''
              ]"
              @click="handleActionButton(true)"
            >
              普通定时下载
            </div>
            <div
              v-show="userStore.info.admin"
              :class="[
                'p-2 cursor-pointer',
                actionButton ? '' : 'bg-[#ffffff]'
              ]"
              @click="handleActionButton(false)"
            >
              周期定时下载
            </div>
          </div>
          <div v-show="showDowloadTable" class="p-2">
            <timerDowloadInfoTable
              ref="timerDowloadInfoTableRef"
              @handleAddDowloadPlan="handleAddDowloadPlan"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="定时计算" name="second">
          <recordTable
            ref="recordTableRef"
            @handleAddDowloadPlan="handleAddDowloadPlan"
          />
        </el-tab-pane>
        <el-tab-pane label="日志查看" name="third">
          <timerLogTable />
        </el-tab-pane>
      </el-tabs>
      <div
        v-show="!showDowloadTable"
        class="box-border p-[10px] border border-[rgba(210,210,212,0.8)] rounded-md"
      >
        <downloadForm
          ref="downloadFormRef"
          @handleAddDowloadPlan="handleAddDowloadPlan"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { TabsPaneContext } from "element-plus";

import timerLogTable from "./table/timerLogTable.vue";
import recordTable from "./table/recordTable.vue";
import timerDowloadInfoTable from "./table/timerDowloadInfoTable.vue";
import downloadForm from "./downloadForm.vue";
import bus from "@/utils/bus";
import { useUserStoreHook } from "@/store/modules/user";
const userStore: any = useUserStoreHook();

const timerDowloadInfoTableRef = ref();
const downloadFormRef = ref();
const recordTableRef = ref();
const actionButton = ref(true);
const activeName = ref("first");
const setTimeoutVisible = ref(false);
const showDowloadTable = ref(true);

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};

bus.on("toLogTable", () => {
  activeName.value = "third";
});

const handleAddDowloadPlan = show => {
  showDowloadTable.value = show;
  bus.emit("getDowloadDataList");
  downloadFormRef.value.setData();
};

const handleActionButton = (isAction: boolean) => {
  actionButton.value = isAction;
  if (isAction) {
    timerDowloadInfoTableRef.value.getDataList(1);
  } else {
    timerDowloadInfoTableRef.value.getDataList(2);
  }
};

const showDialog = () => {
  setTimeoutVisible.value = true;
};

defineExpose({ showDialog });
</script>

<style lang="scss" scoped>
.action-button {
  width: 80px;
  height: 28px;
  line-height: 28px;
  color: #fff;
  text-align: center;
  cursor: pointer;
  background: rgb(56 96 157 / 80%);
  border-radius: 4px;
}

:deep(.el-form-item__label) {
  color: #545353;
  text-wrap: nowrap;
}

:deep(.el-dialog) {
  color: #545353;
  background: rgb(255 255 255 / 90%);
}

:deep(.el-dialog__title) {
  color: #545353;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  // background: linear-gradient(180deg, rgb(31 106 187 / 0%) 0%, #1b62ad 100%);
  border: none;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  // font-family: "Source Han Sans SC";
  font-style: normal;
  font-weight: 400;
  color: #545353;
  text-align: center;
  text-transform: none;
  letter-spacing: 1px;
  // background: linear-gradient(180deg, rgb(31 106 187 / 0%) 0%, #3485db 100%);
  border: none;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  // font-family: "Source Han Sans SC";
  font-style: normal;
  font-weight: 400;
  color: #545353;
  text-align: center;
  text-transform: none;
  letter-spacing: 1px;
  // width: 50%;
  border: none;
}

// :deep(.el-tabs--border-card) {
//   background: #042c67;
//   border: #1b62ad 1px solid;
// }

// :deep(.el-tabs--border-card > .el-tabs__header) {
//   // background-color: #042c67;
// }

:deep(.el-tabs--border-card) {
  // background: #042c67;
  border: rgb(210 210 212 / 80%) 1px solid;

  // .el-input__wrapper {
  //   // background-color: rgb(85 129 182 / 50%);
  //   // box-shadow: inset 0 0 1px rgb(242 242 242 / 80%);

  //   // input {
  //   //   color: #fff;
  //   // }
  // }
}

// :deep(.bg-bg_color) {
//   background-color: rgba(255, 255, 255, 0);
// }
</style>
