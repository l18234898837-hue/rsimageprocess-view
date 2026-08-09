<template>
  <div v-if="isShow" class="timeline-container flex">
    <div class="absolute top-[-40px] flex left-0">
      <el-select
        v-model="selectValue"
        placeholder="Select"
        style="width: 100px; overflow: hidden; border-radius: 8px"
      >
        <el-option
          v-for="item in selectDataList"
          :key="item.level"
          :label="item.level"
          :value="item.level"
          @click="handleOption(item)"
        />
      </el-select>
      <div class="ml-[10px]">
        <div v-show="layerName" class="text-ellipsis text-nowrap">
          {{ layerName }}
        </div>
      </div>
    </div>
    <el-slider
      v-model="timeLineValue"
      :show-tooltip="false"
      :max="dataList.length"
      :marks="marks"
      @change="timeLineHandleChange"
    />
    <div class="flex justify-center items-center ml-2">
      <div class="prev-btn" title="上一帧">
        <el-button type="info" text style="font-size: 26px" @click="prevFrame"
          >⏮</el-button
        >
      </div>
      <div class="next-btn" title="下一帧">
        <el-button type="info" text style="font-size: 26px" @click="nextFrame"
          >⏭</el-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from "vue";
import * as Cesium from "cesium";
import bus from "@/utils/bus";
import map from "@/libs/tdtmap";
import dayjs from "dayjs";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
// import { loadTestTifToCesium } from "@/utils/testAddOriginalLayer";
import { addOriginalLayer } from "@/utils/addOriginalLayer";
import { wgs84ToGcj20 } from "@/api/dataSource/panel/loal";
import { message } from "@/utils/message";

const dataList = ref([]);
const selectDataList = ref([]);
const selectValue = ref("全部");
const layerName = ref("");
const isShow = ref(false);
const isPlay = ref(false);
const rowsData = ref([]);

bus.on("getTimeSequenceDataList", rows => {
  // isShow.value = false;
  selectValue.value = "全部";
  getDataList(rows);
});

const handleOption = item => {
  console.log(item);
  if (item.level === "全部") {
    dataList.value = item.data;
    getMarks();
    timeLineValue.value = 0;
    timeLineHandleChange(0);
    return;
  }

  //按照productTime日期分类
  const data = item.data.reduce((acc, obj) => {
    const key = obj["productTime"];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  dataList.value = Object.keys(data).map(key => {
    return {
      productTime: key,
      data: data[key]
    };
  });
  //按照productTime日期排序
  dataList.value.sort((a, b) => {
    return (
      new Date(a.productTime).getTime() - new Date(b.productTime).getTime()
    );
  });
  console.log(dataList.value);
  getMarks();
  timeLineValue.value = 0;
  timeLineHandleChange(0);
};

const getDataList = rows => {
  console.log(rows);
  rowsData.value = rows;
  //按照productTime日期分类
  const data = rows.reduce((acc, obj) => {
    const key = obj["productTime"];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  const selectDataListData = rows.reduce((acc, obj) => {
    const key = obj["satelliteLevel"];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  //将selectDataListData转换为数组
  selectDataList.value = Object.keys(selectDataListData).map(key => {
    return {
      level: key,
      data: selectDataListData[key]
    };
  });

  // //将data转换为数组
  dataList.value = Object.keys(data).map(key => {
    return {
      productTime: key,
      data: data[key]
    };
  });
  //按照productTime日期排序
  dataList.value.sort((a, b) => {
    return (
      new Date(a.productTime).getTime() - new Date(b.productTime).getTime()
    );
  });
  console.log(dataList.value);

  if (dataList.value.length) {
    selectDataList.value.unshift({ level: "全部", data: dataList.value });
  }
  getMarks();
};

const timeLineValue = ref(0);
const marks = ref({});
const currentData = ref();
const currentDataIndex = ref(0);

const getMarks = () => {
  marks.value = {};
  dataList.value.forEach((item, index) => {
    marks.value[index] = dayjs(item.productTime).format("YYYY-MM-DD");
  });
  console.log(marks.value);
};

const timeLineHandleChange = async val => {
  console.log("val", val);
  console.log("1dataList", dataList.value);

  console.log("change", dataList.value[val]);
  map.removeLocalImageLayers();
  currentDataIndex.value = 0;
  if (!dataList.value[val]?.data?.length) return;
  const res = await getThumbJpg(dataList.value[val].data[0].id);
  const url = await imgStreamToBase64(res.data);
  addOriginalLayer(dataList.value[val].data[0], url, "timeSequence");
  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(dataList.value[val].data[0].lngMin),
    lat: Number(dataList.value[val].data[0].latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(dataList.value[val].data[0].lngMax),
    lat: Number(dataList.value[val].data[0].latMax)
  });

  map.getViewer().camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(gcj20Min.data.lng),
      Number(gcj20Min.data.lat),
      Number(gcj20Max.data.lng),
      Number(gcj20Max.data.lat)
    ),
    duration: 1
  });
};

const prevFrame = async () => {
  if (currentDataIndex.value > 0) {
    map.removeLocalImageLayers();
    currentDataIndex.value--;
    currentData.value =
      dataList.value[timeLineValue.value].data[currentDataIndex.value];
    const res = await getThumbJpg(currentData.value.id);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(currentData.value, url, "timeSequence");
    const gcj20Min: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMin),
      lat: Number(currentData.value.latMin)
    });
    const gcj20Max: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMax),
      lat: Number(currentData.value.latMax)
    });

    map.getViewer().camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      ),
      duration: 1
    });
  } else if (currentDataIndex.value === 0) {
    if (timeLineValue.value === 0) {
      message("已到第一帧", { type: "info" });
      return;
    }
    map.removeLocalImageLayers();
    timeLineValue.value =
      (timeLineValue.value - 1 + dataList.value.length) % dataList.value.length;
    currentDataIndex.value =
      dataList.value[timeLineValue.value].data.length - 1;
    currentData.value =
      dataList.value[timeLineValue.value].data[currentDataIndex.value];
    const res = await getThumbJpg(currentData.value.id);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(currentData.value, url, "timeSequence");
    const gcj20Min: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMin),
      lat: Number(currentData.value.latMin)
    });
    const gcj20Max: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMax),
      lat: Number(currentData.value.latMax)
    });

    map.getViewer().camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      ),
      duration: 1
    });
  }
};

