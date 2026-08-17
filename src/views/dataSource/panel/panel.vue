<template>
  <div
    v-if="showPanel"
    :class="[
      'panel transition-[left] duration-200 border-[1px] border-[#87cbf0]',
      panelCollapse ? 'h-[40px]' : 'h-[100%]',
      isSiteObservePanel ? '' : 'flex-1'
    ]"
    :style="{
      // left: isCollapse ? '3vw' : '13vw',
      width: panelCollapse ? '120px' : '20vw'
    }"
  >
    <div
      class="w-full h-[40px] text-[16px] leading-[40px] pl-8 relative rounded-b-[5px] text-white"
      :style="{
        backgroundImage: 'url(' + headerBgImg + ')',
        backgroundSize: '100% 100%',
        width: panelCollapse ? '120px' : '100%'
      }"
    >
      {{ title }}
    </div>
    <div
      :style="
        panelCollapse
          ? {
              height: '0px'
            }
          : ''
      "
    >
      <div class="box-border px-[30px] pt-[20px]">
        <el-form
          ref="leftFormRef"
          label-position="left"
          :show-message="false"
          :rules="rules"
          :model="form"
        >
          <el-form-item
            v-if="isSiteObservePanel"
            label-width="3.5vw"
            label="数据id"
            style="width: 102%"
          >
            <el-input v-model="form.sdId" />
          </el-form-item>
          <el-form-item label="空间位置" style="width: 102%">
            <local-sel ref="localSelRef" style="width: 100%" />
          </el-form-item>

          <el-form-item
            v-if="!isSiteObservePanel"
            label="数据选择"
            style="width: 120.5%"
          >
            <div
              :class="[
                'data_select',
                'bg-[rgba(214,236,254,0.7)] w-full h-[420px] border-[1px] border-[#9cbaed]',
                'relative mt-[40px] right-[66px]',
                'rounded-lg overflow-y-auto px-[10px]'
              ]"
            >
              <el-tree
                ref="treeRef"
                :data="menuTree"
                show-checkbox
                :default-expand-all="true"
                node-key="id"
                :expand-on-click-node="true"
                :props="{
                  label: 'name',
                  isLeaf: 'leaf',
                  children: 'children',
                  class: customNodeClass,
                  disabled: 'disabled'
                }"
                style="background-color: rgb(214 236 254 / 0%)"
                @node-click="treeNodeClick"
              >
                <template #default="{ data }">
                  <!-- <el-tooltip
                    v-if="data.remark"
                    :content="data.remark"
                    placement="right"
                    effect="light"
                  >
                    {{ data.name }}
                  </el-tooltip> -->
                  <el-button v-if="data.loading" type="info" loading text />
                  <div v-if="data.loading">{{ data.name }}</div>
                </template>
              </el-tree>
            </div>
          </el-form-item>

          <el-form-item label="时间范围" style="width: 118%">
            <el-date-picker
              v-model="form.startTime"
              type="date"
              placeholder="开始时间"
              style="width: 40%"
            />
            <div class="w-[3.5%] h-2" />
            <el-date-picker
              v-model="form.endTime"
              type="date"
              placeholder="结束时间"
              style="width: 40%"
            />
          </el-form-item>
          <el-form-item v-if="isSiteObservePanel" label="仪器类型">
            <el-select
              v-model="form.driveModeList"
              collapse-tags-tooltip
              :max-collapse-tags="2"
              collapse-tags
              multiple
              placeholder="请选择"
            >
              <el-option
                v-for="item in instrumentTypeOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="isSiteObservePanel" label="数据属性">
            <!-- <el-scrollbar height="200px"> -->
            <el-scrollbar
              height="140px"
              :class="[
                'border-[1px] w-full rounded-sm overflow-x-none',
                fieldValue ? 'border-[#ff7676]' : 'border-[#9cbaed]'
              ]"
            >
              <div
                :class="[
                  'w-full flex p-[5px]',
                  'bg-[rgba(214,236,254,0.7)] ',
                  'flex-wrap justify-between gap-2'
                ]"
              >
                <!-- 加一个复选框1 -->
                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableWavelength"
                    disabled
                    class="mr-4"
                  />
                  <el-form-item
                    title="wavelength"
                    label-width="3vw"
                    label="wav..."
                    prop="wavelength"
                  >
                    <el-slider
                      v-model="form.wavelength"
                      range
                      :step="0.1"
                      :min="observeInterval.wavelength[0] || 0"
                      :max="observeInterval.wavelength[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableChla"
                    :disabled="!hasSliderRange(form.chla)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="chla"
                    label-width="3vw"
                    label="Chla"
                    prop="chla"
                  >
                    <!-- {{ observeInterval.chla }} -->
                    <el-slider
                      v-model="form.chla"
                      range
                      :disabled="!form.enableChla"
                      :step="0.01"
                      :min="observeInterval.chla[0] || 0"
                      :max="observeInterval.chla[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableSpm"
                    :disabled="!hasSliderRange(form.spm)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="spm"
                    label-width="3vw"
                    label="SPM"
                    prop="spm"
                  >
                    <el-slider
                      v-model="form.spm"
                      range
                      :disabled="!form.enableSpm"
                      :step="0.1"
                      :min="observeInterval.spm[0] || 0"
                      :max="observeInterval.spm[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableTsm"
                    :disabled="!hasSliderRange(form.tsm)"
                    class="mr-4"
                  />
                  <!-- {{ !hasSliderRange(form.tsm) }} -->
                  <el-form-item
                    title="tsm"
                    label-width="3vw"
                    label="TSM"
                    prop="tsm"
                  >
                    <el-slider
                      v-model="form.tsm"
                      range
                      :disabled="!form.enableTsm"
                      :step="0.01"
                      :min="observeInterval.tsm[0] || 0"
                      :max="observeInterval.tsm[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <!-- <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableCdom"
                    :disabled="!hasSliderRange(form.cdom)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="cdom"
                    label-width="3vw"
                    label="CDOM"
                    prop="cdom"
                  >
                    <el-slider
                      v-model="form.cdom"
                      range
                      :disabled="!form.enableCdom"
                      :step="0.01"
                      :min="observeInterval.cdom[0] || 0"
                      :max="observeInterval.cdom[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div> -->
                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enablePim"
                    :disabled="!hasSliderRange(form.pim)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="pim"
                    label-width="3vw"
                    label="PIM"
                    prop="pim"
                  >
                    <el-slider
                      v-model="form.pim"
                      range
                      :disabled="!form.enablePim"
                      :step="0.00001"
                      :min="observeInterval.pim[0] || 0"
                      :max="observeInterval.pim[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enablePom"
                    :disabled="!hasSliderRange(form.pom)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="pom"
                    label-width="3vw"
                    label="POM"
                    prop="pom"
                  >
                    <el-slider
                      v-model="form.pom"
                      range
                      :disabled="!form.enablePom"
                      :step="0.0001"
                      :min="observeInterval.pom[0] || 0"
                      :max="observeInterval.pom[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableSst"
                    :disabled="!hasSliderRange(form.sst)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="sst"
                    label-width="3vw"
                    label="SST"
                    prop="sst"
                  >
                    <el-slider
                      v-model="form.sst"
                      range
                      :disabled="!form.enableSst"
                      :step="0.01"
                      :min="observeInterval.sst[0] || 0"
                      :max="observeInterval.sst[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableSalinity"
                    :disabled="!hasSliderRange(form.salinity)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="salinity"
                    label-width="3vw"
                    label="Salinity"
                    prop="salinity"
                  >
                    <el-slider
                      v-model="form.salinity"
                      range
                      :disabled="!form.enableSalinity"
                      :step="0.01"
                      :min="observeInterval.salinity[0] || 0"
                      :max="observeInterval.salinity[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableAg"
                    :disabled="!hasSliderRange(form.ag)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="ag"
                    label-width="3vw"
                    label="ag(400)"
                    prop="ag"
                  >
                    <el-slider
                      v-model="form.ag"
                      range
                      :disabled="!form.enableAg"
                      :step="0.01"
                      :min="observeInterval.ag[0] || 0"
                      :max="observeInterval.ag[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableSsh"
                    :disabled="!hasSliderRange(form.ssh)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="ssh"
                    label-width="3vw"
                    label="SSH"
                    prop="ssh"
                  >
                    <el-slider
                      v-model="form.ssh"
                      range
                      :disabled="!form.enableSsh"
                      :step="0.01"
                      :min="observeInterval.ssh[0] || 0"
                      :max="observeInterval.ssh[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableS"
                    :disabled="!hasSliderRange(form.s)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="s"
                    label-width="3vw"
                    label="s(1/nm)"
                    prop="s"
                  >
                    <el-slider
                      v-model="form.s"
                      range
                      :disabled="!form.enableS"
                      :step="0.01"
                      :min="observeInterval.s[0] || 0"
                      :max="observeInterval.s[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableWind"
                    :disabled="!hasSliderRange(form.wind)"
                    class="mr-4"
                  />
                  <el-form-item
                    title="wind"
                    label-width="3vw"
                    label="Wind"
                    prop="wind"
                  >
                    <el-slider
                      v-model="form.wind"
                      range
                      :disabled="!form.enableWind"
                      :step="0.01"
                      :min="observeInterval.wind[0] || 0"
                      :max="observeInterval.wind[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>

                <div class="flex items-center flex-start" style="width: 100%">
                  <el-checkbox
                    v-model="form.enableCurrent"
                    :disabled="!hasSliderRange(form.current)"
                    class="mr-4"
                  />
                  <!-- {{ form.current }} -->
                  <el-form-item
                    title="current"
                    label-width="3vw"
                    label="current"
                    prop="current"
                  >
                    <el-slider
                      v-model="form.current"
                      range
                      :disabled="!form.enableCurrent"
                      :step="0.01"
                      :min="observeInterval.current[0] || 0"
                      :max="observeInterval.current[1] || 100"
                      style="width: 90%"
                    />
                  </el-form-item>
                </div>
              </div>
            </el-scrollbar>
          </el-form-item>
          <el-form-item style="width: 110%">
            <el-button style="width: 20%; border-radius: 20px" @click="reset()"
              >重置</el-button
            >
            <el-button
              type="primary"
              :loading="loading"
              style="width: 69.5%; border-radius: 20px"
              @click="onSubmit(leftFormRef)"
              >检索</el-button
            >
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
  <div>
    <DataDetail ref="dataDetailRef" />
  </div>
  <onlineTree
    ref="olineTreeRef"
    @handleTreeChange="handleTreeChange"
    @handleTreeClose="handleTreeClose"
  />
