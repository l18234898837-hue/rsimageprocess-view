<template>
  <div
    v-show="showSearchPanel"
    :class="[
      'search_res',
      'border-[1px] border-[#87cbf0]',
      panelCollapse ? 'h-[40px]' : ''
    ]"
    :style="{
      width: panelCollapse ? '120px' : '20vw'
    }"
  >
    <!-- <div
      class="w-full h-[40px] text-[16px] leading-[40px] text-center relative rounded-b-[5px] text-white"
      :style="{
        // 'background-image': panelCollapse
        //   ? 'linear-gradient(to right, #0080ff,rgb(15,106,185),rgb(255 255 255 / 10%)'
        //   : 'linear-gradient(to right, #0080ff,rgb(255 255 255 / 0%)',
        width: panelCollapse ? '120px' : '100%',
        'background-color': 'gray'
      }"
    >
      检索结果
      <div
        :class="[
          'absolute',
          'top-[10px]',
          'right-0',
          'h-[20px]',
          'text-[14px]',
          'text-[rgb(255,255,255)]',
          'flex justify-center items-center'
        ]"
      >
        <div
          class="w-[20px] h-[40px] leading-[40px] cursor-pointer text-[#ffffff] bg-[rgb(15,106,185,0)] flex justify-center items-center rounded-r-[5px]"
          @click="panelCollapseChange"
        >
          <el-icon
            :style="{
              transform: panelCollapse ? 'rotate(90deg)' : 'rotate(270deg)'
            }"
            ><DArrowRight
          /></el-icon>
        </div>
      </div>
    </div> -->
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
        // padding: '10px',
        margin: panelCollapse ? '' : '15px',
        marginBottom: '0'
      }"
    >
      <div class="local_data text-[16px] text-white mb-[10px]">本地数据</div>
      <el-tabs
        v-model="activeName"
        type="card"
        class="demo-tabs"
        @tab-click="handleTabClick"
      >
        <el-tab-pane label="全部" name="all">
          <allTableData :dataList="activeName" />
        </el-tab-pane>
        <el-tab-pane label="公共" name="public">
          <publicTableData />
        </el-tab-pane>
        <el-tab-pane label="个人" name="private">
          <userTableData />
        </el-tab-pane>
      </el-tabs>
    </div>

    <div
      v-show="showOnlineTable"
      :class="[
        'bg-[rgb(4,44,103,0.8)] box-border p-[0px]',
        'bg-[rgba(255,255,255,0.7)] rounded-md border-[1px] border-[#87cbf0]'
      ]"
      :style="{
        height: panelCollapse ? '0' : 'auto',
        padding: panelCollapse ? '0' : '10px 0',
        margin: panelCollapse ? '' : '15px'
      }"
    >
      <div class="online_data text-[16px] text-white mb-[10px]">在线数据</div>
      <div
        class="flex text-white mb-[10px] text-[14px] rounded-[20px] bg-[#b3d3f6] mx-[10px]"
      >
        <el-button
          :disabled="
            !onlineTypes.filter(item => item.includes('Sentinel')).length
          "
          :type="!onlineTypes.length ? '' : actionButton ? 'primary' : ''"
          size="small"
          :style="{
            borderRadius: '20px',
            border: 'none',
            width: '50%',
            color: actionButton ? '#218cf1' : '#fff',
            background: !onlineTypes.length
              ? 'rgb(255,255,255,0)'
              : actionButton
                ? 'linear-gradient(180deg, rgb(228 242 255 / 20%) 0%, #e4f2ff 100%)'
                : 'rgb(255,255,255,0)'
          }"
          @click="handleActionButton(true)"
        >
          Sentinel
        </el-button>
        <el-button
          :disabled="
            !onlineTypes.filter(item => item.includes('Landsat')).length
          "
          :type="!onlineTypes.length ? '' : actionButton ? '' : 'primary'"
          size="small"
          :style="{
            borderRadius: '20px',
            border: 'none',
            width: '50%',
            color: actionButton ? '#fff' : '#218cf1',
            background: !onlineTypes.length
              ? 'rgb(255,255,255,0)'
              : actionButton
                ? 'rgb(255,255,255,0)'
                : 'linear-gradient(180deg, rgb(228 242 255 / 20%) 0%, #e4f2ff 100%)'
          }"
          @click="handleActionButton(false)"
        >
          Landsat
        </el-button>
      </div>
      <online-table ref="onlineTableRef" />
    </div>
    <div
      v-show="showOnlineTable"
      :style="{
        display: panelCollapse ? 'none' : 'flex',
        margin: panelCollapse ? '' : '0px 15px',
        justifyContent: 'space-between'
      }"
    >
      <el-button style="width: 49%; border-radius: 20px" @click="loadOnlineData"
        >载入</el-button
      >
      <!-- <el-button
        style="width: 49%; border-radius: 20px"
        type="primary"
        :loading="onlineLoading"
        @click="downloadDialogVisible = true"
        >下载</el-button
      > -->
      <el-popover
        placement="top-start"
        :width="450"
        trigger="contextmenu"
        :visible="popoverVisible"
      >
        <template #reference>
          <el-badge
            :value="badgeValue"
            :max="99"
            :offset="[-10, 0]"
            style="width: 49%"
          >
            <el-button
              style="width: 100%; border-radius: 20px"
              type="primary"
              title="鼠标右键查看下载列表"
              :loading="false"
              @click="downloadDialogVisibleFn"
              @contextmenu.prevent="popoverVisible = true"
              >下载</el-button
            >
          </el-badge>
        </template>
        <div
          class="text-[16px] text-[#fff] mb-[10px] w-full flex justify-between"
        >
          <div class="online_data" style="left: 0; width: auto; padding: 5px">
            在线数据下载列表
          </div>
          <div>
            <el-dropdown
              size="small"
              split-button
              trigger="click"
              :hide-on-click="false"
              @click="getOnlineDownloadRecord"
            >
              <el-icon v-if="!refreshLoading"><Refresh /></el-icon>
              <el-button v-else link :loading="refreshLoading" />
              <template #dropdown>
                <el-dropdown-menu>
                  <template #default>
                    <div class="p-[10px]">
                      <el-switch
                        v-model="autoRefresh"
                        size="small"
                        active-text="自动刷新"
                        inactive-text=""
                        @change="switchChange"
                      />
                      <div>
                        <div>间隔</div>
                        <el-select
                          v-model="secNum"
                          size="small"
                          :disabled="!autoRefresh"
                        >
                          <el-option
                            v-for="item in dropdownList"
                            :key="item.secNum"
                            :label="item.sec"
                            :value="item.secNum"
                            @click="setTimer(item.secNum)"
                          />
                        </el-select>
                      </div>
                    </div>
                  </template>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              class="ml-[10px]"
              title="关闭"
              :icon="Close"
              size="small"
              circle
              @click="closePopover"
            />
          </div>
        </div>
        <el-scrollbar height="300px" class="border-y border-[#87cbf0]">
          <div
            v-for="item in onlineDownloadRecordList"
            :key="item.id"
            :class="[
              'w-full flex flex-col h-[70px] border border-[#87cbf0]',
              'my-[10px] rounded-[5px]',
              'bg-gradient-to-r from-[#c7e6ff] to-[rgb(199 230 255 / 0%)]',
              'p-[10px] box-border'
            ]"
          >
            <div class="flex w-full overflow-hidden text-nowrap text-ellipsis">
              <div
                class="overflow-hidden text-ellipsis w-full"
                :title="item.name"
              >
                数据文件：
                <span class="text-[12px]">{{ item.name }}</span>
              </div>
            </div>
            <div class="w-full flex flex-1 items-center justify-between">
              <el-progress
                :style="{ width: '70%' }"
                :stroke-width="16"
                :text-inside="true"
                :percentage="
                  item.status == 3 ? 100 : item.progress ? item.progress : 0
                "
                :duration="10"
                :striped="
                  item.progress === 100 || item.status == 3 ? false : true
                "
                striped-flow
                :format="
                  progressFormat => {
                    return item.status == 3 ? '下载失败' : progressFormat + '%';
                  }
                "
                :status="
                  item.progress === 100
                    ? 'success'
                    : item.status == 3
                      ? 'exception'
                      : ''
                "
                ><span>{{
                  item.status == 3
                    ? "下载失败"
                    : item.progress
                      ? `${item.progress}%`
                      : "0%"
                }}</span></el-progress
              >
              <div class="pl-[0px] w-[29%] flex justify-center">
                <el-button
                  type="primary"
                  size="small"
                  link
                  :disabled="
                    item.progress === 100 ||
                    item.status == 5 ||
                    (!item.progress && item.status != 2) ||
                    (item.progress && item.status == 1)
                  "
                  @click="pauseOnlineDownload(item.id)"
                  >暂停</el-button
                >
                <el-button
                  type="primary"
                  size="small"
                  link
                  :disabled="
                    item.progress === 100 ||
                    item.status == 2 ||
                    item.status == 1 ||
                    item.status == 3
                  "
                  @click="startOnlineDownload(item.id)"
                  >{{
                    item.progress === 100
                      ? "完成"
                      : item.progress && item.status == 5
                        ? "继续"
                        : item.status == 1
                          ? "等待中"
                          : item.status == 2
                            ? "下载中"
                            : item.status == 3
                              ? "继续"
                              : "开始"
                  }}</el-button
                >

                <el-popconfirm
                  title="确定删除文件的下载进程么?"
                  @confirm="delOnlineDownload(item.id)"
                >
                  <template #reference>
                    <el-button
                      type="primary"
                      size="small"
                      link
                      :disabled="item.status == 2"
                      >删除</el-button
                    >
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </el-scrollbar>
        <el-pagination
          background
          small
          layout="prev, pager, next"
          :total="badgeValue"
          class="mt-[10px] flex justify-center"
          @change="paginationChange"
        />
      </el-popover>
      <!-- <el-button style="" type="primary" @click="clearLayer">清除</el-button> -->
    </div>
  </div>
  <el-dialog
    v-model="downloadDialogVisible"
    width="500"
    center
    :before-close="downloadDialogHandleClose"
    style="z-index: 9999; pointer-events: auto"
  >
    <div class="text-center text-[20px]">
      <div>数据功能支持后台定时运行，</div>
      <div>请问是否需要加入定时任务？</div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="addToTimer">加入定时任务</el-button>
        <el-button type="primary" @click="downloadOnlineData">
          现在下载
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { DArrowRight, Refresh, Close } from "@element-plus/icons-vue";
import { dayjs, type TabsPaneContext } from "element-plus";
import bus from "@/utils/bus";
import tableData from "./tableData.vue";
import allTableData from "./localTable/all.vue";
import publicTableData from "./localTable/public.vue";
import userTableData from "./localTable/private.vue";
import onlineTable from "./onlineTable.vue";
import map from "@/libs/tdtmap";
import { message } from "@/utils/message";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { useUserStoreHook } from "@/store/modules/user";
import {
  usgsGownloadLandsat,
  usgsGownloadSentinel,
  onlineDownloadRecord,
  startOnlineDownloadRecord,
  pauseOnlineDownloadRecord,
  delOnlineDownloadRecord
} from "@/api/dataSource/panel/online";
import { addTimerInfo } from "@/api/stTimer";

