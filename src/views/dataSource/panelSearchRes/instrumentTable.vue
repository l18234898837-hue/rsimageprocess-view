<template>
  <div
    v-show="showTable"
    :class="[
      'bg-white rounded-[5px] mt-[10px] w-[20vw] border border-[#87cbf0]',
      'pointer-events-auto overflow-hidden'
    ]"
  >
    <div
      class="bg-[rgba(255,255,255,0.7)] m-[10px] rounded-md border-[1px] border-[#87cbf0]"
    >
      <div
        class="w-full text-[16px] text-white"
        style="
          position: relative;
          top: 5px;
          right: 5px;
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
        "
      >
        查询结果
      </div>
      <div class="pt-[10px]">
        <pure-table
          align-whole="center"
          show-overflow-tooltip
          :columns="columns"
          :data="dataList"
          :loading="loading"
          size="small"
          :border="false"
          row-key="id"
          height="150px"
          :cell-style="{
            border: '4px solid #fff',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: 'none'
          }"
          :row-style="{
            background:
              'linear-gradient(90deg, #c7e6ff 0%, rgb(199 230 255 / 0%) 100%)'
          }"
          :header-cell-style="{
            backgroundColor: 'rgba(214, 236, 254)'
          }"
          row-class-name="cursor-pointer-row"
          @row-click="handleRowClick"
        >
          <template #append>
            <el-button
              v-if="dataList.length"
              style="
                width: 100%;
                padding: 10px;
                background: linear-gradient(
                  90deg,
                  #c7e6ff 0%,
                  rgb(199 230 255 / 0%) 100%
                );
                border: none;
                border-top: 4px solid #fff;
                border-radius: 0;
              "
              link
              :loading="loading"
              type="primary"
              @click="more"
              >加载更多</el-button
            >
          </template>
        </pure-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import bus from "@/utils/bus";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";

import { getSdObserveQuery } from "@/api/dataSource/instrument";
import headerBgImg from "@/assets/common/header-bg.png";
import waterImg from "/images/map_label/map_label_3.png";
import { message } from "@/utils/message";

const loading = ref(false);
const showTable = ref(false);
const dataList = ref<any[]>([
  {
    index: 1,
    id: "1",
    creatTime: "2026-01-01"
  }
]);

const columns = ref<TableColumnList>([
  {
    label: "序号",
    width: "50",
    formatter: (row: any, column: any, cellValue: any, index: any) => index + 1
  },
  {
    label: "数据ID",
    prop: "sdId"
  },
  {
    label: "产生时间",
    prop: "date"
  }
]);

const pagination = ref({
  pageNum: 1,
  pageSize: 10,
  total: 0
});
const searchForm = ref<any>({});

bus.on("clearSearchInstrumentData", () => {
  showTable.value = false;
  dataList.value = [];
  pagination.value = {
    pageNum: 1,
    pageSize: 10,
    total: 0
  };
  searchForm.value = {};
  const viewer = map.getViewer();
  viewer.entities.removeAll();
});

bus.on("searchObserveData", (form: any) => {
  showTable.value = true;
  searchForm.value = form;
  searchObserveData(form);
});

const addMapMarker = async (instrumentInfo: any) => {
  await nextTick();
  if (!instrumentInfo.longitude || !instrumentInfo.latitude) return;
  const viewer = map.getViewer();
  if (viewer.entities.getById(instrumentInfo.id)) return;

  const entity = viewer.entities.add({
    id: instrumentInfo.id,
    position: Cesium.Cartesian3.fromDegrees(
      Number(instrumentInfo.longitude),
      Number(instrumentInfo.latitude)
    ),
    billboard: {
      image: waterImg,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      scale: 0.2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, 0)
    },
    label: new Cesium.LabelGraphics({
      text: "",
      font: `16px Arial`,
      fillColor: Cesium.Color.fromCssColorString("#FFFFFF"),
      pixelOffset: new Cesium.Cartesian2(0, -50), // 动态偏移
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM
    })
  });
  // viewer.camera.setView({
  //   destination: Cesium.Cartesian3.fromDegrees(
  //     Number(instrumentInfo.longitude),
  //     Number(instrumentInfo.latitude),
  //     1000000
  //   )
  // });
  const viewerContainer: any = viewer.container;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement: any) {
    const pick = viewer.scene.pick(movement.position);
    if (Cesium.defined(pick) && pick.id === entity) {
      // isShow.value = !isShow.value;
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  handler.setInputAction(function (movement: any) {
    const pick = viewer.scene.pick(movement.endPosition);
    if (Cesium.defined(pick) && pick.id === entity) {
      viewerContainer.style.cursor = "pointer";
      // console.log("移动了实体: ", entity.id);
      // isShow.value = true;
    } else {
      viewerContainer.style.cursor = "default";
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
};

const handleRowClick = (row: any) => {
  // console.log("点击了行: ", row);
  bus.emit("showInstrumentDetail", row);
  const viewer = map.getViewer();
  // viewer.entities.values.forEach((item: any) => {
  //   if (item.id != row.id) {
  //     item.show = false;
  //   } else {
  //     item.show = true;
  //   }
  // });
  if (row.longitude && row.latitude) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        Number(row.longitude),
        Number(row.latitude),
        100000
      )
    });
  } else {
    message("缺少位置信息", { type: "warning" });
  }
};

const more = () => {
  pagination.value.pageSize += 5;
  searchObserveData(searchForm.value);
};

const searchObserveData = async (form: any) => {
  loading.value = true;
  const { data, total } = await getSdObserveQuery({
    pageSize: pagination.value.pageSize,
    pageNum: pagination.value.pageNum,
    ...form
  });
  dataList.value = data.rows;
  pagination.value.total = total;
  loading.value = false;
  const viewer = map.getViewer();
  dataList.value.forEach((item: any) => {
    addMapMarker(item);
    viewer.entities;
  });
  viewer.entities.values.forEach((item: any) => {
    item.show = true;
  });
};

onMounted(() => {});
</script>

<style lang="scss" scoped>
:deep(.cursor-pointer-row) {
  cursor: pointer;
}
</style>