</template>

<script setup lang="ts">
import { ref, reactive, toRefs, onMounted, onBeforeMount, computed } from "vue";
import { message } from "@/utils/message";
import bus from "@/utils/bus";
import dayjs from "dayjs";
import * as Cesium from "cesium";
import { wktToGeoJSON } from "@terraformer/wkt";
import { getAlgorithmCatalogTree } from "@/api/dataSource/stThematic";
import { stUsgsInfoSearch } from "@/api/dataSource/panel/online";
import { getConditionPage } from "@/api/dataSource/panel/loal";
import {
  getSdObserveDevice,
  getSdObserveInterval
} from "@/api/dataSource/instrument";
import map from "@/libs/tdtmap";
import DataDetail from "@/views/dataSource/DataDetail.vue";
import LocalSel from "@/components/LocalSel/index.vue";
import onlineTree from "./onlineTree.vue";

import headerBgImg from "@/assets/common/header-bg.png";

import {
  parseSentinelData,
  convertToGeoJSON,
  convertLandsatToGeoJSON,
  calculateBoundingBox
} from "@/utils/parseSentinelData";
import { useUserStoreHook } from "@/store/modules/user";
const userStore: any = useUserStoreHook();

const title = ref("");
/** 侧栏「现场观测」表单：一级入口改为「观测结果数据集」 */
const isSiteObservePanel = computed(
  () => title.value === "现场观测数据" || title.value === "观测结果数据集"
);
const typeData = ref([]);
const dataSet = ref([]);
const nextDataSet = ref([]);
const dataList = ref([]);
const onlineDataList = ref([]);
const localSelRef = ref();
const isCollapse = ref(false);
const panelCollapse = ref(false);
const instrumentTypeOptions = ref([]);

