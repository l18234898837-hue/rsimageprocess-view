<script setup lang="ts">
import Map from "@/components/Map/map.vue";
import tdMap from "@/libs/tdtmap";
import { onMounted, onBeforeUnmount, ref, getCurrentInstance } from "vue";
import * as Cesium from "cesium";
import LocalSel from "@/components/LocalSel/index.vue";
import { useLeftHook } from "@/views/satelliteOrbit/hooks/useLeftHook";
import { useRightHook } from "@/views/satelliteOrbit/hooks/useRightHook";
import { View, Hide } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import {
  postSatelliteTleList,
  postOrbitForecastSatelliteOverZoneNew,
  postOrbitForecastSatelliteOverCircleZoneNew,
  postOrbitForecastSatelliteOverZonePeriod,
  postOrbitForecastSatelliteOverCircleZonePeriod
} from "@/api/satelliteOrbit";
import {
  getSatelliteTreeResponse,
  postOrbitForecastSatelliteOverCircleZoneBodyNew
} from "@/api/satelliteOrbit/types";
import { buildUUID } from "@pureadmin/utils";
import { nextTick } from "vue";
import bus from "@/utils/bus";

defineOptions({
  name: "satelliteOrbit"
});
const { proxy } = getCurrentInstance();
const {
  getSateTreeList,
  changeTimeSelectType,
  timeSelectBtns,
  currentSelectTimeType,
  queryParams,
  defaultProps,
  satelliteList,
  getSateDict,
  satelliteDict,
  handleSateCheck,
  getSateIdsFromTree,
  getDefaultSatellite,
  flyToSelectedArea,
  setAllOrbitShow
} = useLeftHook();

const {
  rightTableData,
  setRightTableData,
  handleClickZoneShowTooltip,
  handleClickRow,
  defaultMinSideAngle,
  defaultMaxSideAngle,
  handlePlayPause,
  handleShowPolygon,
  handleSideAngle,
  handleShowSideAnglePopover,
  clearAboutOrbit,
  handleSelectionChange,
  handleExport,
  refTable,
  clearAll
} = useRightHook();

// 底座相关
let viewer = null;
// 卫星树实例
const satelliteTreeRef = ref(null);
// 本地选择实例
const localSelRef = ref(null);

/**
 * @description 处理时间
 * @param {string} timeType 时间类型
 */
const reduceTime = (timeType: "yearRange" | "monthRange" | "dateRange") => {
  const messageObj = {
    yearRange: "请选择年份范围",
    monthRange: "请选择月份范围",
    dateRange: "请选择日期范围"
  };
  if (
    queryParams[timeType].length < 2 ||
    // 清除后length为2，但是每一项为null
    !queryParams[timeType][0] ||
    !queryParams[timeType][1]
  ) {
    proxy.$message({
      message: messageObj[timeType],
      type: "warning"
    });
    return;
  }
  if (timeType == "yearRange") {
    // 开始时间必须小于结束时间
    if (
      dayjs(queryParams[timeType][0]).isAfter(dayjs(queryParams[timeType][1]))
    ) {
      // 调整年份范围顺序
      const copy = queryParams[timeType][0];
      queryParams[timeType][0] = queryParams[timeType][1];
      queryParams[timeType][1] = copy;
    }
  }
  if (timeType == "dateRange") {
    if (
      dayjs(queryParams[timeType][0]).isAfter(dayjs(queryParams[timeType][1]))
    ) {
      const copy = queryParams[timeType][0];
      queryParams[timeType][0] = queryParams[timeType][1];
      queryParams[timeType][1] = copy;
    }
    return {
      startTime: dayjs(queryParams[timeType][0]).format("YYYY-MM-DD HH:mm:ss"),
      endTime: dayjs(queryParams[timeType][1]).format("YYYY-MM-DD HH:mm:ss")
    };
  }
  return {
    startTime:
      dayjs(queryParams[timeType][0]).format("YYYY-MM-DD") + " 00:00:00",
    endTime: dayjs(queryParams[timeType][1]).format("YYYY-MM-DD") + " 23:59:59"
  };
};

/**
 * @description 点击预测触发
 */
