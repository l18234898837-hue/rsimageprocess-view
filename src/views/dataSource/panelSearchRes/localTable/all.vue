<template>
  <div class="w-full border border-[rgba(35,115,234,0)] rounded-sm">
    <pure-table
      align-whole="center"
      show-overflow-tooltip
      :columns="columns"
      :data="dataList"
      size="small"
      :border="false"
      row-key="id"
      height="10vw"
      :cell-style="{
        border: '4px solid #fff',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none'
      }"
      :row-style="{
        cursor: 'pointer',
        background:
          'linear-gradient(90deg, #c7e6ff 0%, rgb(199 230 255 / 0%) 100%)'
      }"
      :header-cell-style="{
        backgroundColor: 'rgba(214, 236, 254)'
      }"
      @selection-change="handleSelectionChange"
      @select-all="handleSelectionAll"
      @select="handleSelectCheck"
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
          @click="loadDataList"
          >加载更多</el-button
        >
      </template></pure-table
    >
  </div>
  <div
    class="px-[10px]"
    :style="{
      display: 'flex',
      marginTop: '10px',
      justifyContent: 'space-between'
    }"
  >
    <el-button style="width: 49%; border-radius: 20px" @click="loadData"
      >载入</el-button
    >

    <el-button
      style="width: 49%; background: #20c896; border-radius: 20px"
      type="primary"
      :loading="downloadLoading"
      @click="getAddRibbon"
      >色带载入</el-button
    >
    <el-button
      style="width: 49%; background: #21b3ff; border-radius: 20px"
      type="primary"
      :loading="downloadLoading"
      @click="downloadData"
      >下载</el-button
    >
  </div>
  <addRibbon ref="addRibbonRef" @confirmColorRamp="loadDataToRamp" />
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import bus from "@/utils/bus";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";
import dayjs from "dayjs";
import { storeToRefs } from "pinia";
import { useLayerStore } from "@/store/modules/layer";
import {
  getThumbJpg,
  getThumbJpgByColorRampId,
  downloadLocalDataByIds,
  wgs84ToGcj20,
  getWindData
} from "@/api/dataSource/panel/loal";
import { message } from "@/utils/message";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
import { useUserStoreHook } from "@/store/modules/user";
import {
  addOriginalLayer,
  addWindLayer,
  focusLocalFrameLayer
} from "@/utils/addOriginalLayer";
import addRibbon from "@/components/Ribbon/index.vue";
import {
  isWindData,
  validateWindFilePairs,
  buildWindIdList,
  filterNonWindData
} from "@/utils/dataUtils";
import { resetLegend } from "@/utils/legend";
const userStore: any = useUserStoreHook();
const store = useLayerStore();

const { loadEntitys } = storeToRefs(store);
const dataList = ref([]);
const loading = ref(false);
const downloadLoading = ref(false);
const columns: TableColumnList = [
  {
    type: "selection",
    // width: "20px",
    align: "left"
  },
  {
    label: "数据名称",
    prop: "name",
    align: "left"
  },
  {
    label: "级别",
    prop: "satelliteLevel",
    width: "50px"
  },
  {
    label: "卫星",
    prop: "satelliteName"
  },
  {
    label: "产生时间",
    prop: "productTime",
    align: "center"
  }
];
const checkedDataList = ref([]);
let entity = null;
const entities = ref([]);

const handleOperation = row => {
  console.log(row);
  console.log(map.getLocalImageLayers());
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
        gcj20Min.data.lng,
        gcj20Min.data.lat,
        gcj20Max.data.lng,
        gcj20Max.data.lat
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
  loadEntitys.value.push(coordinates);
};

/**
 * handleSelectionChange 处理选择变化
 */
const handleSelectionChange = val => {
  // 恢复默认色带
  resetLegend();
  checkedDataList.value = val;
  // bus.emit("getTimeSequenceDataList", { data: val, type: "all" });
  if (!val.length) {
    map.removeLocalImageLayers();
    entities.value.forEach(item => {
      map.viewer.entities.removeById(item.id);
    });
  }
};

const handleSelectionAll = val => {
  if (!val.length) {
    map.removeLocalImageLayers();
    entities.value.forEach(item => {
      map.viewer.entities.removeById(item.id);
    });
    bus.emit("getTimeSequenceDataList", []);
    bus.emit("showTimeSequence", { text: "hidden" });
  }
  val.forEach(row => {
    showCoordinates(row);
  });
  // 清空风场图层
  map.removeWindLayer();
};

const handleSelectCheck = (val, row) => {
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
    // map.viewer.camera.flyTo({
    //   destination: Cesium.Rectangle.fromDegrees(
    //     Number(row.lngMin),
    //     Number(row.latMin),
    //     Number(row.lngMax),
    //     Number(row.latMax)
    //   )
    // });
  } else {
    map.viewer.entities.values.forEach(item => {
      if (item.id == row.id) {
        item.show = false;
      }
    });
  }
};

const allDataList = ref([]);
bus.on("getSearchAllLocalDataList", async ({ data }: any) => {
  dataList.value = data;
  allDataList.value = data;
});

