<template>
  <div class="h-[100%]">
    <div class="flex h-[100%] relative justify-between box-border">
      <div
        class="relative h-[100%] transition-all duration-200 ease-in-out"
        :style="{
          width: isCollapse ? '3.5vw' : '10vw',
          display: userToken ? 'block' : 'none'
        }"
      >
        <menuTree ref="menuRef" @getDataList="getDataList" />
      </div>

      <div
        v-if="isEqu_voyage"
        class="relative h-[100%] flex-1 flex items-center justify-center"
      >
        <div class="soure bg-[#ffffff]">
          <div
            class="text-[#545353] m-[20px] mb-0 pb-[20px]"
            style="
              border-bottom: 2px solid;
              border-image: linear-gradient(
                  to right,
                  #0080ff,
                  rgb(255 255 255 / 0%)
                )
                1;
            "
          >
            <el-breadcrumb separator=">">
              <el-breadcrumb-item>
                <span
                  class="text-[#545353] cursor-pointer hover:text-[#0080ff]"
                  @click="handleBreadcrumbClickToHome()"
                  >首页</span
                >
              </el-breadcrumb-item>
              <el-breadcrumb-item @click="handleBreadcrumbClick">
                <span
                  class="text-[#545353] cursor-pointer hover:text-[#0080ff]"
                >
                  {{ $route.meta.title }}
                </span>
              </el-breadcrumb-item>
              <el-breadcrumb-item
                v-for="item in breadcrumbItems"
                :key="item.menuId"
              >
                <span
                  :class="[
                    'text-[#545353]',
                    item.clickable
                      ? 'cursor-pointer hover:text-[#0080ff]'
                      : 'cursor-default'
                  ]"
                  @click="handleBreadcrumbMenuClick(item)"
                >
                  {{ item.label }}
                </span>
              </el-breadcrumb-item>
              <el-breadcrumb-item v-if="activeSetData">
                <span class="text-[#545353]">{{ activeSetData }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
            <div v-show="showMergeControls" class="but_box">
              <el-button type="primary" @click.stop="handleDataMerge"
                >数据融合</el-button
              >
              <el-button type="primary" @click.stop="handleDataRoll"
                >卷帘</el-button
              >
            </div>
          </div>
          <el-scrollbar
            v-if="!(menuTreeType === 'instrument' && showInstrumentDetail)"
            height="calc(100% - 50px)"
          >
            <div v-loading="!dataList.length" class="soure_content">
              <div
                v-for="item in dataList"
                :key="item.id"
                :class="[
                  'content_item',
                  ' h-[300px] text-[#fff] border border-[rgba(210,210,212,0.8)]',
                  'cursor-pointer rounded-md overflow-hidden',
                  'hover:scale-95 hover:shadow-2xl hover:shadow-[#c4c2c2]',
                  'transition-all duration-300 ease-in-out'
                ]"
                :title="item.name"
                :style="{ width: isCollapse ? '29.97vw' : '32.35%' }"
                @click="handleDataItem(item, $event)"
              >
                <div
                  class="w-[100%] h-[200px] bg-black flex items-center justify-center overflow-hidden"
                >
                  <el-image
                    v-if="item.thumbUrl"
                    style="height: 100%"
                    fit="contain"
                    :src="item.thumbUrl"
                  />
                  <el-image
                    v-else
                    style="width: 100%"
                    fit="contain"
                    :src="imgCarousel"
                  />
                </div>
                <div
                  class="w-[100%] h-[50px] leading-[50px] box-border pl-[15px] overflow-hidden text-nowrap text-ellipsis"
                  style="
                    background-image: linear-gradient(
                      to right,
                      #0080ff,
                      rgb(255 255 255 / 0%)
                    );
                  "
                >
                  {{
                    item.name
                      ? item.name
                      : item.instrumentName
                        ? item.instrumentName
                        : item.voyageName
                  }}
                </div>
                <div v-if="showMergeControls" class="isCheck">
                  <el-checkbox
                    v-model="item.isCheck"
                    @change="handleCheckChange(item)"
                  />
                </div>
                <!-- <div v-if="menuTreeType == 'instrument'">
                  <div
                    class="w-[100%] h-[50px] leading-[25px] box-border px-[15px] text-[#545353] overflow-hidden text-ellipsis"
                  >
                    参数：{{ item.parameters || "-" }}
                  </div>
                  <div
                    class="w-[100%] h-[40px] leading-[40px] box-border px-[15px] text-[#545353] overflow-hidden text-nowrap text-ellipsis"
                  >
                    生产厂家：{{ item.manufacturer || "-" }}
                  </div>
                  <div
                    class="w-[100%] h-[40px] leading-[40px] box-border px-[15px] text-[#545353] overflow-hidden text-nowrap text-ellipsis"
                  >
                    代理商：{{ item.distributor || "-" }}
                  </div>
                </div> -->
                <div
                  class="w-[100%] h-[50px] leading-[50px] box-border pl-[15px] overflow-hidden text-nowrap text-ellipsis"
                >
                  {{
                    item.description
                      ? item.description
                      : item.instrumentCode
                        ? item.instrumentCode
                        : item.dataDescription
                  }}
                </div>
              </div>
              <div
                v-if="showCatalogPagination"
                class="w-[100%] flex justify-center py-4 catalog-pagination-wrap"
              >
                <el-pagination
                  v-loading="pageLoading"
                  background
                  layout="total, prev, pager, next"
                  :total="catalogPage.total"
                  :page-size="catalogPage.pageSize"
                  :current-page="catalogPage.currentPage"
                  @current-change="handleCatalogPageChange"
                />
              </div>
            </div>
          </el-scrollbar>
          <div v-if="menuTreeType === 'instrument' && showInstrumentDetail">
            <resultDeatil :instrument="currentInstrument" />
          </div>
        </div>
      </div>
      <div
        v-show="!isEqu_voyage"
        class="relative h-[100%] flex-1 flex items-center justify-center"
      >
        <div class="panel py-[20px]">
          <div class="flex flex-col pointer-events-auto">
            <panel />
            <instrumentTable />
          </div>
          <div class="flex flex-col pointer-events-auto">
            <panelSearchRes />
            <instrumentDetail />
          </div>
        </div>

        <div class="main-map">
          <div class="map-con">
            <Map />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, computed, reactive } from "vue";
