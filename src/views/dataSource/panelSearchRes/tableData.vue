<template>
  <div class="w-full border border-[rgba(35,115,234,0.8)] rounded-sm">
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
        backgroundColor: 'rgba(4, 44, 103, 0.9)',
        borderTop: '2px solid rgba(4, 44, 103, 0.9)',
        borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
        color: '#fff'
      }"
      :header-cell-style="{
        backgroundColor: 'rgba(4, 44, 103, 0.9)',
        borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
        color: '#fff'
      }"
      @selection-change="handleSelectionChange"
      @select-all="handleSelectionAll"
      @select="handleSelectCheck"
    >
      <template #append>
        <el-button
          v-if="dataList.length"
          style="width: 100%; padding: 10px"
          link
          :loading="loading"
          type="primary"
          @click="loadDataList"
          >加载更多</el-button
        >
      </template></pure-table
    >
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import bus from "@/utils/bus";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";
import { storeToRefs } from "pinia";
import { useLayerStore } from "@/store/modules/layer";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { EVENT_TYPE, Data, MOD_TYPE } from "@/components/LayerList/layers";
import { message } from "@/utils/message";

const store = useLayerStore();

const { layerList } = storeToRefs(store);

const props = defineProps({
  typeString: String
});

const dataList = ref([]);
const loading = ref(false);
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
    prop: "satellite"
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

const showCoordinates = coordinates => {
  if (map.viewer.entities.values.some(item => item.id == coordinates.id)) {
    return;
  }
  entity = map.viewer.entities.add({
    id: coordinates.id,
    show: true,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(
        coordinates.lngMin,
        coordinates.latMin,
        coordinates.lngMax,
        coordinates.latMax
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
  // map.viewer.flyTo(entity);
  map.viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(coordinates.lngMin),
      Number(coordinates.latMin),
      Number(coordinates.lngMax),
      Number(coordinates.latMax)
    )
  });
};

const handleSelectionChange = val => {
  checkedDataList.value = val;
  if (!val.length) {
    map.removeLocalImageLayers();
    entities.value.forEach(item => {
      map.viewer.entities.removeById(item.id);
    });
  }
};

const handleSelectionAll = val => {
  if (!val.length) {
    entities.value.forEach(item => {
      map.viewer.entities.removeById(item.id);
    });
    map.removeLocalImageLayers();
  }
  val.forEach(row => {
    showCoordinates(row);
  });
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
  } else {
    map.viewer.entities.values.forEach(item => {
      if (item.id == row.id) {
        item.show = false;
      }
    });
  }
};

bus.on("getSearchDataList", (data: any) => {
  console.log(data);
  dataList.value = data;
});

const allDataList = ref([]);
const publicDataList = ref([]);
const privateDataList = ref([]);
bus.on("getSearchLocalDataList", async ({ data }: any) => {
  dataList.value = data;
  allDataList.value = data;
  publicDataList.value = data;
  // dataList.value.forEach(item => {
  //   showCoordinates(item);
  // });
});

/**
 * 将后端返回的缩略图数据流转为base64
 */
const imgStreamToBase64 = streamData => {
  let base64Url = null;
  base64Url =
    "data:image/png;base64," +
    btoa(
      new Uint8Array(streamData).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );
  return base64Url;
};

/**
 * 载入数据
 */
const loadData = () => {
  checkedDataList.value.forEach(async data => {
    const res = await getThumbJpg(data.id);
    const url = imgStreamToBase64(res.data);
    bus.emit(EVENT_TYPE.addOriginalLayer, {
      data,
      url,
      type: "local"
    });
  });
};
bus.on("loadLocalImg", () => {
  loadData();
});

const loadDataList = () => {
  loading.value = true;
  bus.emit("searchLocalData");
  loading.value = false;
};

watch(
  () => props.typeString,
  val => {
    if (val == "private") {
      dataList.value = privateDataList.value;
    } else {
      dataList.value = allDataList.value;
    }
  },
  { immediate: true }
);
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
