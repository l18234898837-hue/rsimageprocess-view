<template>
  <div v-if="isShow" class="w-full" style="background: rgb(4 44 103 / 80%)">
    <div
      class="flex justify-between w-full px-[15px] py-[5px]"
      style="
        background-image: linear-gradient(
          to right,
          #0080ff,
          rgb(255 255 255 / 0%)
        );
      "
    >
      <div>观测数据</div>
      <!-- <div class="">
        <el-button type="primary" size="small">返回</el-button>
      </div> -->
    </div>
    <div class="w-full px-[15px]">
      <pure-table
        align-whole="center"
        :columns="columns"
        :data="dataList"
        size="small"
        :border="false"
        row-key="id"
        :cell-style="{
          backgroundColor: 'rgba(4, 44, 103, 0)',
          borderTop: '2px solid rgba(4, 44, 103, 0.9)',
          borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
          color: '#fff'
        }"
        :header-cell-style="{
          backgroundColor: 'rgba(4, 44, 103, 0)',
          borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
          color: '#fff'
        }"
        @expand-change="expandChange"
        ><template #operation="{ row }">
          <el-button
            class="reset-margin"
            link
            type="primary"
            @click="download(row)"
          >
            下载
          </el-button>
        </template>
        <template #expand>
          <div :class="['box-border p-[10px] min-h-[400px]', 'w-full']">
            <div class="flex flex-wrap justify-between w-full">
              <div class="flex items-center w-full">
                <div
                  :class="[
                    'border-[2px] border-[#0080FF]',
                    'rounded h-[60%] mr-[5px]'
                  ]"
                />
                <div :class="['text-[13px] mr-[10px]']">化学参数</div>
              </div>
              <div class="w-full">
                <pure-table
                  align-whole="center"
                  :columns="[
                    {
                      label: '溶解氧(MG/L)',
                      prop: 'name',
                      align: 'left'
                    },
                    {
                      label: 'PH值',
                      prop: 'parson',
                      align: 'left'
                    },
                    {
                      label: '总氮(MG/L)',
                      prop: 'time',
                      align: 'left'
                    }
                  ]"
                  :data="[
                    {
                      index: 1,
                      name: '8.00',
                      parson: '7.5',
                      time: '0.5'
                    }
                  ]"
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
            <div class="flex flex-wrap justify-between w-full">
              <div class="flex items-center w-full">
                <div
                  :class="[
                    'border-[2px] border-[#0080FF]',
                    'rounded h-[60%] mr-[5px]'
                  ]"
                />
                <div :class="['text-[13px] mr-[10px]']">物理参数</div>
              </div>
              <div class="w-full">
                <pure-table
                  align-whole="center"
                  :columns="[
                    {
                      label: '水温(℃)',
                      prop: 'name',
                      align: 'left'
                    },
                    {
                      label: '电导率(MS/cm)',
                      prop: 'parson',
                      align: 'left'
                    },
                    {
                      label: '透明度(CM)',
                      prop: 'time',
                      align: 'left'
                    }
                  ]"
                  :data="[
                    {
                      index: 1,
                      name: '28.00',
                      parson: '76.5',
                      time: '0.5'
                    }
                  ]"
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
            <div class="flex flex-wrap justify-between w-full">
              <div class="flex items-center w-full">
                <div
                  :class="[
                    'border-[2px] border-[#0080FF]',
                    'rounded h-[60%] mr-[5px]'
                  ]"
                />
                <div :class="['text-[13px] mr-[10px]']">生物参数</div>
              </div>
              <div class="w-full">
                <pure-table
                  align-whole="center"
                  :columns="[
                    {
                      label: '浮游生物(个/L)',
                      prop: 'name',
                      align: 'left'
                    },
                    {
                      label: '藻类密度(细胞数/L)',
                      prop: 'time',
                      align: 'left'
                    }
                  ]"
                  :data="[
                    {
                      index: 1,
                      name: '28.00',
                      parson: '76.5',
                      time: '102'
                    }
                  ]"
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
            <div class="flex flex-wrap justify-between w-full">
              <div class="flex items-center w-full">
                <div
                  :class="[
                    'border-[2px] border-[#0080FF]',
                    'rounded h-[60%] mr-[5px]'
                  ]"
                />
                <div :class="['text-[13px] mr-[10px]']">观测图像</div>
              </div>
              <div class="w-full">
                <el-carousel trigger="click" height="150px">
                  <el-carousel-item v-for="item in 3" :key="item">
                    <div
                      class="w-full flex justify-center box-border p-[15px] overflow-hidden rounded-md"
                    >
                      <el-image
                        style="width: 100%"
                        fit="contain"
                        :src="imgCarousel"
                      />
                    </div>
                  </el-carousel-item>
                </el-carousel>
              </div>
            </div>
          </div>
        </template>
      </pure-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import {} from // getStInstrumentAndInfoVoyages,