import headerBgImg from "@/assets/common/header-bg.png";

const userStore: any = useUserStoreHook();

const tableRef = ref();
const onlineTableRef = ref();
const showOnlineTable = ref(true);

const panelCollapse = ref(false);
const showSearchPanel = ref(false);
const downloadDialogVisible = ref(false);

const activeName = ref("all");
const onlineLoading = ref(false);
const localLoading = ref(false);
const onlineTypes = ref([]);

bus.on("showOnlineTable", (val: any) => {
  showOnlineTable.value = val.status;
  if (val.onlineData[0]?.sensor == "Sentinel") {
    actionButton.value = true;
  } else if (val.onlineData[0]?.sensor == "Landsat") {
    actionButton.value = false;
  }
  onlineTypes.value = val.onlineTypes;
  console.log(onlineTypes.value);
});

bus.on("showSearchPanel", (val: boolean) => {
  showSearchPanel.value = val;
  bus.emit("legendRightWidth", val);
});

const loadOnlineDataBtnStatus = ref(false);
bus.on("loadOnlineDataBtnStatus", (val: boolean) => {
  loadOnlineDataBtnStatus.value = val;
});

const onlineDownloadRecordList = ref([]);
const badgeValue = ref();
const OnlineDownloaPageNum = ref(1);
const autoRefresh = ref(false);
const secNum = ref(5000);
const timerId = ref(null);
const refreshLoading = ref(false);
const popoverVisible = ref(false);
const dropdownList = ref([
  {
    sec: "5s",
    secNum: 5000
  },
  {
    sec: "10s",
    secNum: 10000
  },
  {
    sec: "30s",
    secNum: 30000
  }
]);

