<template>
  <!-- 点击收起面板 -->
  <div
    v-if="isShow"
    :class="[
      'absolute text-[16px] z-[999] text-white flex items-center justify-center ',
      'top-[50%] w-[20px] h-[50px] bg-[rgba(255,255,255)] border-[1px] border-[#87cbf0] border-l-0',
      isLeftPanel
        ? 'left-[413px] z-[9999]'
        : 'left-0 border border-[rgb(0,149,218)] border-l-0',
      'rounded-r-[5px] cursor-pointer transition-[left,border] ease-in-out duration-300'
    ]"
    @click="isnPanel"
  >
    <div class="leading-[20px] text-[#545353]">
      <el-icon v-if="!isLeftPanel"><DArrowRight /></el-icon>
      <el-icon v-else-if="isLeftPanel"><DArrowLeft /></el-icon>
    </div>
  </div>
  <div
    v-if="isShow"
    :class="[
      'left-panel transition-[left] ease-in-out duration-300 border-[1px] border-[#87cbf0]',
      !isLeftPanel ? 'left-[-500px]' : 'left-0'
    ]"
  >
    <el-tabs
      v-model="activeName"
      type="card"
      class="w-full"
      @tab-click="handleClick"
    >
      <el-tab-pane label="成果记录与下载" name="first">
        <div class="box-border px-[30px]">
          <Form ref="firstFormRef" :tab="'first'" />
        </div>
      </el-tab-pane>
      <!-- <el-tab-pane label="遥感计算" name="second">
        <div class="box-border px-[30px] pr-[40px]">
          <Form
            ref="secondFormRef"
            :tab="'second'"
            @handleSearch="handleSearch"
          />
        </div>
        <div class="box-border px-[20px] pb-[50px]">
          <el-checkbox-group
            v-model="checkList"
            style="line-height: 1.3vw"
            @change="checkGroupChange"
          >
            <div
              v-for="item in dataList"
              :key="item.id"
              :class="[
                'h-[100px] w-[100%]',
                // 'border-2 border-[#0080FF]',
                // 'rounded-[5px]',
                'flex items-center',
                'box-border px-[20px] py-[10px]',
                'mt-[10px]'
              ]"
              :style="{
                backgroundImage: `url(${itemBgImg})`,
                backgroundSize: '100% 100%'
              }"
            >
              <el-checkbox
                :key="item.id"
                :value="item"
                @change="checkChange(checkList, item)"
              />
              <div class="h-full bg-black">
                <el-image style="height: 100%" :src="item.thumbUrl" fit="cover">
                  <template #error>
                    <div
                      class="image-viewer-slot image-slot"
                      style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 4vw;
                        height: 100%;
                        font-size: 40px;
                        background-color: rgb(255 255 255 / 50%);

                        /* border: 1px solid #fff; */
                        border-radius: 5px;
                      "
                    >
                      <el-icon><icon-picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div :class="['ml-[10px] text-[14px] cursor-default', 'w-[64%]']">
                <div
                  :class="[
                    'w-full text-ellipsis overflow-hidden',
                    'hover:text-[#0080FF]',
                    'transition-all ease-in-out duration-200',
                    'cursor-pointer text-nowrap'
                  ]"
                  :title="item.name"
                  @click="showDataDetail(item)"
                >
                  {{ item.name }}
                </div>
                <div :class="['text-[14px]']">
                  <i class="iconfont icon-riqi" /> {{ item.productTime }}
                </div>
                <div class="flex justify-between">
                  <div><i class="iconfont icon-cloud" /> 100%</div>
                  <div class="w-[70px] flex justify-between text-[#04c780]">
                    <i
                      title="详情"
                      class="iconfont icon-more hover:cursor-pointer hover:text-[#0080FF] transition-all ease-in-out"
                      @click="showDataDetail(item)"
                    />
                    <i
                      title="下载保存"
                      class="iconfont icon-baocun hover:cursor-pointer hover:text-[#0080FF] transition-all ease-in-out"
                      @click="downloadData(item)"
                    />
                    <i
                      title="载入"
                      class="iconfont icon-fly hover:cursor-pointer hover:text-[#0080FF] transition-all ease-in-out"
                      @click="loadItemData(item)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </el-checkbox-group>
          <div
            v-if="dataList.length"
            class="flex justify-center h-[70px] items-center"
          >
            <el-button type="" @click="secondFormRef.getDataList()">
              加载更多
            </el-button>
          </div>
        </div>
        <div
          v-if="!dataList.length"
          class="flex flex-col justify-center items-center"
        >
          <div class="text-[14px] text-[#545353]">暂无数据</div>
          <el-image :src="noResultImg" style="width: 150px" />
        </div>
      </el-tab-pane> -->
      <el-tab-pane label="算法分析" name="third">
        <div class="px-3">
          <StarAnalysisTooltip />
        </div>
      </el-tab-pane>
      <el-tab-pane label="多源卫星数据处理" name="multi-source">
        <MultiSourceSatelliteProcess />
      </el-tab-pane>
    </el-tabs>
  </div>
  <div v-if="!isShow" class="absolute z-[999]">
    <el-button type="" :icon="Back" @click="back"> 返回 </el-button>
  </div>
  <div
    :class="[
      'absolute w-[20vw]',
      'bg-[#cae3fc] p-[10px] rounded-b-md',
      'flex justify-between items-center',
      'box-border px-[20px] transition-[left] ease-in-out duration-300',
      `${activeName === 'second' ? 'block' : 'hidden'}`,
      `${dataList.length ? 'bottom-[30px]' : 'hidden'}`,
      isLeftPanel ? 'left-[30px]' : 'left-[-500px]'
    ]"
    style="z-index: 999"
  >
    <el-checkbox
      v-model="checkedAll"
      label="全选"
      style="color: #042c67"
      @change="handleCheckedAll"
    />
    <el-button
      class="reset-margin"
      type="primary"
      style="width: 100px; letter-spacing: 2px; border-radius: 25px"
      @click="loadData"
    >
      载入数据
    </el-button>
  </div>
  <div>
    <DataDetail ref="dataDetailRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import type { TabsPaneContext } from "element-plus";