const showPanel = ref(false);
bus.on("showPanel", (data: any) => {
  showPanel.value = data;
});

const leftFormRef = ref();
const loading = ref(false);

bus.on("isCollapse", () => {
  isCollapse.value = !isCollapse.value;
});

const checkedDataIds = () => {
  if (!treeRef.value) return;
  let localData = treeRef.value.getCheckedNodes();
  localData = localData.filter(item => item.leaf);
  const ids = localData.map(item => item.id);
  return ids;
};

bus.on("panelTitle", (data: any) => {
  console.log(data, "data111");
  // return;
  reset();
  title.value = data.menuName;
  if (data.menuName == "现场观测数据" || data.menuName == "观测结果数据集")
    return;
  typeData.value = data.children;
  data.children?.forEach(item => {
    item.id = item.menuId || item.id;
    item.name = item.menuName || item.name;
    item.checkedArray = [];
    item.checkAll = true;
    item.isIndeterminate = true;
    item.isOnline = item.name == "L1" ? true : false;
    item.children?.forEach(child => {
      child.id = child.menuId || child.id;
      child.name = child.menuName || child.name;
      child.disabled = false;
      child.checkedArray = [];
      child.checkAll = false;
      child.isIndeterminate = true;
    });
    item.disabled = !item.children
      ? true
      : item.children?.some(item => item.disabled) || false;
  });
  menuTree.value = data.children || [];
  console.log(menuTree.value, "menuTree.value");
  menuTree.value.forEach(item => {
    if (item.catalogId) {
      treeNodeClick(item);
    } else if (item.children) {
      item.children.forEach(child => {
        treeNodeClick(child);
      });
    }
  });
});