import bus from "@/utils/bus";
import { useRouter, useRoute } from "vue-router";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
import resultDeatil from "./resultDeatil.vue";
import {
  getAlgorithmCatalogPage,
  getAlgorithmCatalogList,
  stInstrumentsInfo
} from "@/api/dataSource/stThematic";
import { downloadImageById } from "@/api/system/dict/data";
import Map from "@/components/Map/map.vue";
import menuTree from "./menuTree.vue";
import panel from "./panel/panel.vue";
import panelSearchRes from "@/views/dataSource/panelSearchRes/index.vue";
import instrumentTable from "./panelSearchRes/instrumentTable.vue";
import instrumentDetail from "@/views/dataSource/panelSearchRes/instrumentDetail.vue";
import { ElMessage } from "element-plus";
import imgCarousel from "/images/img2@1x.png";
import { useNav } from "@/layout/hooks/useNav";
const { userToken } = useNav();

const router = useRouter();
const route = useRoute();

const menuRef = ref();
const pageLoading = ref(false);
const catalogPage = reactive({
  currentPage: 1,
  pageSize: 9,
  total: 0
});
const showCatalogPagination = computed(
  () =>
    menuTreeType.value === "catalog" &&
    !!activeSetData.value &&
    catalogPage.total > 0
);
const isCollapse = ref(false);
const dataList = ref([]);
const isEqu_voyage = ref(false);
const activeMenu = ref();
const activeSetData = ref();
const breadcrumbItems = ref<
  { label: string; menuId: string; clickable?: boolean }[]
>([]);
const pid = ref();