const setTimer = (secNum: number) => {
  if (timerId.value) {
    clearInterval(timerId.value);
  }
  timerId.value = setInterval(() => {
    getOnlineDownloadRecord();
  }, secNum);
};

const closePopover = async () => {
  popoverVisible.value = false;
  autoRefresh.value = false;
  clearInterval(timerId.value);
  await new Promise(resolve => setTimeout(resolve, 200));
};
bus.on("closePopover", async () => {
  await closePopover();
});

const switchChange = val => {
  console.log(val);
  if (val) {
    setTimer(secNum.value);
  } else {
    clearInterval(timerId.value);
  }
};

const downloadDialogVisibleFn = () => {
  downloadDialogVisible.value = true;
  closePopover();
};

const getOnlineDownloadRecord = async () => {
  refreshLoading.value = true;
  const res = await onlineDownloadRecord({
    userId: userStore.info.userId,
    pageNum: OnlineDownloaPageNum.value,
    pageSize: 10
  });
  if (res.code == 200) {
    onlineDownloadRecordList.value = res.data.rows;
    badgeValue.value = res.data.total;
    refreshLoading.value = false;
  }
};

const startOnlineDownload = async (id: number) => {
  const res = await startOnlineDownloadRecord(id);
  if (res.code == 200) {
    message("操作成功", { type: "success" });
    getOnlineDownloadRecord();
  } else {
    message(res.msg, { type: "error" });
  }
};