const handlePredict = () => {
  // console.log("预测");
  // 处理请求参数
  const selectedSatellitesNodes = satelliteTreeRef.value.getCheckedNodes();
  // console.log("selectedSatellitesNodes", selectedSatellitesNodes);
  const sateIdsObj = getSateIdsFromTree(selectedSatellitesNodes);
  // console.log("sateIds-predict", sateIdsObj.sateIds);
  // console.log("sateIdsObj.copySateData", sateIdsObj.copySateData);

  if (selectedSatellitesNodes.length === 0) {
    proxy.$message({
      message: "请选择卫星",
      type: "warning"
    });
    return;
  }
  // 根据卫星id获取卫星轨道信息
  postSatelliteTleList(sateIdsObj.sateIds).then(res => {
    // console.log("获取到的卫星轨道", res);
    if (Array.isArray(res.rows)) {
      // console.log("queryParams", queryParams);
      let startTime = null;
      let endTime = null;
      let timeObj = null;
      if (currentSelectTimeType.value == "year") {
        timeObj = reduceTime("yearRange");
      } else if (currentSelectTimeType.value == "month") {
        timeObj = reduceTime("monthRange");
      } else if (currentSelectTimeType.value == "date") {
        timeObj = reduceTime("dateRange");
      }
      if (timeObj) {
        startTime = timeObj.startTime;
        endTime = timeObj.endTime;
        if (startTime && endTime) {
          const queryParamsArr: any[] = res.rows
            .map(e => {
              // console.log("每个轨道信息", e);
              if (e.tleLine1 && e.tleLine2) {
                const selectSateInfo = sateIdsObj.copySateData.find(
                  c => c.id == e.satelliteInfoId
                );
                return {
                  satelliteId: e.satelliteInfoId,
                  // 地面画幅
                  clothWidth: selectSateInfo?.clothWidth ?? 5000,
                  satelliteName:
                    satelliteDict.value.find(s => s.value == e.satelliteInfoId)
                      ?.label || "-",
                  orbitalAltitude: selectSateInfo?.orbitalAltitude ?? 0,
                  satelliteType: selectSateInfo?.satelliteType || "",
                  minSideAngle: defaultMinSideAngle,
                  maxSideAngle: defaultMaxSideAngle,
                  satelliteSeries: selectSateInfo?.satelliteSeries || "",
                  tleLine1: e.tleLine1,
                  tleLine2: e.tleLine2
                };
              } else {
                proxy.$message({
                  message: `卫星${e.id}没有TLE轨道信息`,
                  type: "warning"
                });
                return undefined;
              }
            })
            .filter(Boolean);
          // console.log("queryParamsArr", queryParamsArr);
          // 获取空间查询区域
          const local = localSelRef.value.getSpatial();
          if (!local) return;
          if (local.type == 1 || local.type == 3) {
            // debugger;
            // 地图查询 或者 岛礁
            handleMapSelect(local, queryParamsArr, startTime, endTime);
          } else {
          }
        }
      }
    }
  });
};

/**
 * @description 处理地图选择
 * @param {object} local 地图选择的数据
 * @queryParamsArr 请求参数
 */