let menuTreeType = ref<string>();
const isThematicDataNav = ref(false);
/** 专题数据下第三级（面包屑第三段）：路由返回与点击目录进入均适用 */
const showMergeControls = computed(
  () =>
    isThematicDataNav.value &&
    !!activeSetData.value &&
    menuTreeType.value === "catalog"
);

bus.on("isCollapse", () => {
  isCollapse.value = !isCollapse.value;
});

bus.on("isEqu_voyage", () => {
  isEqu_voyage.value = true;
});

bus.on("isnEqu_voyage", () => {
  isEqu_voyage.value = false;
});

bus.on("handleSetData", () => {
  handleSetData();
});

const handleCatalogPageChange = (p: number) => {
  if (!pid.value) pid.value = route.query.pid || "";
  pageLoading.value = true;
  menuRef.value?.loadCatalogPage(pid.value, p).then(() => {
    pageLoading.value = false;
  });
};

const handleSetData = () => {
  activeSetData.value = "";
  showInstrumentDetail.value = false;
};

const activeSetId = ref();
const handleBreadcrumbClick = async () => {
  console.log(activeSetId.value);
  await getAlgorithmCatalogList({ pid: activeSetId.value }).then(async res => {
    dataList.value = res.data;
    activeSetData.value = "";
    showInstrumentDetail.value = false;
    currentInstrument.value = undefined;
    catalogPage.total = 0;
    catalogPage.currentPage = 1;
  });
};

const handleBreadcrumbClickToHome = () => {
  router.push("/").then(() => {
    window.location.reload();
  });
};

const handleBreadcrumbMenuClick = (item: {
  label: string;
  menuId: string;
  clickable?: boolean;
}) => {
  if (!item.clickable) return;
  menuRef.value?.activateMenu(item.menuId, pid.value || route.query.pid);
};

const handleDataItem = async (data, e?: MouseEvent) => {
  console.log(data);
  const el = e?.target as HTMLElement | undefined;
  if (el?.closest?.(".isCheck")) return;
  if (data.level) {
    pid.value = data.id;
    activeSetData.value = data.name;
    const res = await getAlgorithmCatalogPage({
      pid: data.id,
      pageSize: catalogPage.pageSize,
      pageNum: 1
    });
    dataList.value = res.data.rows;
    catalogPage.total = Number(res.data.total) || 0;
    catalogPage.currentPage = 1;
    if (dataList.value.length) {
      dataList.value.forEach(async item => {
        const res = await getThumbJpg(item.id);
        item.thumbUrl = await imgStreamToBase64(res.data);
        item.isCheck = item.isCheck || false;
      });
    }
    return;
  }
  // debugger;
  if (data.isEqu) {
    router.push(
      `/satellite-applications?instrumentId=${data.id}&menuId=${activeMenu.value}`
    );
  } else if (data.isVoyage) {
    router.push(
      `/satellite-applications?voyageId=${data.id}&menuId=${activeMenu.value}`
    );
  } else if (menuTreeType.value == "instrument") {
    currentInstrument.value = data;
    showInstrumentDetail.value = true;
    // return;s
  } else {
    router.push({
      path: `/satellite-applications`,
      query: {
        menuId: activeMenu.value,
        pid: pid.value || route.query.pid
        // activeSetData: activeSetData.value
      },
      state: {
        activeSetData: activeSetData.value,
        layer: JSON.stringify(data)
      }
    });
  }
};

// 记录需要融合的数据
let activeMergeBtn = ref(false);
const mergeDataList = ref([]);
/** 勾选≥2 条走融合；单条仍通过卡片点击 handleDataItem */
const handleDataMerge = () => {
  mergeDataList.value = dataList.value.filter(item => item.isCheck);
  if (mergeDataList.value.length < 2) {
    ElMessage.warning("请选择2个以上数据进行融合");
    return;
  }
  router.push({
    path: `/satellite-applications`,
    query: {
      menuId: activeMenu.value,
      pid: pid.value || route.query.pid
    },
    state: {
      activeSetData: activeSetData.value,
      layerList: JSON.stringify(mergeDataList.value)
    }
  });
};