const pauseOnlineDownload = async (id: number) => {
  const res = await pauseOnlineDownloadRecord(id);
  if (res.code == 200) {
    message("操作成功", { type: "success" });
    getOnlineDownloadRecord();
  } else {
    message(res.msg, { type: "error" });
  }
};

const delOnlineDownload = async (id: number) => {
  const res = await delOnlineDownloadRecord(id);
  if (res.code == 200) {
    message("操作成功", { type: "success" });
    getOnlineDownloadRecord();
  } else {
    message(res.msg, { type: "error" });
  }
};

const paginationChange = (val: number) => {
  // console.log(val);
  OnlineDownloaPageNum.value = val;
  getOnlineDownloadRecord();
};

const addToTimer = async () => {
  console.log(onlineTableRef.value.checkedDataList);
  if (!onlineTableRef.value.checkedDataList.length) {
    message("请勾选需要添加的资源", { type: "warning" });
    return;
  }

  if (onlineTableRef.value.checkedDataList[0].sensor == "Landsat") {
    await addTimerInfo({
      type: 1,
      taskType: 1,
      name: `Landsat_${dayjs().format("YYYYMMDD_HHmmss")}`,
      userId: userStore.info.userId,
      status: 1,
      runDate: dayjs().format("YYYYMMDD"),
      runTime: dayjs().format("HH:mm:ss"),
      runText: JSON.stringify({
        onlineType: 1,
        dataName: onlineTableRef.value.checkedDataList
          .map(item => item.name)
          .join(","),
        datasetId: onlineTableRef.value.checkedDataList
          .map(item => item.datasetId)
          .join(","),
        entityId: onlineTableRef.value.checkedDataList
          .map(item => item.entityId)
          .join(",")
      })
    })
      .then(res => {
        if (res.code == 200) {
          message("操作成功", { type: "success" });
        } else {
          message("下载失败！", { type: "error" });
        }
      })
      .catch(() => {
        onlineLoading.value = false;
      });
  } else {
    await addTimerInfo({
      type: 1,
      taskType: 1,
      name: `Sentinel_${dayjs().format("YYYYMMDD_HHmmss")}`,
      userId: userStore.info.userId,
      status: 1,
      runDate: dayjs().format("YYYYMMDD"),
      runTime: dayjs().format("HH:mm:ss"),
      runText: JSON.stringify({
        onlineType: 2,
        dataName: onlineTableRef.value.checkedDataList
          .map(item => item.name)
          .join(","),
        downloadUrl: onlineTableRef.value.checkedDataList
          .map(item => item.downloadUrl)
          .join(",")
      })
    })
      .then(res => {
        if (res.code == 200) {
          message("操作成功", { type: "success" });
        } else {
          message("下载失败！", { type: "error" });
        }
      })
      .catch(() => {
        onlineLoading.value = false;
      });
  }

  // res.forEach(item => {
  //   if (item.code == "200") {
  //     message("操作成功", { type: "success" });
  //   } else {
  //     message("下载失败！", { type: "error" });
  //   }
  // });
  downloadDialogVisible.value = false;
  // getOnlineDownloadRecord();
};