const handleMapSelect = (
  local: any,
  queryParamsArr: any[],
  startTime: string,
  endTime: string
) => {
  const periodStartTime =
    isCycleSelect.value && queryParams.cycleTimeRange?.[0]
      ? dayjs(queryParams.cycleTimeRange[0]).format("HH:mm:ss")
      : "";
  const periodEndTime =
    isCycleSelect.value && queryParams.cycleTimeRange?.[1]
      ? dayjs(queryParams.cycleTimeRange[1]).format("HH:mm:ss")
      : "";
  const isPeriodSelect =
    isCycleSelect.value && periodStartTime && periodEndTime;

  if (isCycleSelect.value && !isPeriodSelect) {
    proxy.$message({
      message: "请选择周期时间范围",
      type: "warning"
    });
    return;
  }
  // debugger;
  // console.log("local", local);
  let zone: Record<string, any> = {};
  // 地图选择
  if (!local || !local.value || local.value.type == "no") {
    proxy.$message({
      message: "请选择空间查询区域",
      type: "warning"
    });
    return;
  } else {
    // console.log("地图选择", local.value.type);
    // 选择矩形或者多边形
    if (
      local.value.type == "rectangle" ||
      local.value.type == "polygon" ||
      local.value.type == "lngLat"
    ) {
      if (!local.value.wkt) {
        proxy.$message({
          message: "没有有效的空间区域，请检查",
          type: "warning"
        });
        return;
      }
      // console.log("选择", local.value.wkt);
      zone.type = "Polygon";
      zone.coordinates = local.value.wkt
        ?.split("((")[1]
        ?.split("))")[0]
        ?.split(",");
      zone.coordinates = zone.coordinates.map(item => {
        return item.split(" ")?.map(e => Number(e)) || [];
      });
      zone.coordinates = [[zone.coordinates]];
      // 飞行到指定区域
      flyToSelectedArea(zone, local);
      // console.log("zone", zone);
      // queryParamsArr.forEach(item => {
      //   item.zone = zone;
      // });
      const requestParams = {
        startTime,
        endTime,
        zone,
        orbitForecastSpecs: queryParamsArr,
        ...(isPeriodSelect ? { periodStartTime, periodEndTime } : {})
      };
      // 请求多边形区域接口
      const loadingInstance = proxy.$loading({
        text: "请求数据中...",
        background: "rgba(0, 0, 0, 0.3)"
      });
      // as unknown as postOrbitForecastSatelliteOverZoneBodyNew[]
      const reqFn = isPeriodSelect
        ? postOrbitForecastSatelliteOverZonePeriod
        : postOrbitForecastSatelliteOverZoneNew;
      reqFn(requestParams)
        .then(res => {
          // console.log("多边形-轨道信息", res);
          handleOrbit(res, zone);
        })
        .finally(() => {
          loadingInstance.close();
        });
    } else if (local.value.type == "circle") {
      if (!local.value.center.wkt || !local.value.radius) {
        proxy.$message({
          message: "没有有效的空间区域，请检查",
          type: "warning"
        });
        return;
      }
      // 选择圆形
      // console.log("圆选择", local.value.center);
      zone.centerLon = local.value.center.wkt
        ?.split("(")[1]
        ?.split(")")[0]
        ?.split(" ")[0];
      zone.centerLat = local.value.center.wkt
        ?.split("(")[1]
        ?.split(")")[0]
        ?.split(" ")[1];
      zone.radiusKm = local.value.radius / 1000;
      zone.segments = 32;
      // console.log("zone", zone);
      // 飞行到指定区域
      flyToSelectedArea(zone, local);
      // queryParamsArr.forEach(item => {
      //   item.centerLon = zone.centerLon;
      //   item.centerLat = zone.centerLat;
      //   item.radiusKm = zone.radiusKm;
      //   item.segments = zone.segments;
      // });
      const requestParams = {
        startTime,
        endTime,
        ...zone,
        orbitForecastSpecs: queryParamsArr,
        ...(isPeriodSelect ? { periodStartTime, periodEndTime } : {})
      };
      const loadingInstance = proxy.$loading({
        text: "请求数据中...",
        background: "rgba(0, 0, 0, 0.3)"
      });
      const reqFn = isPeriodSelect
        ? postOrbitForecastSatelliteOverCircleZonePeriod
        : postOrbitForecastSatelliteOverCircleZoneNew;
      reqFn(
        // queryParamsArr as unknown as postOrbitForecastSatelliteOverCircleZoneBodyNew[]
        requestParams as unknown as postOrbitForecastSatelliteOverCircleZoneBodyNew
      )
        .then(res => {
          // console.log("圆-轨道信息", res);
          handleOrbit(res, zone);
        })
        .finally(() => {
          loadingInstance.close();
        });
    }
  }
};

const isCycleSelect = ref(false);
const cycleTimeRange = ref([]);
/**
 * @description 处理轨道数据
 * @return {void} 获取右侧数据
 */