const onlineData = ref();
const pageSize = ref(0);
const localPageSize = ref(0);
const sentinel2Types = ref([]);
const onlineType = ref();
const onlineTypes = ref([]);

const getOnlineData = async (online_type?: any) => {
  const checkedOnlineTypes = treeRef.value
    ?.getCheckedNodes()
    .filter(item => item.name == "L1")
    .filter(
      item => item.level.includes("Sentinel") || item.level.includes("Landsat")
    )
    .map(item => item.level);
  console.log(checkedOnlineTypes);

  if (
    !treeRef.value?.getCheckedNodes().some(item => item.name == "L1") ||
    !userStore.info.admin
  ) {
    bus.emit("showOnlineTable", {
      status: false,
      onlineData: [],
      onlineTypes: []
    });
    bus.emit("bottomLogos", false);
    return;
  }

  const local = localSelRef.value?.getSpatial();
  bus.emit("showOnlineTable", {
    status: true,
    onlineData: [],
    onlineTypes: []
  });
  bus.emit("bottomLogos", true);
  onlineDataList.value = [];
  map.removeAllLayer();
  map.clearGeoJSON();

  bus.emit("loadingOnlineTable", true);

  onlineType.value = online_type
    ? online_type
    : checkedOnlineTypes.filter(item => item.includes("Sentinel")).length
      ? "2"
      : checkedOnlineTypes.filter(item => item.includes("Landsat")).length
        ? "1"
        : "";

  console.log(onlineType.value);

  if (!onlineType.value) {
    bus.emit("loadingOnlineTable", false);
    return;
  }

  loading.value = true;

  const res: any = await stUsgsInfoSearch({
    datasetName: "landsat_ot_c2_l1",
    startDate:
      form.value.startTime ||
      new Date(new Date().getTime() - 60 * 24 * 3600 * 1000),
    endDate: form.value.endTime || new Date(),
    geoJsonStr: local.value.wkt
      ? JSON.stringify(wktToGeoJSON(local.value.wkt))
      : "",
    wtk: local.value.wkt ? local.value.wkt : "",
    onlineType: onlineType.value,
    sentinel2Types: ["A", "B", "C"],
    // sentinel2Types: sentinel2Types.value,
    pageSize: (pageSize.value += 10),
    pageNum: 1
  }).catch(() => {
    loading.value = false;
    pageSize.value = 0;
    bus.emit("getSearchOnlineDataList", {
      data: [],
      entities: {},
      onlineData: onlineData.value,
      online_types: onlineTypes.value
    });
    bus.emit("showOnlineTable", {
      status: true,
      onlineData: [],
      onlineTypes: checkedOnlineTypes
    });
  });
  if (!res) return;

  if (onlineType.value == "1") {
    console.log(JSON.parse(res.data));
    const landsatData = JSON.parse(res.data);
    landsatData.results.forEach(item => {
      item.time = dayjs(item.publishDate).format("YYYY-MM-DD HH:mm:ss");
      item.name = item.displayId;
      item.level = "L1";
      item.sensor = "Landsat";
      item.id = item.entityId;
      item.datasetId = "5e81f14f59432a27";
      item.bbox = calculateBoundingBox(item.spatialCoverage);
    });

    onlineDataList.value = landsatData.results;
    const geoJSONData = convertLandsatToGeoJSON(landsatData);
    console.log(geoJSONData);

    loading.value = false;

    bus.emit("getSearchOnlineDataList", {
      data: onlineDataList.value,
      entities: geoJSONData,
      onlineData: onlineData.value,
      online_types: onlineTypes.value
    });
  } else if (onlineType.value == "2") {
    const sentinelData = parseSentinelData(res.data);
    sentinelData.products.forEach(item => {
      item.time = dayjs(item.acquisitionTime).format("YYYY-MM-DD HH:mm:ss");
      item.level = "L1";
      item.sensor = "Sentinel";
      item.id = item.productId;
      item.bbox = calculateBoundingBox(item.geoFootprint);
    });
    onlineDataList.value = sentinelData.products;
    // console.log(onlineDataList.value);

    const geoJSONData = convertToGeoJSON(sentinelData);
    // console.log(geoJSONData);

    loading.value = false;

    bus.emit("getSearchOnlineDataList", {
      data: onlineDataList.value,
      entities: geoJSONData,
      onlineData: onlineData.value,
      online_types: onlineTypes.value
    });
  }

  if (onlineDataList.value.length) {
    bus.emit("showOnlineTable", {
      status: true,
      onlineData: onlineDataList.value,
      onlineTypes: checkedOnlineTypes
    });
  } else {
    // bus.emit("showOnlineTable", { status: false });
  }
  // bus.emit("showSearchPanel", true);
};