const actionButton = ref(true);
const handleActionButton = (isAction: boolean) => {
  actionButton.value = isAction;
  if (isAction) {
    loadOnlineDataList("2");
  } else {
    loadOnlineDataList("1");
  }
};
const loadOnlineDataList = online_type => {
  bus.emit("searchOnlineData", online_type);
};

const handleTabClick = (tab: TabsPaneContext, event: Event) => {
  // console.log(tab, event);
};

const downloadDialogHandleClose = () => {
  downloadDialogVisible.value = false;
};

const loadOnlineData = () => {
  bus.emit("loadOnlineImg");
};

const loadData = () => {
  bus.emit("loadLocalImg");
};

const downloadData = () => {
  message("操作成功！", { type: "success" });
};

const downloadOnlineData = async () => {
  onlineLoading.value = true;
  if (!onlineTableRef.value.checkedDataList.length) {
    message("请勾选需要下载的资源", { type: "warning" });
    onlineLoading.value = false;
    return;
  }
  console.log(onlineTableRef.value.checkedDataList);

  const downloadFnList =
    onlineTableRef.value.checkedDataList[0].sensor == "Landsat"
      ? onlineTableRef.value.checkedDataList.map(item => {
          return usgsGownloadLandsat({
            dataName: item.name,
            datasetId: item.datasetId,
            entityId: item.entityId
          }).catch(error => {
            return item.name;
          });
        })
      : onlineTableRef.value.checkedDataList.map(item => {
          return usgsGownloadSentinel({
            dataName: item.name,
            downloadUrl: item.downloadUrl
          }).catch(error => {
            return item.name;
          });
        });
  const res = await Promise.all(downloadFnList).catch(error => {
    onlineLoading.value = false;
    return error;
  });
  res.forEach(item => {
    if (item.code == "200") {
      message("操作成功", { type: "success" });
    }
  });
  onlineLoading.value = false;
  downloadDialogVisible.value = false;
  getOnlineDownloadRecord();
};

const panelCollapseChange = async () => {
  await closePopover();
  panelCollapse.value = !panelCollapse.value;
  bus.emit("legendRightWidth", !panelCollapse.value);

  if (!panelCollapse.value && showOnlineTable.value) {
    bus.emit("bottomLogos", true);
  } else {
    bus.emit("bottomLogos", false);
  }
};

const clearLayer = () => {
  map.removeAllLayer();
  map.removeImageLayers();
};

onMounted(() => {
  getOnlineDownloadRecord();
});

onUnmounted(() => {
  clearInterval(timerId.value);
});
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none;
}

:deep(.el-dropdown) {
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 20px !important;

  .el-button {
    // border-bottom: none;
    // border-top: none;
    border: none;
  }

  .el-dropdown__caret-button {
    border-left: 1px solid #ddd;
  }
}

:deep(.el-progress-bar__outer) {
  background-color: #b1bbc4;
}

.local_data,
.online_data {
  position: relative;
  right: 10px;
  width: 90px;
  padding: 3px;
  text-align: center;
  background: linear-gradient(
    90deg,
    rgb(24 198 146) 0%,
    rgb(24 198 146 / 20%) 100%,
    rgb(5 255 97 / 20%) 100%
  );
  background-color: rgb(225 243 216 / 20%);
  border-radius: 3px;
  transform: skewX(-20deg);
}

.search_res {
  display: flex;
  // flex: 1;
  flex-direction: column;
  width: 20vw;
  height: auto;
  padding-bottom: 15px;
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
  // font-family: "Source Han Sans SC";
  font-style: normal;
  font-weight: 400;
  color: #218cf1;
  text-align: center;
  text-transform: none;
  letter-spacing: 1px;
  background: linear-gradient(180deg, rgb(228 242 255 / 20%) 0%, #e4f2ff 100%);
  // background-image: url("@/assets/Group_1321315329@2x.png");
  background-color: #a7d7ff;
  border: none;
  // border-radius: 15px;
}

:deep(.el-tabs--card > .el-tabs__header) {
  margin: 10px;
  // position: fixed;
  // z-index: 999;
  // width: 412px;
  // background: rgb(4 66 133);
  // border-radius: 15px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

:deep(.is-top) {
  border-radius: 20px;
}
</style>