const handleOrbit = (res, zone) => {
  if (Array.isArray(res.rows)) {
    // 过滤出zoneDetectResult.length不为0的数据，为过境卫星
    // const passSatellites = res.rows.filter(
    //   item => item.zoneDetectResult.length > 0
    // );
    // console.log("过境卫星", passSatellites);
    // 格式化数据
    // let tableData: IRightTableData[] = [];
    // for (const item of passSatellites) {
    //   item.zoneDetectResult.forEach((zoneItem, index) => {
    //     tableData.push({
    //       ...zoneItem,
    //       satelliteId: item.satelliteId,
    //       uuid: buildUUID(),
    //       isPlaying: false,
    //       sideAngle: 0,
    //       defaultIndex: index + 1
    //     });
    //   });
    // }
    // setRightTableData(tableData, zone);
    const tablesData = res.rows.map((e, index) => {
      return {
        ...e,
        isPlaying: false,
        uuid: buildUUID(),
        sideAngle: 0,
        // 侧摆角slider绑定值
        sideAngleSliderValue: 0,
        defaultIndex: index + 1,
        // 是否展示对应的过境区域
        isShowPolygon: true,
        // popover是否展示
        sideAnglePopoverVisible: false,
        // 0度时的过境点数据,后续需要传入侧摆角接口，侧摆角相对于0度偏移
        forecastStateDtosInZero: JSON.parse(JSON.stringify(e.forecastStateDtos))
      };
    });
    // debugger;
    setRightTableData(tablesData, zone);
    // console.log("rightTable", rightTableData.value);
  }
};

/**
 * @description 初始默认视角
 */
const initView = () => {
  viewer.camera.setView({
    destination: new Cesium.Cartesian3(
      -8605259.187622875,
      26216966.759737648,
      21171015.857726883
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0
    }
  });
};

/**
 * @description 设置默认选择的卫星
 */
const setDefaultSelectSatellite = () => {
  // 默认选中第一个系列下面的全部卫星
  if (satelliteList.value.length > 0) {
    nextTick(() => {
      if (satelliteTreeRef.value) {
        const selectParentNode = getDefaultSatellite(satelliteList.value);
        const checkIds = [];
        const getIds = (arr: getSatelliteTreeResponse[]) => {
          arr.forEach(item => {
            // 父级，子级的id都需要收集
            checkIds.push(item.id);
            if (item.children && item.children.length > 0) {
              getIds(item.children);
            }
          });
        };
        getIds(selectParentNode);
        // console.log("checkIds", checkIds);
        satelliteTreeRef.value.setCheckedKeys(checkIds);
      }
    });
  }
};

onMounted(async () => {
  const mapViewer = tdMap.getViewer();
  // console.log("satelliteOrbit viewer", mapViewer);
  viewer = mapViewer;
  // @ts-ignore
  window.viewer = viewer;
  initView();
  await getSateDict();
  await getSateTreeList();
  // console.log("satelliteList", satelliteList.value);
  setDefaultSelectSatellite();
  handleClickZoneShowTooltip();
});

/**
 * @description 本地空间选择清除（地图绘制清除等）：清空过境多边形、扫描层与右侧表格
 */
const onLocalSelSpatialClear = () => {
  clearAll();
  setRightTableData([], null);
};

onBeforeUnmount(() => {
  clearAboutOrbit();
  setAllOrbitShow(false);
  bus.emit("resetLocalType");
  // @ts-ignore
  // window.viewer = null;
});
</script>

