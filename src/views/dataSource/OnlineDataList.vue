<template>
  <div v-if="showList" class="search-list">
    <div v-if="dataList.length > 0" class="list-wrap">
      <ul class="list" :infinite-scroll-disabled="disabled">
        <li
          v-for="(item, i) in dataList"
          :key="i"
          class="list-item"
          @mouseover="itemSelected(item)"
          @mouseout="itemUnSelected(item)"
        >
          <div class="checked">
            <el-checkbox v-model="item.checked" @change="singleCheckChange" />
          </div>
          <div class="img">
            <el-image :src="getImage(item)">
              <template #error>
                <div class="image-slot">
                  <el-icon>
                    <icon-picture />
                  </el-icon>
                </div>
              </template>
            </el-image>
          </div>
          <div class="title">
            <el-tooltip
              class="box-item"
              effect="dark"
              :content="item.id"
              placement="top-start"
            >
              <div class="txt">{{ item.id }}</div>
            </el-tooltip>
            <div class="detail">
              <div class="date detail-item">
                <i class="iconfont icon-riqi" />{{
                  getDate(item.properties.datetime)
                }}
              </div>
              <div class="time detail-item">
                <i class="iconfont icon-shijian" />{{
                  getTime(item.properties.datetime)
                }}
              </div>
              <div
                v-if="item.properties.hasOwnProperty('eo:cloud_cover')"
                class="cloud detail-item"
              >
                <i class="iconfont icon-cloud" />{{
                  item.properties["eo:cloud_cover"]
                }}%
              </div>
            </div>
          </div>
          <div class="icon-detail">
            <i class="iconfont icon-choose" @click="showDetail(item)" />
            <i class="iconfont icon-fly" @click="flyToEntity(item)" />
          </div>
        </li>
      </ul>
      <div v-if="!noMore" class="load-btn-wrap">
        <el-button
          type="warning"
          style="width: 100%"
          :loading="loading"
          @click="doSearch"
          >加载更多</el-button
        >
      </div>
    </div>
    <span v-if="dataList.length <= 0" class="no-data">暂无数据</span>
  </div>
  <div v-if="dataList.length > 0" class="panel-btn">
    <div class="checkAll">
      <el-checkbox v-model="allChecked" @change="allCheckChange"
        >全选
      </el-checkbox>
      选中<span class="num">{{ checkedDataList.length }}</span
      >条
    </div>
    <div class="btn">
      <el-button type="primary" @click="loadData">载入数据</el-button>
    </div>
  </div>
  <div class="mod-detail mod-dialog">
    <DataDetail ref="dataDetailRef" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import bus from "@/utils/bus";
import { EVENT_TYPE } from "@/components/LayerList/layers";
import { getSentinelSearch } from "@/api/dataSource/legend";
import map from "@/libs/tdtmap";
import { Picture as IconPicture } from "@element-plus/icons-vue";
import DataDetail from "./DataDetail.vue";

const detail = ref(false); // 详情

const searchForm = ref();
type OnlineDataItem = {
  id: string;
  checked?: boolean;
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
  };
  assets: {
    thumbnail?: { href: string };
    data?: { href: string };
  };
};

const dataList = ref<OnlineDataItem[]>([]);
const checkedDataList = ref<OnlineDataItem[]>([]);
const allChecked = ref<boolean>(false);
const loading = ref(false);
const noMore = ref(false);
const disabled = computed(() => loading.value || noMore.value);
const showList = ref(false);
const props = defineProps({
  data: {
    type: Object
  }
});
const startSearch = async form => {
  showList.value = false;
  searchForm.value = form;
  dataList.value = [];
  checkedDataList.value = [];
  searchForm.value.next = 0;
  await doSearch();
  showList.value = true;
};

type OnlineMapEntity = { _id: string; show: boolean };
let entities: OnlineMapEntity[] = [];
const doSearch = async () => {
  loading.value = true;
  searchForm.value.limit = 50;
  const res = await getSentinelSearch(searchForm.value);
  //将方框添加到地图上
  entities = (await map.loadGeoJSON(res.data)) as OnlineMapEntity[];
  const features = res.data.features as OnlineDataItem[];
  features.forEach(row => (row.checked = false));
  dataList.value = dataList.value.concat(features);
  searchForm.value.next = dataList.value.length;
  if (features.length < 50) {
    noMore.value = true;
  }
  res.data.features = dataList.value;
  loading.value = false;
};

const allCheckChange = val => {
  dataList.value.forEach(d => (d.checked = val));
  singleCheckChange();
};

const singleCheckChange = () => {
  checkedDataList.value = [];
  let num = 0;
  dataList.value.forEach(d => {
    if (d.checked) {
      checkedDataList.value.push(d);
      num++;
    }
  });
  const selIds = checkedDataList.value.map(d => d.id);
  entities.forEach(entity => {
    entity.show = selIds.indexOf(entity._id) > -1;
  });
  allChecked.value = num === dataList.value.length;
};

const getImage = item => {
  const name = props.data.name;
  if (name === "Sentinel-1 GRD") {
    return item.assets.thumbnail.href;
  } else if (name === "Sentinel-2 - L1C" || name === "Sentinel-2 - L2A") {
    return `https://roda.sentinel-hub.com/${item.assets.data.href.substring(
      5
    )}preview.jpg`;
  } else if (name === "Landsat 8-9 OLI-TIRS L1") {
    return `https://landsatlook.usgs.gov/gen-browse?size=thumb&type=refl&product_id=${item.id}`;
  }
};
const getDate = str => {
  return str.split("T")[0];
};