const handleTreeChange = data => {
  onlineData.value = data;
};

const handleTreeClose = () => {
  onlineData.value = undefined;
};

const emit = defineEmits(["handleSearch"]);

const observeInterval = reactive<any>({});

/** 现场观测检索：不把滑块数组与 enable* 原样传给接口 */
const observeSearchOmitKeys = new Set([
  "waterDepth",
  "spm",
  "pim",
  "pom",
  "chla",
  "sst",
  "salinity",
  "tsm",
  "ssh",
  "wind",
  "current",
  "ag",
  "cdom",
  "wavelength",
  "s",
  "enableWavelength",
  "enableChla",
  "enableSpm",
  "enableTsm",
  "enableCdom",
  "enablePim",
  "enablePom",
  "enableSst",
  "enableSalinity",
  "enableAg",
  "enableSsh",
  "enableS",
  "enableWind",
  "enableCurrent"
]);

const data = reactive({
  form: {
    startTime: new Date(new Date().getTime() - 60 * 24 * 3600 * 1000),
    endTime: new Date(),
    cloudCoverage: 100,
    local: undefined,
    api: undefined,
    collection: undefined,
    limit: 10,
    next: 0,
    enableWavelength: true,
    enableChla: false,
    enableSpm: false,
    enableTsm: false,
    enableCdom: false,
    enablePim: false,
    enablePom: false,
    enableSst: true,
    enableSalinity: false,
    enableAg: false,
    enableSsh: false,
    enableS: false,
    enableWind: false,
    enableCurrent: false
  } as any,
  rules: {
    wavelength: [{ required: true, message: "波长不能为空", trigger: "blur" }]
  } as any
});

const { form, rules } = toRefs(data);

const checkedLv3Array = ref([]);

const treeRef = ref();

const customNodeClass = ({ isPenultimate }) =>
  isPenultimate ? "is-penultimate" : "";

const treeNodeClick = async node => {
  // console.log(node);
  if (node.leaf) return;
  if (node.children && node.children?.length) return;
  node.loading = true;
  const res = await getAlgorithmCatalogTree({
    rootId: node.catalogId
  }).catch(() => {
    node.loading = false;
  });
  if (!res) return;
  res.data.forEach(item => {
    item.level = node.name;
    item.leaf = true;
    item.isPenultimate = true;
  });
  res.data.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  if (!node.children || !node.children?.length) {
    treeRef.value?.updateKeyChildren(
      node.id,
      res.data
      // res.data.filter(item => !item.name.includes("B"))
    );
    node.disabled = false;
    treeRef.value?.getNode(node.parentId)
      ? (treeRef.value.getNode(node.parentId).data.disabled = false)
      : true;
  }
  node.loading = false;
};

const menuTree = ref([]);

