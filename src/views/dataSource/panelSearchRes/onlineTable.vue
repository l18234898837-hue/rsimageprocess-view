<template>
  <div class="w-full border border-[rgba(210,210,212,0)] rounded-sm">
    <pure-table
      align-whole="center"
      show-overflow-tooltip
      :columns="columns"
      :data="dataList"
      :loading="loading"
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
      </template>
    </pure-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import bus from "@/utils/bus";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";
import { storeToRefs } from "pinia";
import { useLayerStore } from "@/store/modules/layer";
import {
  addOnlineLayer,
  focusOnlineFrameLayer
} from "@/utils/addOriginalLayer";
import { message } from "@/utils/message";
const store = useLayerStore();

const { layerList } = storeToRefs(store);

const loading = ref(false);

const dataList = ref([]);
const online_data = ref();
const onlineTypes = ref([]);
const checkedDataList = ref([]);
let onlineEntities = [] as any;
const columns: TableColumnList = [
  {
    type: "selection",
    // width: "20px"
    align: "left"
  },
  {
    label: "数据名称",
    prop: "name",
    align: "left"
  },
  {
    label: "级别",
    prop: "level",
    width: "50px"
  },
  {
    label: "卫星",
    prop: "sensor"
  },
  {
    label: "产生时间",
    prop: "time",
    align: "center"
  }
];

const loadDataList = () => {
  const onlineType = dataList.value[0].sensor == "Sentinel" ? "2" : "1";
  // dataList.value = [];
  loading.value = true;
  bus.emit("searchOnlineData", onlineType);
};

bus.on("loadingOnlineTable", (status: boolean) => {
  // dataList.value = [];
  loading.value = status;
});

const handleSelectionChange = async val => {
  if (!val.length) {
    // map.viewer.imageryLayers.removeAll();
    map.removeAllLayer();
    map.removeImageLayers();
    bus.emit("loadOnlineDataBtnStatus", false);
  } else {
    bus.emit("loadOnlineDataBtnStatus", true);
  }
  checkedDataList.value = val;
  const selIds = val.map(d => d.id);
  onlineEntities.forEach(entity => {
    entity.show = selIds.indexOf(entity._id) > -1;
  });
  map.getOnlineImageLayers().forEach(({ layer, id }: any) => {
    layer.show = selIds.indexOf(id) > -1;
  });
  // map.viewer.scene.screenSpaceCameraController.enableRotate = false;
  // map.viewer.flyTo(onlineEntities);
};

const handleRowClick = (row: any) => {
  if (!row.bbox || row.bbox.length < 4) return;
  if (!checkedDataList.value.some(item => item.id == row.id)) return;
  map.viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      row.bbox[0],
      row.bbox[2],
      row.bbox[1],
      row.bbox[3]
    ),
    duration: 1
  });
  focusOnlineFrameLayer(row);
};

/**
 * 载入数据
 */
const loadData = (item?: any) => {
  const count = checkedDataList.value.length;
  if (count === 0) return message("请选择要载入的数据", { type: "warning" });
  if (count > 10)
    return message("单次载入数据过多，请分多次载入", { type: "warning" });
  console.log(checkedDataList.value);

  checkedDataList.value.forEach(data => {
    addOnlineLayer(
      data,
      online_data.value,
      data.thumbnailUrl || data.browse[0].browsePath
    );
  });
  if (layerList.value.length && checkedDataList.value.length) {
    const layerArr = new Set(checkedDataList.value.map(obj => obj["id"]));
    const newLayerList = layerList.value.filter(obj => layerArr.has(obj["id"]));
    map.reAddAllLayer(newLayerList);
  }
};

bus.on("loadOnlineImg", () => {
  loadData();
});

bus.on(
  "getSearchOnlineDataList",
  async ({ data, entities, onlineData, online_types }: any) => {
    dataList.value = data;
    loading.value = false;
    online_data.value = onlineData;
    onlineEntities = entities ? await map.loadGeoJSON(entities) : [];
    onlineTypes.value = online_types.filter(
      item => item == "Sentinel" || item == "Landsat"
    );
  }
);

defineExpose({ dataList, checkedDataList, onlineTypes });
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