import {
  Back,
  Picture as IconPicture,
  DArrowRight,
  DArrowLeft
} from "@element-plus/icons-vue";
import { useRouter, useRoute } from "vue-router";
import bus from "@/utils/bus";
import {
  getThumbJpg,
  wgs84ToGcj20,
  downloadLocalDataByIds
} from "@/api/dataSource/panel/loal";
import StarAnalysisTooltip from "./starAnalysisTooltip.vue";
import MultiSourceSatelliteProcess from "./MultiSourceSatelliteProcess.vue";

import { imgStreamToBase64 } from "@/utils/imgToBase64";
import { addOriginalLayer } from "@/utils/addOriginalLayer";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";

import itemBgImg from "@/assets/common/Group_1321316206@2x.png";
import noResultImg from "@/assets/search_noResult_icon.png";

import Form from "./form.vue";
import DataDetail from "@/views/dataSource/DataDetail.vue";
import { useLayerStoreHook } from "@/store/modules/layer";

const layerStore = useLayerStoreHook();

const firstFormRef = ref();
const secondFormRef = ref();

const router = useRouter();
const route = useRoute();
const isShow = ref(false);
const activeName = ref("first");
const dataList = ref([]);
const dataDetailRef = ref();
const mapSelect = ref("1");
const checkList = ref([]);
const checkedAll = ref(false);
let entity = null;
const entities = ref([]);
const syncRemoteThematicRows = () => {
  layerStore.setRemoteThematicRows(
    (checkList.value || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      thumbUrl: i.thumbUrl,
      productTime: i.productTime
    }))
  );
};

watch(checkList, syncRemoteThematicRows, { deep: true });
bus.on("showLeftPanel", (val: boolean) => {
  isShow.value = val;
});

const isLeftPanel = ref(true);

const isnPanel = () => {
  isLeftPanel.value = !isLeftPanel.value;
};

const showDataDetail = item => {
  // bus.emit("showDataDetail", val);
  dataDetailRef.value.showDetail({
    type: "1",
    name: item.name,
    item: item
  });
};

const downloadData = async item => {
  const res = await downloadLocalDataByIds({
    name: "",
    dataIds: [item.id],
    type: 2
  });
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.id}.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const showCoordinates = async coordinates => {
  if (map.viewer.entities.values.some(item => item.id == coordinates.id)) {
    return;
  }

  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(coordinates.lngMin),
    lat: Number(coordinates.latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(coordinates.lngMax),
    lat: Number(coordinates.latMax)
  });

  entity = map.viewer.entities.add({
    id: coordinates.id,
    show: true,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      ),
      material: Cesium.Color.YELLOW.withAlpha(0),
      outline: true,
      outlineColor: Cesium.Color.RED,
      outlineWidth: 3,
      height: 0,
      extrudedHeight: 0
    }
  });
  entities.value.push(coordinates);
};

