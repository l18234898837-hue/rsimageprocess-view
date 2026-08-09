<template>
  <el-dialog v-model="detailShow" title="详细信息" width="900">
    <div class="mod-con">
      <div class="col-map">
        <div class="item">
          <div class="title">位置</div>
          <div class="con map">
            <MapDetail ref="mapDetailRef" />
          </div>
        </div>
        <div class="item">
          <div class="title">缩略图</div>
          <div class="con img">
            <el-image :src="data.item.thumbUrl" fit="cover">
              <template #error>
                <div class="image-slot">
                  <el-icon>
                    <icon-picture />
                  </el-icon>
                </div>
              </template>
            </el-image>
          </div>
        </div>
      </div>
      <div class="col-table" style="height: 520px; overflow-y: auto">
        <el-table :data="tableData" border style="width: 100%">
          <el-table-column prop="label" label="属性" width="220" />
          <el-table-column prop="value" label="属性值" />
        </el-table>
      </div>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { nextTick, ref } from "vue";
import { transformCoordinates } from "@/api/dataSource/legend";
import MapDetail from "./MapDetail.vue";
import bus from "@/utils/bus";
import { Picture as IconPicture } from "@element-plus/icons-vue";

const detailShow = ref(false);

interface Data {
  type: String;
  item: any;
  name: String | null;
}

bus.on("showDataDetail", (val: boolean) => {
  detailShow.value = val;
});

const data = ref<Data>();
const tableData = ref([]);
const mapDetailRef = ref();
const showDetail = async (d: Data) => {
  detailShow.value = true;
  // return
  data.value = d;
  if (d.type == "0") {
    tableData.value = [];
    //在线数据
    const properties = d.item.properties;
    for (const key in properties) {
      if (properties[key] instanceof Object) {
        tableData.value.push({
          label: key,
          value: JSON.stringify(properties[key])
        });
      } else {
        tableData.value.push({
          label: key,
          value: properties[key]
        });
      }
    }
    const res = await transformCoordinates({
      coordinates: properties["proj:geometry"]["coordinates"][0][0],
      epsg: properties["proj:epsg"]
    });
    mapDetailRef.value.showCoordinates(res.data);
  } else {
    tableData.value = [];
    //离线数据
    const metaJson = JSON.parse(d.item.metaData);
    for (const key in metaJson) {
      if (metaJson[key] instanceof Object) {
        tableData.value.push({
          label: key,
          value: JSON.stringify(metaJson[key])
        });
      } else {
        tableData.value.push({
          label: key,
          value: metaJson[key]
        });
      }
    }
    await nextTick();
    mapDetailRef.value.showCoordinates([
      [metaJson.lngMin, metaJson.latMin],
      [metaJson.lngMin, metaJson.latMax],
      [metaJson.lngMax, metaJson.latMax],
      [metaJson.lngMax, metaJson.latMin]
    ]);
  }
};

defineExpose({ showDetail });
</script>
<style lang="scss" scoped>
.mod-con {
  display: flex;

  .col-map {
    width: 220px;

    .item {
      &:first-child {
        margin-bottom: 25px;
      }

      .title {
        padding: 0 0 12px;
        font-size: 16px;
        color: var(--color-gray-txt2);
        text-align: center;
      }

      .con {
        width: 220px;
        height: 220px;
        overflow: hidden;
        text-align: center;
        background: var(--color-bg2);
        border-radius: 4px;

        img {
          width: 100%;
        }

        &.map {
          position: relative;
          border: 1px solid var(--color-bg2);

          .map-btn {
            position: absolute;
            right: 10px;
            bottom: 10px;
            z-index: 2;
            width: 30px;
            line-height: 30px;
            background: var(--color-white);
            border-radius: 2px;
            box-shadow: 0 1px 8px 0 rgb(0 0 0 / 43%);

            .btn {
              position: relative;
              font-size: 20px;
              color: var(--color-gray-txt);
              cursor: pointer;

              &:hover {
                background: var(--color-bg);
              }

              &:first-child::after {
                position: absolute;
                top: 30px;
                left: 6px;
                width: 18px;
                height: 1px;
                content: "";
                background: var(--color-bg2);
              }
            }
          }
        }

        &.img {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          background-color: rgb(223 220 220);
        }
      }
    }
  }

  .col-table {
    flex: 1;
    padding-left: 20px;

    :deep(.el-table) {
      thead {
        font-size: 16px;
        color: var(--color-gray-txt2);

        tr th {
          background-color: var(--color-primary-bg);
        }
      }

      tbody tr:hover td {
        background-color: var(--color-primary-bg);
      }

      .cell {
        padding-left: 30px;
        color: var(--color-gray-txt4);
      }
    }
  }
}
</style>