/** 表单重置 */
const reset = () => {
  form.value = {
    startTime: undefined,
    endTime: undefined,
    cloudCoverage: 100,
    local: undefined,
    api: undefined,
    collection: undefined,
    limit: 0,
    next: 0,
    waterDepth: observeInterval.waterDepth,
    spm: observeInterval.spm,
    pim: observeInterval.pim,
    pom: observeInterval.pom,
    pimPer: observeInterval.pimPer,
    pomPer: observeInterval.pomPer,
    chla: observeInterval.chla,
    sst: observeInterval.sst,
    salinity: observeInterval.salinity,
    tsm: observeInterval.tsm,
    ssh: observeInterval.ssh,
    wind: observeInterval.wind,
    current: observeInterval.current,
    ag: observeInterval.ag,
    cdom: observeInterval.cdom,
    wavelength: observeInterval.wavelength,
    s: observeInterval.s,
    enableWavelength: true,
    enableChla: false,
    enableSpm: false,
    enableCdom: false,
    enablePim: false,
    enablePom: false,
    enableSst: false,
    enableSalinity: false,
    enableAg: false,
    enableSsh: false,
    enableS: false,
    enableWind: false,
    enableCurrent: false
  } as any;
  fieldValue.value = false;
  loading.value = false;
  nextDataSet.value = [];
  dataSet.value = [];
  dataList.value = [];
  checkedLv3Array.value = [];
  onlineType.value = "";
  onlineTypes.value = [];
  sentinel2Types.value = [];
  onlineDataList.value = [];
  onlineData.value = undefined;
  localAllPageSize = 0;
  localPublicPageSize = 0;
  localUserPageSize = 0;
  pageSize.value = 0;
  // map.removeAllLayer();
  // map.clearGeoJSON();
  bus.emit("getSearchOnlineDataList", {
    data: onlineDataList.value,
    entities: null,
    onlineData: onlineData.value,
    online_types: onlineTypes.value
  });
  if (leftFormRef.value?.resetFields) {
    leftFormRef.value.resetFields();
  }
  menuTree.value?.forEach(item => {
    item.checkedArray = [];
    item.checkAll = false;
    treeRef.value?.setChecked(item, false, true);
  });
  bus.emit("resetLocalType");
  bus.emit("showSearchPanel", false);
  bus.emit("getSearchAllLocalDataList", { data: [] });
  bus.emit("getSearchPublicLocalDataList", { data: [] });
  bus.emit("getSearchUserLocalDataList", { data: [] });
  bus.emit("clearSearchInstrumentData");
};
bus.on("formReset", () => {
  reset();
});

bus.on("searchOnlineData", (online_type?: any) => {
  getOnlineData(online_type);
});

const getObserveDevice = async () => {
  const res = await getSdObserveDevice();
  instrumentTypeOptions.value = res.data;
};

const getObserveInterval = async () => {
  const { data } = await getSdObserveInterval();
  observeInterval.waterDepth = [
    Number(data["waterDepthStart"]),
    Number(data["waterDepthEnd"])
  ];
  observeInterval.spm = [Number(data["spmStart"]), Number(data["spmEnd"])];
  observeInterval.pim = [Number(data["pimStart"]), Number(data["pimEnd"])];
  observeInterval.pom = [Number(data["pomStart"]), Number(data["pomEnd"])];
  observeInterval.pimPer = [
    Number(data["pimPerStart"]),
    Number(data["pimPerEnd"])
  ];
  observeInterval.pomPer = [
    Number(data["pomPerStart"]),
    Number(data["pomPerEnd"])
  ];
  observeInterval.chla = [Number(data["chlaStart"]), Number(data["chlaEnd"])];
  observeInterval.sst = [Number(data["sstStart"]), Number(data["sstEnd"])];
  observeInterval.salinity = [
    Number(data["salinityStart"]),
    Number(data["salinityEnd"])
  ];
  observeInterval.tsm = [Number(data["tsmStart"]), Number(data["tsmEnd"])];
  observeInterval.ssh = [Number(data["sshStart"]), Number(data["sshEnd"])];
  observeInterval.wind = [Number(data["windStart"]), Number(data["windEnd"])];
  observeInterval.current = [
    Number(data["currentStart"]),
    Number(data["currentEnd"])
  ];
  observeInterval.ag = [Number(data["agStart"]), Number(data["agEnd"])];
  observeInterval.cdom = [Number(data["cdomStart"]), Number(data["cdomEnd"])];
  observeInterval.wavelength = [
    Number(data["wavelengthStart"]),
    Number(data["wavelengthEnd"])
  ];
  observeInterval.s = [Number(data["sstart"]), Number(data["send"])];
  console.log(observeInterval, "observeInterval");
};

let localAllDataList = [];
let localAllPageSize = 0;
const getAllLocalData = async () => {
  localAllDataList = [];
  localAllPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;
  const res = await getConditionPage(
    {
      bo: {
        beginTime: form.value.startTime,
        endTime: form.value.endTime,
        datasets: localDataIds,
        userId: userStore.info.userId,
        local: localSelRef.value.getSpatial(),
        type: 1
      },
      page: {
        pageSize: localAllPageSize,
        pageNum: 1
      }
    },
    "/all"
  );
  localAllDataList = res.rows;
  bus.emit("getSearchAllLocalDataList", { data: localAllDataList });
};