const checkGroupChange = val => {
  if (val.length === dataList.value.length) {
    checkedAll.value = true;
  } else {
    checkedAll.value = false;
  }
};

const checkChange = (val, row) => {
  const isrow = val.some(item => item.id == row.id);
  if (isrow) {
    const isentity = map.viewer.entities.values.some(item => item.id == row.id);
    if (!isentity) {
      showCoordinates(row);
    }
    map.viewer.entities.values.forEach(item => {
      if (item.id == row.id) {
        item.show = true;
      }
    });
  } else {
    map.viewer.entities.values.forEach(item => {
      if (item.id == row.id) {
        item.show = false;
      }
    });
  }
};

const handleCheckedAll = val => {
  if (val) {
    checkList.value = dataList.value;
    dataList.value.forEach(item => {
      showCoordinates(item);
    });
  } else {
    checkList.value = [];
    map.removeLocalImageLayers();
    entities.value.forEach(item => {
      map.viewer.entities.removeById(item.id);
    });
  }
};

const layerList: any = map.getLocalImageLayers();
/**
 * 载入数据
 */
const loadData = () => {
  if (checkList.value.length === 0) return;
  checkList.value.forEach(async data => {
    if (!layerList.some((layer: any) => layer.id == data.id)) {
      const res = await getThumbJpg(data.id);
      const url = await imgStreamToBase64(res.data);
      addOriginalLayer(data, url, "local");
    }
  });
  bus.emit("ModelParams", {
    isShow: true,
    dataIds: checkList.value.map(i => i.id)
  });
  // bus.emit("getTimeSequenceDataList", checkList.value);
  bus.emit("getSplitLayerData", checkList.value);
};

/**
 * 载入单个数据
 */
const loadItemData = async item => {
  if (layerList.length && layerList.some((layer: any) => layer.id == item.id)) {
    map.getViewer().camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Number(item.lngMin),
        Number(item.latMin),
        Number(item.lngMax),
        Number(item.latMax)
      ),
      duration: 1
    });
    return;
  }
  // const res = await getThumbJpg(item.id);
  // const url = await imgStreamToBase64(res.data);
  addOriginalLayer(item, item.thumbUrl, "local");
  map.getViewer().camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(item.lngMin),
      Number(item.latMin),
      Number(item.lngMax),
      Number(item.latMax)
    ),
    duration: 1
  });
  bus.emit("ModelParams", { isShow: true, dataId: item.id });
};

const back = () => {
  if (!route.query.menuId) {
    router.back();
  } else {
    router.push({
      path: `/data-source`,
      query: {
        menuId: route.query.menuId,
        pid: route.query.pid
        // activeSetData: route.query.activeSetData
      },
      state: {
        activeSetData: history.state.activeSetData
      }
    });
  }
};

const handleClick = (tab: TabsPaneContext, event: Event) => {
  bus.emit("RecordResults", {
    show: false
  });
  bus.emit("ModelParams", { isShow: false });
  if (tab.props.name === "second") {
    bus.emit("showSearchPanel", false);
    bus.emit("closeStarAnalysisResult");
    firstFormRef.value.reset();
  } else if (tab.props.name === "first") {
    secondFormRef.value.reset();
    bus.emit("closeStarAnalysisResult");
    checkList.value = [];
  } else if (tab.props.name === "third") {
    checkList.value = [];
    checkedAll.value = false;
    entities.value = [];
    map.removeLocalImageLayers();
    layerStore.cleaLoadEntitys();
    layerStore.setRemoteThematicRows([]);
    bus.emit("getTimeSequenceDataList", []);
    bus.emit("showTimeSequence", { text: "hidden" });
    bus.emit("clearForm");
  }
};

const handleSearch = data => {
  checkedAll.value = false;
  dataList.value = data;
  dataList.value.forEach(async item => {
    const res = await getThumbJpg(item.id);
    item.thumbUrl = await imgStreamToBase64(res.data);
  });
};

onMounted(() => {
  if (
    !router.currentRoute.value.query.instrumentId &&
    !router.currentRoute.value.query.voyageId
  ) {
    isShow.value = true;
  }
});

onUnmounted(() => {
  map.removeLocalImageLayers();
  layerStore.cleaLoadEntitys();
  layerStore.setRemoteThematicRows([]);
});
</script>