const getTime = str => {
  return str.split("T")[1].split(".")[0];
};
/**
 * 载入数据
 */
const loadData = () => {
  console.log(checkedDataList.value);
  checkedDataList.value.forEach(data => {
    bus.emit(EVENT_TYPE.addOnlineLayer, { data, collection: props.data });
  });
};

const itemSelected = item => {
  map.entitySelected(item);
};

const itemUnSelected = item => {
  map.entityUnSelected(item);
};

const flyToEntity = item => {
  console.log(item);
  map.flyToEntity(item);
};
const dataDetailRef = ref();
const showDetail = async item => {
  dataDetailRef.value.showDetail({
    type: "0",
    name: props.data.name,
    item: item
  });
};
defineExpose({ startSearch });
</script>

<style lang="less" scoped>
.mod-detail {
  .mod-con {
    display: flex;

    .col-map {
      width: 220px;

      .item {
        &:first-child {
          margin-bottom: 25px;
        }

        .title {
          padding: 0 0 12px 0;
          text-align: center;
          font-size: 16px;
          color: var(--color-gray-txt2);
        }

        .con {
          width: 220px;
          height: 220px;
          text-align: center;
          overflow: hidden;
          background: var(--color-bg2);
          border-radius: 4px;

          img {
            width: 100%;
          }

          &.map {
            position: relative;
            border: 1px solid var(--color-bg2);

            .map-btn {
              z-index: 2;
              position: absolute;
              bottom: 10px;
              right: 10px;
              width: 30px;
              line-height: 30px;
              background: var(--color-white);
              border-radius: 2px;
              box-shadow: 0 1px 8px 0 rgba(0, 0, 0, 0.43);

              .btn {
                position: relative;
                font-size: 20px;
                color: var(--color-gray-txt);
                cursor: pointer;

                &:hover {
                  background: var(--color-bg);
                }

                &:first-child:after {
                  content: "";
                  position: absolute;
                  top: 30px;
                  left: 6px;
                  width: 18px;
                  height: 1px;
                  background: var(--color-bg2);
                }
              }
            }
          }

          &.img {
            padding: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      }
    }

    .col-table {
      padding-left: 20px;
      flex: 1;

      :deep(.el-table) {
        thead {
          color: var(--color-gray-txt2);
          font-size: 16px;

          tr th {
            background-color: var(--color-primary-bg);
          }
        }

        tbody tr:hover td {
          background-color: var(--color-primary-bg);
        }

        .cell {
          color: var(--color-gray-txt4);
          padding-left: 30px;
        }
      }
    }
  }
}

.search-list {
  padding: 15px 0 50px 0;
  width: 100%;
  height: auto;
  .no-data {
    text-align: center;
    display: block;
    padding: 10px 0;
  }
  ul {
    padding: 0;
    margin: 0;

    .no-data {
      text-align: center;
      display: block;
      padding: 10px 0;
    }

    .list-item {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 12px 15px;
      border-bottom: 1px solid var(--color-bg2);

      &:first-child {
        border-top: 1px solid var(--color-border);
      }

      &:hover,
      &.active {
        background: var(--color-primary-bg);
      }

      .checked {
        width: 14px;
      }

      .img {
        width: 80px;
        height: 80px;
        margin: 0 12px;
        text-align: center;
        background: var(--color-bg2);
        border-radius: 2px;

        .el-image {
          width: 100%;
          height: 100%;

          .image-slot {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            background: var(--el-fill-color-light);
            color: #d3c6c6;
            font-size: 30px;
          }
        }

        img {
          width: 80px;
          height: 80px;
        }
      }

      .title {
        display: flex;
        flex-direction: column;

        .txt {
          color: var(--color-gray-txt4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
          width: 160px;
        }

        .detail {
          font-size: 12px;
          color: var(--color-gray-txt3);
          display: flex;
          flex-direction: column;
          flex: 1;

          .detail-item {
            line-height: 20px;

            i {
              margin-right: 6px;
            }
          }
        }
      }

      .icon-detail {
        display: flex;
        align-items: center;
        width: 18px;
        height: 44px;
        cursor: pointer;
        color: var(--color-gray-txt6);

        .iconfont {
          font-size: 12px;
          margin-left: 10px;
          &:hover {
            color: var(--color-primary);
          }
        }
      }
    }
  }

  .load-btn-wrap {
    padding: 10px;
  }
}

.panel-btn {
  z-index: 2;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 360px;
  padding: 0 15px;
  height: 55px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px 0 rgb(0 0 0 / 8%);
  background: var(--color-white);

  .checkAll {
    display: flex;
    align-items: center;
    color: var(--color-gray-txt4);

    .el-checkbox {
      margin-right: 20px;
      font-weight: 400;

      &:after {
        content: "|";
        position: absolute;
        top: 9px;
        left: 59px;
        color: var(--color-gray-txt3);
      }
    }

    .num {
      padding: 0 3px;
      font-size: 16px;
      color: var(--color-primary);
    }
  }

  .btn {
    .el-button {
      height: 36px;
    }
  }
}
</style>