const handleDataRoll = () => {
  mergeDataList.value = dataList.value.filter(item => item.isCheck);
  if (mergeDataList.value.length !== 2) {
    ElMessage.warning(
      mergeDataList.value.length < 2 ? "请选择2个数据" : "最多选择2个数据"
    );
    return;
  }
  router.push({
    path: `/satellite-applications`,
    query: {
      menuId: activeMenu.value,
      pid: pid.value || route.query.pid
    },
    state: {
      activeSetData: activeSetData.value,
      layerList: JSON.stringify(mergeDataList.value),
      isRoll: true
    }
  });
};
const showInstrumentDetail = ref(false);
const currentInstrument = ref();
const getDataList = async (data: any) => {
  menuTreeType.value = data.type;
  if (data.isThematicData !== undefined) {
    isThematicDataNav.value = data.isThematicData;
  }
  breadcrumbItems.value = Array.isArray(data.breadcrumbItems)
    ? data.breadcrumbItems
    : [];
  showInstrumentDetail.value = false;
  currentInstrument.value = undefined;

  activeSetId.value = data.pid || activeSetId.value;
  activeMenu.value = data.menuId;
  dataList.value = data.data.rows || data.data;
  if (data.data.rows) {
    catalogPage.total = Number(data.data.total) || 0;
    if (typeof data.pageNum === "number") {
      catalogPage.currentPage = data.pageNum;
    }
    activeSetData.value = history.state.activeSetData
      ? history.state.activeSetData
      : activeSetData.value;
    dataList.value.forEach(async item => {
      const res = await getThumbJpg(item.id);
      item.thumbUrl = await imgStreamToBase64(res.data);
      item.isCheck = item.isCheck || false;
    });
  } else {
    catalogPage.total = 0;
    catalogPage.currentPage = 1;
    if (data.type == "instrument") {
      menuTreeType.value = "instrument";
      dataList.value.forEach(async item => {
        const res = await downloadImageById(item.imageId);
        item.thumbUrl = await imgStreamToBase64(res.data);
      });
    }
  }

  console.log("dataList", dataList.value);
};
const handleCheckChange = (item: any) => {
  mergeDataList.value = dataList.value.filter(row => row.isCheck);
};
onMounted(async () => {
  if (route.query.menuId) {
    isEqu_voyage.value = true;
  }
});
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  opacity: 0;
  width: 5px;
  background-color: rgba(255, 255, 255, 0);
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0);
}

.panel {
  position: absolute;
  // background-color: rgb(231, 228, 228);
  overflow: hidden;
  height: 100%;
  width: calc(100% - 50px);
  // border-radius: 10px;
  z-index: 100;
  pointer-events: none;
  box-sizing: border-box;
  // padding: 30px;
  display: flex;
  justify-content: space-between;
}

.main-map {
  // background-color: aqua;
  position: absolute;
  overflow-y: hidden;
  height: 100%;
  // height: calc(100% - 50px);
  width: 100%;
  // border-radius: 10px;
  .map-con {
    display: flex;
    flex-wrap: wrap;
    height: 100%;
  }
}
.soure {
  position: absolute;
  overflow-y: hidden;
  scrollbar-gutter: stable;
  height: 100%;
  // height: calc(100% - 50px);
  width: calc(100% - 0px);
  // border-radius: 10px;
  // padding-left: 5px;
  .soure_content {
    display: flex;
    flex-wrap: wrap;
    // justify-content: space-between;
    // box-sizing: border-box;
    padding: 20px;
    // padding-bottom: 50px;
    gap: 23px;
    // height: 100%;
    height: calc(100% - 50px);
    // overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }
    .content_item {
      // margin: 0 15px 10px 0;
      .isCheck {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding-right: 10px;
      }
    }
  }
}

.but_box {
  display: flex;
  justify-content: flex-end;
  margin-right: 180px;
  position: relative;
  z-index: 10; // 确保按钮在较高层级
}

.el-breadcrumb {
  position: relative;
  z-index: 1;
}
</style>