// getstVoyageJoinInstrumentsPage,
// fileDownload,
// fileDetail
"@/api/dataSource/instrument";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";

import waterImg from "/images/map_label/map_label_2.png";
import imgCarousel from "/images/img2@1x.png";

const router = useRouter();

const expandAction = ref([]);
const isShow = ref(false);
const dataList = ref([
  {
    id: 1,
    updateTime: "2024-06-20 12:00:00",
    updateBy: "张三",
    datasetId: "123"
  }
]);

const columns: TableColumnList = [
  {
    type: "expand",
    align: "left",
    slot: "expand"
  },
  {
    label: "观测时间",
    prop: "updateTime",
    width: "200px",
    align: "left"
  },
  {
    label: "操作人员",
    prop: "updateBy",
    // width: "120px",
    align: "left"
  },
  {
    label: "操作",
    prop: "time",
    // width: "100px",
    slot: "operation"
  }
];

// const dataList = [
//   {
//     index: 1,
//     time: "2024-06-20 12:00:00",
//     parson: "张三"
//   },
//   {
//     index: 2,
//     time: "2024-06-20 12:00:00",
//     parson: "李四"
//   }
// ];

const expandChange = async data => {
  // expandAction.value = [data.index];
};

const getInstrumentInfo = async () => {
  await nextTick();
  // const voyage: string = router.currentRoute.value.query.voyageId as string;
  // isShow.value = true;
  // const res = await getStInstrumentAndInfoVoyages({
  //   voyage
  // });
  // res.data.forEach(item => {
  //   addMapMarker(item);
  // });
};

const addMapMarker = async (data: any) => {
  await nextTick();
  if (!router.currentRoute.value.query.voyageId) return;
  const viewer = map.getViewer();
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      Number(data.longitude),
      Number(data.latitude)
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
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement: any) {
    const pick = viewer.scene.pick(movement.position);
    if (Cesium.defined(pick) && pick.id === entity) {
      console.log("data", data);
      router.push(`/index?instrumentId=${data.id}`);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

const download = async (row: any) => {
  // const res = await fileDownload(row.datasetId);
  // const url = window.URL.createObjectURL(new Blob([res.data]));
  // const link = document.createElement("a");
  // link.href = url;
  // link.setAttribute("download", "观测数据.json");
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // window.URL.revokeObjectURL(url);
};

const getstVoyage = async () => {
  // const res = await getstVoyageJoinInstrumentsPage({
  //   pageNum: 1
  // });
  // if (res.data) {
  //   dataList.value = res.data.rows;
  // }
};

onMounted(() => {
  if (!router.currentRoute.value.query.voyageId) return;
  getstVoyage();
  getInstrumentInfo();
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

:deep(.el-table__expand-icon) {
  color: #fff;
}

:deep(.el-table tr) {
  color: #fff;
  background-color: rgb(36 89 168 / 60%);
}

:deep(.el-table--enable-row-transition .el-table__body td.el-table__cell) {
  background-color: rgb(4 44 103 / 90%);
  border: none;
}

:deep(.bg-bg_color) {
  background-color: rgb(4 44 103 / 0%);
}
</style>