let localPublicDataList = [];
let localPublicPageSize = 0;
const getPublicLocalData = async () => {
  localPublicDataList = [];
  localPublicPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;
  const res = await getConditionPage(
    {
      bo: {
        beginTime: form.value.startTime,
        endTime: form.value.endTime,
        datasets: localDataIds,
        local: localSelRef.value.getSpatial(),
        type: 1
      },
      page: {
        pageSize: localPublicPageSize,
        pageNum: 1
      }
    },
    ""
  );
  localPublicDataList = res.rows;
  bus.emit("getSearchPublicLocalDataList", { data: localPublicDataList });
};

let localUserDataList = [];
let localUserPageSize = 0;
const getUserLocalData = async () => {
  localUserDataList = [];
  localUserPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;
  const res = await getConditionPage(
    {
      bo: {
        beginTime: form.value.startTime,
        endTime: form.value.endTime,
        datasets: localDataIds,
        userId: userStore.info.userId,
        local: localSelRef.value.getSpatial(),
        type: 1
      },
      page: {
        pageSize: localUserPageSize,
        pageNum: 1
      }
    },
    "/user"
  );
  localUserDataList = res.rows;
  bus.emit("getSearchUserLocalDataList", { data: localUserDataList });
};

const getLocalData = async () => {
  loading.value = true;
  localPageSize.value += 5;
  await getAllLocalData();
  getPublicLocalData();
  getUserLocalData();
  loading.value = false;
};

bus.on("searchAllLocalData", async () => {
  await getAllLocalData();
});

bus.on("searchPublicLocalData", async () => {
  await getPublicLocalData();
});

bus.on("searchUserLocalData", async () => {
  await getUserLocalData();
});

const fieldValue = ref(false);
const onSubmit = async formEl => {
  map.removeWindLayer();
  if (dayjs(form.value.startTime).isAfter(dayjs(form.value.endTime))) {
    message("开始时间不能晚于结束时间", { type: "warning" });
    return;
  }
  loading.value = true;
  if (!formEl) return;
  await formEl.validate(async (valid, fields) => {
    if (valid) {
      if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").rectangle
      ) {
        map.getViewer().entities.getById("drawEntity").rectangle.material =
          Cesium.Color.BLUE.withAlpha(0) as any;
      } else if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").ellipse
      ) {
        const ellipse = map.getViewer().entities.getById("drawEntity").ellipse;
        ellipse.material = Cesium.Color.BLUE.withAlpha(0) as any;
      } else if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").polygon
      ) {
        const polygon = map.getViewer().entities.getById("drawEntity").polygon;
        polygon.material = Cesium.Color.BLUE.withAlpha(0) as any;
      }
      fieldValue.value = false;
      if (title.value == "现场观测数据" || title.value == "观测结果数据集") {
        const f = form.value;
        const observeForm: Record<string, number> = {};
        const addRange = (
          enabled: boolean,
          arr: number[] | undefined,
          startKey: string,
          endKey: string
        ) => {
          if (enabled && Array.isArray(arr) && arr.length >= 2) {
            observeForm[startKey] = String(arr[0]);
            observeForm[endKey] = String(arr[1]);
          }
        };

        if (Array.isArray(f.waterDepth) && f.waterDepth.length >= 2) {
          observeForm.waterDepthStart = String(f.waterDepth[0]);
          observeForm.waterDepthEnd = String(f.waterDepth[1]);
        }
        observeForm.wavelengthStart = f.wavelength[0];
        observeForm.wavelengthEnd = f.wavelength[1];

        addRange(f.enableChla, f.chla, "chlaStart", "chlaEnd");
        addRange(f.enableSpm, f.spm, "spmStart", "spmEnd");
        addRange(f.enableTsm, f.tsm, "tsmStart", "tsmEnd");
        addRange(f.enableCdom, f.cdom, "cdomStart", "cdomEnd");
        if (f.enablePim && Array.isArray(f.pim) && f.pim.length >= 2) {
          observeForm.pimStart = String(f.pim[0]);
          observeForm.pimEnd = String(f.pim[1]);
          observeForm.pimPerStart = String(f.pim[0]);
          observeForm.pimPerEnd = String(f.pim[1]);
        }
        if (f.enablePom && Array.isArray(f.pom) && f.pom.length >= 2) {
          observeForm.pomStart = f.pom[0];
          observeForm.pomEnd = String(f.pom[1]);
          observeForm.pomPerStart = String(f.pom[0]);
          observeForm.pomPerEnd = String(f.pom[1]);
        }
        addRange(f.enableSst, f.sst, "sstStart", "sstEnd");
        addRange(f.enableSalinity, f.salinity, "salinityStart", "salinityEnd");
        addRange(f.enableSsh, f.ssh, "sshStart", "sshEnd");
        addRange(f.enableWind, f.wind, "windStart", "windEnd");
        addRange(f.enableCurrent, f.current, "currentStart", "currentEnd");
        addRange(f.enableAg, f.ag, "agStart", "agEnd");
        addRange(f.enableS, f.s, "sStart", "sEnd");

        const formRest = Object.fromEntries(
          Object.entries(f).filter(([k]) => !observeSearchOmitKeys.has(k))
        );

        bus.emit("searchObserveData", {
          ...formRest,
          ...observeForm,
          driveModeList: form.value.driveModeList?.join(","),
          wkt: localSelRef.value.getSpatial().value.wkt,
          mapQueryType: 1
        });
        loading.value = false;
        return;
      }
      await getLocalData();
      bus.emit("showSearchPanel", true);
      await getOnlineData();
      loading.value = false;
    } else {
      loading.value = false;
      fieldValue.value = true;
      return fields;
    }
  });
};
// 如果数组长度大于2且每个元素都不为undefined和null，则返回true，否则返回false
const hasSliderRange = (arr: number[]) => {
  return (
    arr.length >= 2 &&
    arr.every(item => item !== undefined && item !== null && item !== 0)
  );
};