<template>
  <div class="satellite-orbit">
    <div class="content-container">
      <!-- 左侧面板 -->
      <div class="left-container">
        <div class="top-box">
          <div class="header">卫星系列</div>
          <div class="left-content">
            <div class="satellite-box">
              <el-tree
                ref="satelliteTreeRef"
                style="max-width: 600px"
                :props="defaultProps"
                show-checkbox
                :data="satelliteList"
                node-key="id"
                default-expand-all
                check-on-click-node
                @check="
                  (currentNode, checkObj) =>
                    handleSateCheck(currentNode, checkObj, satelliteTreeRef)
                "
              >
                <template #default="row">
                  <span :title="row.data?.data?.satelliteName ?? ''">{{
                    row.data.name
                  }}</span>
                </template>
              </el-tree>
            </div>
            <div class="time-box">
              <div class="sub-title">预测时间</div>
              <div class="btn-box">
                <div
                  v-for="item in timeSelectBtns"
                  :key="item.value"
                  :class="
                    currentSelectTimeType == item.value
                      ? ['active', 'btn']
                      : 'btn'
                  "
                  @click="changeTimeSelectType(item.value)"
                >
                  {{ item.label }}
                </div>
              </div>
              <div class="select-box">
                <div v-show="currentSelectTimeType == 'year'" class="year-box">
                  <div class="start-year">
                    <el-date-picker
                      v-model="queryParams.yearRange[0]"
                      type="year"
                      range-separator="至"
                      placeholder="开始年份"
                    />
                  </div>
                  <span>至</span>
                  <div class="end-year">
                    <el-date-picker
                      v-model="queryParams.yearRange[1]"
                      type="year"
                      range-separator="至"
                      placeholder="结束年份"
                    />
                  </div>
                </div>
                <div v-show="currentSelectTimeType == 'month'">
                  <el-date-picker
                    v-model="queryParams.monthRange"
                    type="monthrange"
                    range-separator="至"
                    start-placeholder="开始月份"
                    end-placeholder="结束月份"
                  />
                </div>
                <div v-show="currentSelectTimeType == 'date'">
                  <el-date-picker
                    v-model="queryParams.dateRange"
                    type="datetimerange"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    range-separator="至"
                    start-placeholder="开始日期时间"
                    end-placeholder="结束日期时间"
                  />
                  <div class="cycle-select-row flex items-center">
                    <span>每日选择时间段:</span>
                    <el-radio-group v-model="isCycleSelect">
                      <el-radio :value="true" size="large">是</el-radio>
                      <el-radio :value="false" size="large">否</el-radio>
                    </el-radio-group>
                  </div>
                  <el-time-picker
                    v-if="isCycleSelect"
                    v-model="queryParams.cycleTimeRange"
                    is-range
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                  />
                </div>
              </div>
            </div>
            <div class="locale-box">
              <div class="sub-title">空间查询</div>
              <LocalSel
                ref="localSelRef"
                :landIsPolygon="true"
                :lnglatShowPolygon="true"
                :isPolygonNotIntersect="true"
                @spatial-clear="onLocalSelSpatialClear"
              />
            </div>
          </div>
        </div>
        <div class="bottom-box">
          <div class="predict-btn" @click="handlePredict">预测</div>
        </div>
      </div>
      <!-- 右侧面板 -->
      <div class="right-container">
        <div class="header">预测轨道列表</div>
        <div class="table-box">
          <el-table
            ref="refTable"
            :data="rightTableData"
            style="width: 100%"
            row-key="uuid"
            :highlight-current-row="true"
            @row-click="handleClickRow"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="25" align="center" />
            <el-table-column
              prop="defaultIndex"
              label="索引"
              align="center"
              width="38"
            />
            <el-table-column prop="playBtn" align="center" width="40">
              <template #default="scope">
                <div class="play-column">
                  <div class="play-box" @click="handlePlayPause(scope.row)">
                    <img
                      v-if="!scope.row?.isPlaying"
                      src="@/assets/common/play-btn.png"
                      alt=""
                    />
                    <img v-else src="@/assets/common/stop-btn.png" alt="" />
                  </div>
                </div>
              </template>
              <template #header="scope">
                <div v-if="scope.row?.isPlaying">停止</div>
                <div v-else>播放</div>
              </template>
            </el-table-column>

            <el-table-column
              prop="satelliteName"
              label="卫星名称"
              width="80"
              align="center"
            />
            <el-table-column prop="entryTime" label="入境时间" align="center" />
            <el-table-column prop="exitTime" label="出境时间" align="center" />
            <el-table-column prop="sideAngle" label="侧摆角" align="center">
              <template v-slot="scope">
                <el-popover
                  placement="bottom"
                  :width="400"
                  trigger="click"
                  :visible="scope.row.sideAnglePopoverVisible"
                >
                  <template #reference>
                    <el-button
                      @click.stop="handleShowSideAnglePopover(scope.row)"
                      >{{ scope.row.sideAngle }}°</el-button
                    >
                  </template>
                  <el-row justify="space-evenly">
                    <el-col :span="18">
                      <el-slider
                        v-model="scope.row.sideAngleSliderValue"
                        :min="-30"
                        :max="30"
                        :step="0.1"
                      />
                    </el-col>
                    <el-col :span="4">
                      <el-button
                        round
                        type="primary"
                        @click="handleSideAngle(scope.row)"
                        >确定</el-button
                      >
                    </el-col>
                  </el-row>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column prop="option" label="操作" align="center">
              <template v-slot="scope">
                <div
                  class="option-column"
                  @click="handleShowPolygon(scope.row)"
                >
                  <View v-if="scope.row?.isShowPolygon" class="btn" />
                  <Hide v-else class="btn" />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div
          v-if="rightTableData.length > 0"
          class="output-box"
          @click="handleExport()"
        >
          <div class="output">导出轨道</div>
        </div>
      </div>
    </div>
    <Map />
  </div>
