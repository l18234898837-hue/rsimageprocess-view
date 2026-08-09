<template>
  <div v-if="isShow" class="w-full" style="background: rgb(4 44 103 / 80%)">
    <div
      class="flex justify-between items-center w-full px-[15px] py-[5px]"
      style="
        background-image: linear-gradient(
          to right,
          #0080ff,
          rgb(255 255 255 / 0%)
        );
      "
    >
      <div>仪器信息</div>
      <div
        class="cursor-pointer leading-[50%] text-[20px] hover:text-[#008cff] transition-all ease-in-out duration-300"
        @click="isShow = false"
      >
        <el-icon><CircleClose /></el-icon>
      </div>
    </div>
    <div :class="['flex flex-wrap justify-between w-full p-[15px] pb-0']">
      <div class="flex items-center w-[50%] py-[7px]">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">仪器名称</div>
        <div :class="['text-[13px]']">{{ instrumentInfo.instrumentName }}</div>
      </div>
      <div class="flex items-center w-[50%] py-[7px]">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">仪器型号</div>
        <div :class="['text-[13px]']">{{ instrumentInfo.instrumentCode }}</div>
      </div>
      <div class="flex items-center w-[50%] py-[7px]">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">启用日期</div>
        <div :class="['text-[13px]']">{{ instrumentInfo.commissionDate }}</div>
      </div>
      <div class="flex items-center w-[50%] py-[7px]">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">仪器状态</div>
        <div :class="['text-[13px] text-[#00ff80]']">{{ "运行中" }}</div>
      </div>
      <div class="flex items-center py-[7px]">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">布点位置</div>
        <div :class="['text-[13px] mr-[10px]']">
          {{ instrumentInfo.longitude }}
        </div>
        <div :class="['text-[13px]']">{{ instrumentInfo.latitude }}</div>
      </div>
    </div>
    <div class="flex flex-wrap justify-between w-full px-[15px] py-[7px]">
      <div class="flex items-center w-full">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">详情参数</div>
      </div>
      <div class="w-full">
        <pure-table
          align-whole="center"
          :columns="columns"
          :data="dataList"
          size="small"
          :border="false"
          row-key="index"
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
        />
      </div>
    </div>
    <div class="flex flex-wrap justify-between w-full px-[15px]">
      <div class="flex items-center w-full">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">支撑观测航次</div>
      </div>
      <div
        class="w-full border border-dashed border-[#0080FF] my-[15px] box-border py-[5px]"
      >
        <div
          v-for="item in 1"
          :key="item"
          class="flex items-center box-border px-[7px] py-1 text-[13px]"
        >
          <div class="border-[2px] border-[#0080FF] mr-[5px]" />
          <div>测试航次</div>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap justify-between w-full px-[15px]">
      <div class="flex items-center w-full">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">仪器图像</div>
      </div>
      <div class="w-full my-[15px] box-border py-[5px]">
        <div class="w-full">
          <el-image fit="contain" :src="imgCarousel" />
        </div>
      </div>
    </div>
    <div class="flex flex-wrap justify-between w-full px-[15px] py-[7px]">
      <div class="flex items-center w-full">
        <div
          :class="['border-[2px] border-[#0080FF]', 'rounded h-[60%] mr-[5px]']"
        />
        <div :class="['text-[13px] mr-[10px]']">实测数据</div>
      </div>
      <div class="w-full">
        <pure-table
          align-whole="center"
          :columns="voyageColumns"
          :data="voyageList"
          size="small"
          :border="false"
          row-key="index"
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
        >
          <template #operation>
            <el-button type="primary" link @click="handleClick"
              >查看数据集</el-button
            >
          </template>
        </pure-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from "vue";
import { CircleClose } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import {} from // getstVoyageJoinInstrumentsPage,
// getStInstrumentInfoById
"@/api/dataSource/instrument";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";

import waterImg from "/images/map_label/map_label_2.png";
import imgCarousel from "/images/img2@1x.png";

const router = useRouter();
const isShow = ref(false);

const columns: TableColumnList = [
  {
    label: "参数",
    prop: "index",
    width: "60px"
  },
  {
    label: "范围",
    prop: "time",
    width: "150px",
    align: "left"
  }
];
const voyageColumns: TableColumnList = [
  {
    label: "序号",
    prop: "index",
    width: "60px"
  },
  {
    label: "关联数据集",
    prop: "time",
    width: "100px",
    align: "left"
  },
  {
    label: "观测次数",
    prop: "dept",
    width: "100px",
    align: "left"
  },
  {
    label: "操作",
    slot: "operation",
    width: "70px",
    align: "center"
  }
];

const dataList = ref([
  {
    index: "水量",
    time: "范围0~50℃,精度±0.1℃",
    dept: "大气校正"
  },
  {
    index: "PH值",
    time: "范围0~20MG/L,精度±0.01MG",
    dept: "大气校正"
  }
]);
const voyageList = ref([
  {
    index: "1",
    time: "水质观测数据集",
    dept: "10"
  }
]);

const handleClick = () => {
  router.push("/index?voyageId=1939516851919888385");
  // window.location.reload();
};

const getstVoyage = async () => {
  // const res = await getstVoyageJoinInstrumentsPage({
  //   pageNum: 1
  // });
  // if (res.data) {
  //   dataList.value = res.data.rows;
  // }
};

const instrumentInfo = ref<any>({});

const getInstrumentInfo = async () => {
  // if (!router.currentRoute.value.query.instrumentId) return;
  // const id: string = router.currentRoute.value.query.instrumentId as string;
  // const res = await getStInstrumentInfoById(id);
  // instrumentInfo.value = res.data;
  // isShow.value = true;
};

const addMapMarker = async () => {
  await nextTick();
  if (!instrumentInfo.value.longitude || !instrumentInfo.value.latitude) return;
  const viewer = map.getViewer();
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      Number(instrumentInfo.value.longitude),
      Number(instrumentInfo.value.latitude)
    ),
    billboard: {
      image: waterImg,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      scale: 0.2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, 0)
    }
  });
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      Number(instrumentInfo.value.longitude),
      Number(instrumentInfo.value.latitude),
      1000000
    )
  });
  const viewerContainer: any = viewer.container;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement: any) {
    const pick = viewer.scene.pick(movement.position);
    if (Cesium.defined(pick) && pick.id === entity) {
      isShow.value = !isShow.value;
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  handler.setInputAction(function (movement: any) {
    const pick = viewer.scene.pick(movement.endPosition);
    if (Cesium.defined(pick) && pick.id === entity) {
      viewerContainer.style.cursor = "pointer";
      console.log("移动了实体: ", entity.id);
      isShow.value = true;
    } else {
      viewerContainer.style.cursor = "default";
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
};

onMounted(async () => {
  await getInstrumentInfo();
  await addMapMarker();
  // getstVoyage()
});
</script>

<style lang="scss" scoped>
:deep(.el-table) {
  padding: 10px 0;
  background: rgb(4 44 103 / 0%);
  // margin-bottom: 20px;
}

:deep(.el-table__body) {
  width: 100% !important;
}

:deep(.el-table__header) {
  width: 100% !important;
}

@media screen and (width <= 1670px) {
  :deep(.el-table__body) {
    width: auto !important;
  }

  :deep(.el-table__header) {
    width: auto !important;
  }
}

:deep(.el-table__inner-wrapper)::before {
  display: none;
}

:deep(.el-tabs__content) {
  padding-top: 60px;
}
</style>