const handleRowClick = async (row: any) => {
  if (!checkedDataList.value.some(item => item.id == row.id)) return;
  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(row.lngMin),
    lat: Number(row.latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(row.lngMax),
    lat: Number(row.latMax)
  });
  map.viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(gcj20Min.data.lng),
      Number(gcj20Min.data.lat),
      Number(gcj20Max.data.lng),
      Number(gcj20Max.data.lat)
    ),
    duration: 1
  });
  // 1. 先创建矩形
  // const rectangle = Cesium.Rectangle.fromDegrees(
  //   Number(gcj20Min.data.lng),
  //   Number(gcj20Min.data.lat),
  //   Number(gcj20Max.data.lng),
  //   Number(gcj20Max.data.lat)
  // );

  // // 2. 获取矩形中心点
  // const center = Cesium.Rectangle.center(rectangle);

  // // 3. 设置你想要的高度（单位：米）
  // const height = 15000; // 改成你想要的高度，比如 3000、8000、10000

  // // 4. 飞向中心点 + 指定高度
  // map.viewer.camera.flyTo({
  //   destination: Cesium.Cartesian3.fromRadians(
  //     center.longitude,
  //     center.latitude,
  //     height
  //   ),
  //   duration: 1
  // });
  //抬高
  focusLocalFrameLayer(row);
};

const addRibbonRef = ref();
const getAddRibbon = () => {
  // 如果还没选数据，就提示：请先选择数据
  if (!checkedDataList.value.length) {
    message("请先选择数据", { type: "warning" });
    return;
  }
  // 如果已经选了数据，就弹出色带选择框
  addRibbonRef.value.showDialog = true;
};
/**
 * 载入数据
 */
const loadData = async () => {
  const count = checkedDataList.value.length;
  if (count === 0) return message("请选择要载入的数据", { type: "warning" });
  if (count > 10)
    return message("单次载入数据过多，请分多次载入", { type: "warning" });
  // console.log(1112, checkedDataList.value);

  const hasWindData = checkedDataList.value.some(isWindData);
  if (hasWindData && !validateWindFilePairs(checkedDataList.value)) {
    message("请选择完整的风速和方向数据", { type: "warning" });
    return;
  }
  debugger;
  // entities.value.forEach(item => {
  //   map.viewer.entities.removeById(item.id);
  // });
  map.removeLocalImageLayers();
  resetLegend();
  // 是否选了风场数据，如果选了，则加载风场数据
  if (hasWindData) {
    const idList = buildWindIdList(checkedDataList.value);
    // console.log(33, idList);
    idList.forEach(async item => {
      // console.log(44, item);
      const params = {
        directionDataId: item.directionDataId,
        speedDataId: item.speedDataId
      };
      const res = await getWindData(params);
      // console.log(55, res);
      addWindLayer(res.data);
    });
  }
  checkedDataList.value.forEach(async data => {
    if (isWindData(data)) return;
    const res = await getThumbJpgByColorRampId(data.id, 1);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(data, url, "local");
    // const gcj20Min: any = await wgs84ToGcj20({
    //   lng: Number(data.lngMin),
    //   lat: Number(data.latMin)
    // });
    // const gcj20Max: any = await wgs84ToGcj20({
    //   lng: Number(data.lngMax),
    //   lat: Number(data.latMax)
    // });
  });
  // bus.emit("getTimeSequenceDataList", []);
  // let nonWindDataList = filterNonWindData(checkedDataList.value);
  // bus.emit("getTimeSequenceDataList", nonWindDataList);
  // bus.emit("showTimeSequence", false);
  bus.emit("getTimeSequenceDataList", []);
  bus.emit("showTimeSequence", { text: "loadingData" });
  bus.emit("getTimeSequenceDataList", checkedDataList.value);
};

/**
 * 载入数据
 */
const loadDataToRamp = (colorId: number) => {
  const count = checkedDataList.value.length;
  if (count === 0) return message("请选择要载入的数据", { type: "warning" });
  if (count > 10)
    return message("单次载入数据过多，请分多次载入", { type: "warning" });
  // 清除实体和本地图层
  // entities.value.forEach(item => {
  //   map.viewer.entities.removeById(item.id);
  // });
  map.removeLocalImageLayers();

  checkedDataList.value.forEach(async data => {
    if (isWindData(data)) return;
    const res = await getThumbJpgByColorRampId(data.id, colorId);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(data, url, "local");
  });

  bus.emit("getTimeSequenceDataList", []);
  bus.emit("getTimeSequenceDataList", checkedDataList.value);
  bus.emit("showTimeSequence", { text: "loadingData" });
};

const loadDataList = () => {
  loading.value = true;
  setTimeout(() => {
    bus.emit("searchAllLocalData");
    loading.value = false;
  }, 500);
  bus.emit("getTimeSequenceDataList", []);
  bus.emit("showTimeSequence", { text: "loadingData" });
};

/**
 * 下载数据
 */
const downloadData = async () => {
  console.log(checkedDataList.value);
  if (!userStore.info.admin && checkedDataList.value.length > 1) {
    message("只有高级用户可以同时下载多条数据", { type: "warning" });
    return;
  } else if (!checkedDataList.value.length) {
    message("请选择要下载的数据", { type: "warning" });
    return;
  }
  downloadLoading.value = true;
  const res = await downloadLocalDataByIds({
    name: "",
    dataIds: checkedDataList.value.map(item => item.id),
    type: 1
  });
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${checkedDataList.value[0].id}_${dayjs().format("YYYYMMDD_HH:mm:ss")}.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
  downloadLoading.value = false;
};
</script>

<style lang="scss" scoped>
:deep(.el-table) {
  // padding: 10px 0;
  background: rgb(4 44 103 / 0%);
  // margin-bottom: 20px;
}

:deep(.el-table__inner-wrapper::before) {
  height: 0;
}
</style>