<style lang="less" scoped>
::-webkit-scrollbar {
  display: none;
}
// :deep(.el-checkbox__inner) {
// background-color: rgba(27, 98, 173, 0);
// }
.left-panel {
  border-radius: 5px;
  color: #5f85c6;
  background: rgba(255, 255, 255);
  display: flex;
  position: relative;
  z-index: 999;
  width: 20vw;
  height: 100%;
  display: flex;
  overflow-y: scroll;
}

/*
 * 原双模块导航栏样式：恢复双模块时，请取消注释本规则组，
 * 并注释其后的“三模块导航栏样式”。
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #ffffff;
  letter-spacing: 3px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  width: 50%;
  border: none;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  border: none;
  background: linear-gradient(
    180deg,
    rgba(20, 146, 249),
    rgba(145, 200, 239),
    rgba(255, 255, 255, 0.5)
  );
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  border: none;
  background: linear-gradient(
    180deg,
    rgba(155, 216, 253, 0.8),
    // rgba(205, 231, 250, 0.5),
    rgba(255, 255, 255, 0.8)
  );
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #2c5da7;
  letter-spacing: 3px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  border-radius: 5px 5px 0 0;
}
*/

/* 三模块导航栏样式：保持左侧大模块 20vw × 100% 不变。 */
:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  display: flex;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  border: none;
  background: linear-gradient(180deg, #1492f9 0%, #75c8f2 58%, #d8f0fd 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 44%);
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  position: relative;
  display: flex;
  flex: 1 1 33.333%;
  align-items: center;
  justify-content: center;
  width: 33.333%;
  min-width: 0;
  height: 40px;
  padding: 0;
  overflow: hidden;
  font-family: "Source Han Sans SC", "Microsoft YaHei", sans-serif;
  font-size: clamp(9px, 0.68vw, 12px);
  font-weight: 500;
  line-height: 1.25;
  color: #fff;
  letter-spacing: clamp(0px, 0.05vw, 1px);
  text-align: center;
  text-overflow: clip;
  white-space: nowrap;
  border: none;
  border-radius: 0;
  transition:
    color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

/* Element Plus 会为第二项和末项预留关闭按钮内边距，需清除以保证三项几何居中。 */
:deep(.el-tabs--top.el-tabs--card > .el-tabs__header .el-tabs__item) {
  padding-inline: 0 !important;
}

:deep(
    .el-tabs--card > .el-tabs__header .el-tabs__item:not(:last-child)::before
  ) {
  position: absolute;
  top: 9px;
  right: 0;
  width: 1px;
  height: 22px;
  content: "";
  background: linear-gradient(
    180deg,
    transparent,
    rgba(255, 255, 255, 0.62),
    transparent
  );
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item:hover:not(.is-active)) {
  color: #f8fdff;
  background: rgba(24, 133, 221, 0.16);
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  font-weight: 600;
  color: #2863a7;
  background: linear-gradient(
    180deg,
    rgba(208, 240, 255, 0.98) 0%,
    rgba(255, 255, 255, 0.96) 100%
  );
  border: none;
  border-radius: 5px 5px 0 0;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.78);
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active::after) {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 30px;
  height: 2px;
  content: "";
  background: linear-gradient(
    90deg,
    transparent,
    #1597ed 28%,
    #1597ed 72%,
    transparent
  );
  transform: translateX(-50%);
}
:deep(.el-table) {
  background: rgba(4, 44, 103, 0);
  padding: 0 20px;
  margin-bottom: 20px;
}
:deep(.el-table__body) {
  width: 100% !important;
}
:deep(.el-table__header) {
  width: 100% !important;
}

@media screen and (max-width: 1670px) {
  :deep(.el-table__body) {
    width: auto !important;
  }
  :deep(.el-table__header) {
    width: auto !important;
  }
}

:deep(.el-table__inner-wrapper):before {
  display: none;
}
:deep(.el-tabs--card > .el-tabs__header) {
  position: fixed;
  z-index: 999;
  width: calc(20vw - 2px);
  background: rgba(255, 255, 255, 0);
  border-radius: 5px 5px 0 0;
}
:deep(.el-tabs__content) {
  padding-top: 60px;
}

@media screen and (max-width: 1100px) {
  :deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
    font-size: 9px;
    letter-spacing: 0;
  }
}
// :deep(.el-select__wrapper) {
//   background: rgb(255 255 255 / 0%);
//   box-shadow: 0 0 0 1px #0080ff inset;
// }
</style>