const nextFrame = async () => {
  if (!dataList.value[timeLineValue.value]?.data?.length) return;
  if (
    currentDataIndex.value <
    dataList.value[timeLineValue.value].data.length - 1
  ) {
    map.removeLocalImageLayers();
    currentDataIndex.value++;
    currentData.value =
      dataList.value[timeLineValue.value].data[currentDataIndex.value];
    const res = await getThumbJpg(currentData.value.id);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(currentData.value, url, "timeSequence");
    const gcj20Min: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMin),
      lat: Number(currentData.value.latMin)
    });
    const gcj20Max: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMax),
      lat: Number(currentData.value.latMax)
    });

    map.getViewer().camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      ),
      duration: 1
    });
  } else if (
    currentDataIndex.value ===
    dataList.value[timeLineValue.value].data.length - 1
  ) {
    if ((timeLineValue.value + 1) % dataList.value.length === 0) {
      message("已到最后一帧", { type: "info" });
      return;
    }
    currentDataIndex.value = 0;
    map.removeLocalImageLayers();
    timeLineValue.value = (timeLineValue.value + 1) % dataList.value.length;
    currentData.value =
      dataList.value[timeLineValue.value].data[currentDataIndex.value];
    const res = await getThumbJpg(currentData.value.id);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(currentData.value, url, "timeSequence");
    const gcj20Min: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMin),
      lat: Number(currentData.value.latMin)
    });
    const gcj20Max: any = await wgs84ToGcj20({
      lng: Number(currentData.value.lngMax),
      lat: Number(currentData.value.latMax)
    });

    map.getViewer().camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      ),
      duration: 1
    });
  }
};

onUnmounted(() => {
  bus.off("showTimeSequence");
});