</template>

<style lang="scss" scoped>
.satellite-orbit {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;

  .content-container {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .left-container,
    .right-container {
      position: absolute;
      width: 420px;
      height: calc(100% - 40px);
      margin: 20px;
      color: #5f85c6;
      pointer-events: auto;
      background: linear-gradient(360deg, #fff 0%, #fff 100%);
      border: 1px solid;
      border-radius: 6px;
      border-image: linear-gradient(
          360deg,
          rgb(145 195 255 / 100%),
          rgb(145 195 255 / 0%)
        )
        1 1;
    }

    .left-container {
      display: flex;
      flex-direction: column;

      .top-box {
        width: 100%;
        height: calc(100% - 60px);

        .header {
          height: 44px;
          padding-left: 39px;
          font-family: "Source Han Sans SC", sans-serif;
          font-size: 20px;
          font-weight: 400;
          line-height: 44px;
          color: #fff;
          background-image: url("@/assets/common/header-bg.png");
          background-size: 100% 100%;
          border-radius: 4px;
        }

        .left-content {
          height: calc(100% - 44px);

          /* 保留滚动功能 */
          -ms-overflow-style: none; /* 对于IE和Edge */
          scrollbar-width: none; /* 隐藏Firefox滚动条 */
          overflow-y: scroll; /* 启用垂直滚动 */

          /* 隐藏滚动条轨道 */
          &::-webkit-scrollbar {
            display: none; /* 对于WebKit浏览器隐藏滚动条 */
          }

          .satellite-box {
            width: calc(100% - 40px);
            height: 340px;
            margin: 20px;
            overflow-y: scroll;
            background: rgb(236 247 255 / 80%);
            border: 1px solid #91c3ff;
            border-radius: 6px;

            :deep(.el-tree) {
              --el-tree-node-active-bg-color: #0badff;

              color: #537daf;
              background-color: transparent;
            }

            :deep(.el-checkbox__inner) {
              border: 1px solid #537daf;
            }
          }

          .time-box {
            width: calc(100% - 40px);
            margin: 0 20px 20px;

            .sub-title {
              height: 26px;
              margin-bottom: 10px;
              font-family: "Source Han Sans SC", sans-serif;
              font-size: 18px;
              font-weight: 400;
              color: #3c3c3c;

              &::before {
                display: inline-block;
                width: 4px;
                height: 12px;
                margin-right: 5px;
                content: "";
                background: #0080ff;
                border-radius: 10px;
              }
            }

            .btn-box {
              display: flex;
              width: 100%;
              height: 40px;
              color: white;
              cursor: pointer;
              background: #a7d7ff;
              border-radius: 50px;

              .btn {
                width: 33.3%;
                height: 40px;
                font-family: "Source Han Sans SC", sans-serif;
                font-size: 16px;
                font-weight: 500;
                line-height: 40px;
                color: #478fc4;
                text-align: center;
              }

              .active {
                height: 40px;
                color: #0093ff;
                background: linear-gradient(
                  180deg,
                  rgb(228 242 255 / 20%) 0%,
                  #e4f2ff 100%
                );
                border-radius: 34px;
              }
            }

            .select-box {
              margin: 10px 0 20px;

              :deep(.el-input__wrapper) {
                width: 100%;
                background: rgb(236 247 255 / 80%);
                border: 1px solid #91c3ff;
                border-radius: 6px;
              }

              :deep(.el-range-separator),
              :deep(.el-range-input) {
                color: #537daf;
              }

              .year-box {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                background: rgb(236 247 255 / 80%);
                border: 1px solid #91c3ff;
                border-radius: 6px;
                box-shadow: 0 0 0 1px
                  var(--el-input-border-color, var(--el-border-color)) inset;

                :deep(.el-date-editor.el-input) {
                  width: 100%;
                }

                :deep(.el-input__wrapper) {
                  text-align: center;
                  background-color: transparent;
                  border: none;
                  box-shadow: none;

                  .el-input__inner {
                    text-align: center;
                  }
                }

                .start-year,
                .end-year {
                  width: calc(50% - 10px);
                }

                .end-year {
                  :deep(.el-input__prefix) {
                    display: none !important;
                  }
                }

                span {
                  width: 20px;
                  font-size: 14px;
                  color: #537daf;
                  text-align: center;
                }
              }

              .cycle-select-row {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                margin-top: 8px;
                color: #537daf;

                :deep(.el-radio-group) {
                  margin-left: 10px;
                }
              }
            }
          }

          .locale-box {
            width: calc(100% - 40px);
            margin: 0 20px 20px;

            .sub-title {
              height: 26px;
              margin-bottom: 10px;
              font-family: "Source Han Sans SC", sans-serif;
              font-size: 18px;
              font-weight: 400;
              color: #3c3c3c;

              &::before {
                display: inline-block;
                width: 4px;
                height: 12px;
                margin-right: 5px;
                content: "";
                background: #0080ff;
                border-radius: 10px;
              }
            }
          }
        }
      }

      .bottom-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 60px;
        background: rgb(0 136 255 / 15%);

        .predict-btn {
          width: 341px;
          height: 40px;
          font-family: "Source Han Sans SC", sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 40px;
          color: #fff;
          text-align: center;
          cursor: pointer;
          background: #0badff;
          border: 1px solid;
          border-radius: 39px;
          border-image: linear-gradient(
              180deg,
              rgb(255 255 255 / 0%),
              rgb(255 255 255 / 50%)
            )
            1 1;
          box-shadow: 1px 1 4px 0 rgb(0 0 0 / 15%);

          &:hover {
            background: rgb(11 173 255 / 80%);
          }
        }
      }
    }

    .right-container {
      right: 0;
      pointer-events: auto;

      .header {
        height: 44px;
        padding-left: 39px;
        font-family: "Source Han Sans SC", sans-serif;
        font-size: 20px;
        font-weight: 400;
        line-height: 44px;
        color: #fff;
        background-image: url("@/assets/common/header-bg.png");
        background-size: 100% 100%;
        border-radius: 4px;
      }

      .table-box {
        width: calc(100% - 40px);
        height: calc(100% - 44px - 80px - 20px);
        margin: 20px 20px 0;

        :deep(.el-scrollbar__thumb) {
          background-color: #000;
          opacity: 1;
        }

        :deep(.el-table) {
          --el-table-header-bg-color: #d2eaff;
          --el-table-current-row-bg-color: #96cced;

          height: 100%;

          tr {
            margin-top: 5px;
            background: linear-gradient(
              90deg,
              #c7e6ff 0%,
              rgb(199 230 255 / 0%) 100%
            );
          }

          .cell {
            padding: 0 2px;
          }
        }

        :deep(.el-table__inner-wrapper) {
          // header height 39px;
          max-height: 100%;
        }

        .option-column {
          display: flex;
          justify-content: center;

          .btn {
            width: 20px;
            height: 20px;
            cursor: pointer;
          }
        }

        .play-column {
          display: flex;
          align-items: center;
          justify-content: center;

          .play-box {
            width: 30px;
            height: 30px;
            overflow: hidden;
            border-radius: 30px;

            img {
              width: 30px;
              height: 30px;
              cursor: pointer;
            }
          }
        }
      }

      .output-box {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        height: 80px;
        margin: 0 20px;

        .output {
          width: 97px;
          height: 40px;
          font-family: "Source Han Sans SC", sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 40px;
          color: #fff;
          text-align: center;
          cursor: pointer;
          background-image: url("@/assets/common/btn-icon.png");
          background-size: 100% 100%;
        }
      }
    }
  }
}
</style>