const maxWavelength = ref(100);
onBeforeMount(() => {
  getObserveInterval();
});

onMounted(() => {
  getObserveDevice();
});
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none;
}

.data_select:hover {
  &::-webkit-scrollbar {
    display: block;
    width: 5px;
    border-radius: 8px;
  }
}

.panel {
  // flex: 1;
  height: auto;
  // width: 420px;
  overflow-y: scroll;
  color: #244d66;
  background: linear-gradient(
    180deg,
    rgb(246 251 254 / 97%) 0%,
    rgb(231 243 249 / 94%) 100%
  );
  border-color: rgb(121 205 238 / 54%) !important;
  border-radius: 9px;
  box-shadow:
    0 16px 35px rgb(0 15 29 / 28%),
    inset 0 1px 0 rgb(255 255 255 / 75%);

  > div:first-child {
    background: linear-gradient(
      100deg,
      #0c4b70 0%,
      #117ca5 58%,
      #4fc2e9 100%
    ) !important;
    box-shadow: inset 0 -1px 0 rgb(255 255 255 / 22%);
  }
}

.data_select {
  background: rgb(220 240 250 / 78%) !important;
  border-color: rgb(107 184 219 / 55%) !important;
  box-shadow: inset 0 1px 2px rgb(13 66 98 / 6%);
}

:deep(.el-form-item__label) {
  // color: #0e306b;
  text-wrap: nowrap;
}

:deep(.el-slider) {
  .el-slider__bar,
  .el-slider__runway {
    top: 2px;
    height: 3px;
  }

  .el-slider__button {
    width: 0.6vw;
    height: 0.6vw;
  }

  .el-slider__button-wrapper {
    width: 0.6vw;
  }
}

:deep(.attribute .el-form-item__content) {
  display: flex;
  justify-content: space-between;
}

.panel-btn {
  left: 320px;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 420px;
  height: 55px;
  padding: 0 15px;
  background: rgb(4 44 103);
  box-shadow: 0 -2px 10px 0 rgb(0 0 0 / 8%);

  .checkAll {
    display: flex;
    align-items: center;
    color: #0e306b;

    .el-checkbox {
      margin-right: 20px;
      font-weight: 400;
      color: #0e306b;
      // &:after {
      //   content: "|";
      //   position: absolute;
      //   top: 9px;
      //   left: 59px;
      //   color: var(--color-gray-txt3);
      // }
    }

    .num {
      padding: 0 3px;
      font-size: 16px;
      color: white;
    }
  }

  .btn {
    .el-button {
      height: 36px;
    }
  }
}

:deep(.el-checkbox) {
  color: #0e306b;
}
:deep(.el-form-item__content) {
  color: #0e306b;
  width: 7vw;
}
:deep(.el-form-item__label) {
  margin-left: 2px !important;
}

// :deep(.lv1_checkbox .el-checkbox__inner) {
// display: none;
// }
</style>