onMounted(() => {
  bus.on("showTimeSequence", (val?: any) => {
    if (!selectDataList.value.length) {
      isShow.value = false;
      if (val.text) return;
      message("没有可供时序播放的图层", { type: "warning" });
      return;
    }
    isShow.value = !isShow.value;

    //关闭后按循序重新加载
    if (!isShow.value) {
      // bus.emit("bottomLogos", false);
      map.removeLocalImageLayers();
      // map.removeWindLayer();
      rowsData.value.forEach(async item => {
        const res = await getThumbJpg(item.id);
        const url = await imgStreamToBase64(res.data);
        addOriginalLayer(item, url, "timeSequence");
        const gcj20Min: any = await wgs84ToGcj20({
          lng: Number(item.lngMin),
          lat: Number(item.latMin)
        });
        const gcj20Max: any = await wgs84ToGcj20({
          lng: Number(item.lngMax),
          lat: Number(item.latMax)
        });
        map.getViewer().camera.flyTo({
          duration: 1,
          destination: Cesium.Cartesian3.fromDegrees(
            Number(gcj20Min.data.lng),
            Number(gcj20Max.data.lat),
            1000000
          )
        });
      });
    }

    if (isShow.value) {
      timeLineValue.value = 0;
      timeLineHandleChange(0);
      // bus.emit("bottomLogos", true);
    }
  });
});
</script>

<style lang="scss" scoped>
.timeline-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  width: calc(50% - 40px);
  // margin: 0 20px;
  // padding: 25px 50px;
  padding: 25px 45px;
  padding-right: 10px;
  font-family: Arial, sans-serif;
  color: #8b8b8b;
  background-color: rgb(255 255 255);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 30%);
  transform: translateX(-50%);
}

:deep(.el-slider__button) {
  position: relative;
  top: -15px;
  background-image: url("/images/map_label/map_label_2.png");
  background-position: center;
  background-size: cover;
  border: none;
  // width: 6px;
  // height: 10px;
  // background-color: #1aa55a;
  border-radius: 0%;
  // box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition:
    background-color 0.3s ease,
    transform 0.3s ease;

  //小三角
  // &::after {
  //   content: "";
  //   position: relative;
  //   top: 17px;
  //   // left: 50%;
  //   // transform: translate(-50%, -50%);
  //   width: 0;
  //   height: 0;
  //   border-left: 3px solid transparent;
  //   border-right: 3px solid transparent;
  //   border-top: 8px solid #1aa55a;
  // }
}

:deep(.el-slider__runway) {
  height: 4px;
  background-color: #b5b7b8;
  // border-radius: 2px;
}

:deep(.el-slider__stop) {
  position: absolute;
  top: 2px;
  width: 2px;
  height: 15px;
  background-color: #b5b7b8;
  border-radius: 10px;
  // &:hover {
  //   background-color: #1aa55a;
  //   cursor: pointer;
  //   transform: scale(1.2);
  // }
}

:deep(.el-slider__bar) {
  height: 5px;
  background-color: #1296db;
}

.iconfont {
  font-size: 18px;
  color: #545353;
  cursor: pointer;
}

.time-sequence {
  position: absolute;
  bottom: 20px;
  // overflow: hidden;
  left: 50%;
  z-index: 999;
  box-sizing: border-box;
  width: 35vw;
  height: 100px;
  border-radius: 10px;
  transform: translateX(-50%);

  .timeline {
    display: flex;
    justify-content: center;
    width: 30vw;
    height: 5px;
    margin: 45px auto;
    // background-color: aqua;
    margin-top: 40px;
    border-top: 5px solid #6aa5f7;
    // border-image: linear-gradient(115deg, #c4a731, #079d9d, #44ce7b) 2 2;
    border-radius: 5px;

    .lineitem {
      width: 100px;
      text-wrap: nowrap;
      transform: translateX(50%);
    }
  }

  :deep(.el-timeline-item__tail) {
    position: absolute;
    top: 6px;
    // border-top: 2px solid #447ced;
    width: 100%;
    border-left: none;
  }

  :deep(.el-timeline-item__wrapper) {
    position: absolute;
    top: 8px;
    padding-left: 0;
    text-align: center;
    transform: translateX(-50%);
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: 14px;
  }

  :deep(.el-timeline-item__node--normal) {
    position: relative;
    bottom: 8px;
    cursor: pointer;

    &::after {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 22px;
      height: 22px;
      content: "";
      // background-color: rgb(255, 255, 255, 0);
      border: 1px solid rgb(104 190 244 / 90%);
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    &:hover::after {
      background-color: rgb(104 190 244 / 50%);
      box-shadow: 0 0 8px rgb(104 190 244 / 90%);
      transition: all 0.2s ease-in-out;
    }
  }
}
</style>
