import { getCurrentInstance, ref, reactive } from "vue";
import { getSatelliteInfoDict, getSatelliteTree } from "@/api/satelliteOrbit";
import dayjs from "dayjs";
// import type { Viewer } from "cesium";
import { OrbitLayer } from "../utils/OrbitLayer";
import type {
  getSatelliteTleListResponse,
  getSatelliteTreeResponse,
  IGetSatelliteTreeResponseData
} from "@/api/satelliteOrbit/types";
import { postSatelliteTleList } from "@/api/satelliteOrbit";
import * as Cesium from "cesium";

export const useLeftHook = () => {
  const { proxy } = getCurrentInstance();
  // 轨道图层实例
  let orbitInstanceArr: OrbitLayer[] = [];
  // 时间筛选按钮
  const timeSelectBtns = [
    { label: "年份选择", value: "year" },
    { label: "月份选择", value: "month" },
    { label: "日期选择", value: "date" }
  ];
  // 当前选择的时间类型
  const currentSelectTimeType = ref("date");
  // 查询参数
  const queryParams = reactive({
    yearRange: [],
    monthRange: [],
    // 设置为最近五天
    dateRange: [
      dayjs().subtract(5, "day").format("YYYY-MM-DD HH:mm:ss"),
      dayjs().format("YYYY-MM-DD HH:mm:ss")
    ],
    cycleTimeRange: []
  });
  // tree默认参数
  const defaultProps = {
    children: "children",
    label: "name"
  };
  // 卫星列表
  const satelliteList = ref([]);
  // 卫星字典
  const satelliteDict = ref([]);

  /**
   * @description 获取默认显示的卫星
   * @param {getSatelliteTreeResponse[]} treeArr 卫星树数组
   * @returns {getSatelliteTreeResponse[]} 默认显示的卫星数组
   */
  const getDefaultSatellite = (
    treeArr: getSatelliteTreeResponse[]
  ): getSatelliteTreeResponse[] => {
    if (treeArr.length && treeArr[0].children) {
      if (treeArr[0].children.length > 0) {
        return [treeArr[0].children[0]];
      } else {
        return [treeArr[0]];
      }
    }
    return [];
  };

  /**
   * @description 获取卫星树
   */
  const getSateTreeList = async () => {
    return new Promise((resolve, reject) => {
      const loadingInstance = proxy.$loading({
        text: "loading...",
        target: ".satellite-box",
        background: "rgba(0, 0, 0, 0.3)"
      });
      getSatelliteTree()
        .then(res => {
          if (Array.isArray(res.data)) {
            satelliteList.value = res.data;
            // 在树加载完成之后加兹安默认轨道
            const defaultSatellite = getDefaultSatellite(res.data);
            handleLoadAllOrbit(defaultSatellite);
            resolve(res.data);
          }
        })
        .catch(err => {
          reject(err);
        })
        .finally(() => {
          loadingInstance.close();
        });
    });
  };

  /**
   * @description 切换时间筛选类型
   * @param {string} type 时间筛选类型
   */
  const changeTimeSelectType = type => {
    if (currentSelectTimeType.value == type) return;
    currentSelectTimeType.value = type;
    const defaultTimesObj = {
      yearRange: [],
      monthRange: [],
      // 设置为最近五天
      dateRange: [
        dayjs().subtract(5, "day").format("YYYY-MM-DD HH:mm:ss"),
        dayjs().format("YYYY-MM-DD HH:mm:ss")
      ],
      cycleTimeRange: []
    };
    Object.assign(queryParams, defaultTimesObj);
  };

  /**
   * @description 卫星字典
   */
  const getSateDict = async () => {
    const res = await getSatelliteInfoDict();
    if (Array.isArray(res.rows)) {
      satelliteDict.value = res.rows;
    }
  };

  /**
   * @description 从树中获取选中节点的sateId
   * @param treeArr 树节点数组
   * @returns 选中节点的sateId数组
   */
  const getSateIdsFromTree = (treeArr: getSatelliteTreeResponse[]) => {
    let sateIds: number[] = [];
    let sateData: IGetSatelliteTreeResponseData[] = [];
    const getSateIds = arr => {
      arr.forEach(e => {
        if (Array.isArray(e.children) && e.children.length > 0) {
          getSateIds(e.children);
        } else {
          if (e.data?.id) {
            // 只收集子级id
            sateIds.push(e.data.id);
            sateData.push(e.data);
          }
        }
      });
    };
    getSateIds(treeArr);
    sateIds = [...new Set(sateIds)];
    let copySateData = [];
    sateData.forEach(e => {
      if (copySateData.findIndex(item => item.id == e.id) == -1) {
        copySateData.push(e);
      }
    });
    return { sateIds, copySateData };
  };

  /**
   * @description 默认加载第一个系列下面的全部卫星，如果全量加载太多了容易卡顿
   */
  const handleLoadAllOrbit = (satelliteList: getSatelliteTreeResponse[]) => {
    console.log("satelliteList", satelliteList);
    // 获取所有的sateId;
    const sateIdsObj = getSateIdsFromTree(satelliteList);
    if (sateIdsObj.sateIds.length > 0) {
      postSatelliteTleList(sateIdsObj.sateIds).then(res => {
        console.log("卫星轨道全部数据", res);
        if (Array.isArray(res.rows)) {
          // allOrbitList.value = res.rows;
          res.rows.forEach(item => {
            // @ts-ignore
            showSatellite(item.satelliteInfoId, item);
          });
        }
      });
    }
  };

  /**
   * @description 切换当前选中的卫星
   * @param {getSatelliteTreeResponse} currentNode 当前选中的卫星
   * @param {object} checkObj 复选框状态对象 heckedNodes、checkedKeys、halfCheckedNodes、halfCheckedKeys
   */
  const handleSateCheck = (
    currentNode: getSatelliteTreeResponse,
    checkObj: {
      checkedNodes: getSatelliteTreeResponse[];
      checkedKeys: string[];
      halfCheckedNodes: getSatelliteTreeResponse[];
      halfCheckedKeys: string[];
    },
    satelliteTreeRef: any
  ) => {
    console.log("currentNode", currentNode);
    console.log("checkObj.checkedNodes", checkObj.checkedNodes);
    // 切换卫星的复选框时切换卫星轨道的显示和隐藏
    setAllOrbitShow(false);
    if (checkObj.checkedNodes.length) {
      const sateIdsObj = getSateIdsFromTree(checkObj.checkedNodes);
      if (sateIdsObj.sateIds.length > 0) {
        postSatelliteTleList(sateIdsObj.sateIds).then(res => {
          console.log("当前选择的卫星轨道数据", res);
          if (Array.isArray(res.rows)) {
            res.rows.forEach(item => {
              const errorSateId = showSatellite(item.satelliteInfoId, item);
              if (errorSateId) {
                checkObj.checkedNodes.forEach(cn => {
                  if (
                    cn.data &&
                    cn.data.id == errorSateId &&
                    satelliteTreeRef
                  ) {
                    // 找到错误的节点
                    satelliteTreeRef.setChecked(cn.id, false);
                    return cn;
                  }
                });
              }
            });
          }
        });
      }
    }
  };

  /**
   * @description 设置当前全部的卫星显示或者隐藏
   * @param {boolean} show 是否显示
   */
  const setAllOrbitShow = (show: boolean) => {
    orbitInstanceArr.forEach(instance => {
      instance.show = show;
    });
  };

  /**
   * @description 显示卫星
   */
  const showSatellite = (
    satelliteInfoId: number,
    sateInfo?: getSatelliteTleListResponse
  ) => {
    const orbitLayerInstance = orbitInstanceArr.find(
      instance => instance.getSatelliteInfoId == satelliteInfoId
    );
    if (orbitLayerInstance) {
      // 卫星已经被添加过
      orbitLayerInstance.show = true;
    } else {
      // 卫星未被添加过
      const satellite = satelliteDict.value.find(
        e => e.value == satelliteInfoId
      );
      if (satellite && sateInfo) {
        // 加载轨道图层
        const orInstance = new OrbitLayer({
          // 现在,这个开始时间和结束时间应该需要修改为每个卫星不一样
          startTime: new Date(),
          // 24小时后
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          stepSeconds: 10,
          name: satellite.label || satelliteInfoId,
          satelliteInfoId: satelliteInfoId,
          tle1: sateInfo.tleLine1,
          tle2: sateInfo.tleLine2,
          clothWidth: 50000, // 这个参数只有在加载扫描图层的时候用到
          showPath: true,
          // @ts-ignore
          viewer: window.viewer
          // cylinderShow: true,
          // forecastStateDtos: [
          //   {
          //     lon: 113.16061698132901,
          //     lat: 23.281932769714146,
          //     altitude: 461744.47335894784,
          //     geomJson: null,
          //     // 这个时间太短了，容易还没看到就没有了
          //     forecastStamp: "2025-10-25 15:35:02"
          //   },
          //   {
          //     lon: 113.11267000613216,
          //     lat: 23.501005519228727,
          //     altitude: 461760.0777676012,
          //     geomJson: null,
          //     forecastStamp: "2025-10-25 15:35:12"
          //   }
          // ]
        });
        if (!orInstance.getOrbitEntity) {
          // 卫星数据解析失败
          proxy.$message.error(
            `${satellite.label}数据解析失败,无法加载${satellite.label}的轨道`
          );
          return satelliteInfoId;
        }
        orbitInstanceArr.push(orInstance);
        // orbitLayerInstance.createHirarchyEntity();
      }
    }
  };

  /**
   * @param positionObj 中心位置对象
   * @param local 选择的区域信息
   * @description 飞行到选中的区域
   */
  const flyToSelectedArea = (positionObj: any, local: any) => {
    if (
      local.value.type == "rectangle" ||
      local.value.type == "polygon" ||
      local.value.type == "lngLat"
    ) {
      // 提取坐标
      const arr = positionObj.coordinates[0][0];
      const minX = Math.min(...arr.map(item => item[0]));
      const minY = Math.min(...arr.map(item => item[1]));
      const maxX = Math.max(...arr.map(item => item[0]));
      const maxY = Math.max(...arr.map(item => item[1]));

      // 创建Cesium矩形对象
      const rectangle = Cesium.Rectangle.fromDegrees(minX, minY, maxX, maxY);

      // 使用Cesium内置方法计算合适的视图参数
      // 使用Camera.computeViewRectangle可以获取更准确的视角
      window.viewer?.camera.flyTo({
        destination: rectangle,
        duration: 1.0,
        // 设置俯视视角
        orientation: {
          // 方位角：0度表示正北，顺时针旋转
          heading: Cesium.Math.toRadians(0),
          // 俯仰角：-90度表示完全俯视，0度表示水平视角
          pitch: Cesium.Math.toRadians(-90),
          // 横滚角：通常设为0
          roll: 0.0
        }
      });
    } else if (local.value.type == "circle") {
      const { centerLat, centerLon, radiusKm } = positionObj;
      const radius = parseFloat(radiusKm) * 1000 || 1000;
      const longitude = parseFloat(centerLon);
      const latitude = parseFloat(centerLat);
      const circlePositions = calculateCirclePoints(
        longitude,
        latitude,
        radius,
        32
      );
      console.log("circlePositions", circlePositions);
      // 取出circlePosition中的经纬度的最大值和最小值
      const minX = Math.min(...circlePositions.map(item => item[0]));
      const minY = Math.min(...circlePositions.map(item => item[1]));
      const maxX = Math.max(...circlePositions.map(item => item[0]));
      const maxY = Math.max(...circlePositions.map(item => item[1]));

      // 创建Cesium矩形对象
      const rectangle = Cesium.Rectangle.fromDegrees(minX, minY, maxX, maxY);
      // 使用Cesium内置方法计算合适的视图参数
      // 使用Camera.computeViewRectangle可以获取更准确的视角
      window.viewer?.camera.flyTo({
        destination: rectangle,
        duration: 1.0,
        // 设置额外的边距，确保完整显示区域
        orientation: {
          heading: Cesium.Math.toRadians(0),
          // range: 0 // 使用自动计算的范围
          pitch: Cesium.Math.toRadians(-90)
        }
      });
    }
  };

  /**
   * 在Cesium中计算圆上均匀分布的点
   * @param centerLon 圆心经度
   * @param centerLat 圆心纬度
   * @param radiusMeters 圆半径（米）
   * @param numPoints 点的数量
   * @returns 圆上点的经纬度数组 [[lon, lat], ...]
   */
  function calculateCirclePoints(
    centerLon: number,
    centerLat: number,
    radiusMeters: number,
    numPoints: number
  ): number[][] {
    // 地球半径（米）- WGS84参考椭球
    const earthRadius = 6371000;
    // 转换圆心为弧度
    const centerLonRad = Cesium.Math.toRadians(centerLon);
    const centerLatRad = Cesium.Math.toRadians(centerLat);
    // 计算角度步长（弧度制）
    const angleStep = (2 * Math.PI) / numPoints;
    // 存储结果的数组
    const circlePoints: number[][] = [];
    // 计算圆上每个点
    for (let i = 0; i < numPoints; i++) {
      // 弧度制
      const angle = i * angleStep;
      // 计算球面坐标系中的偏移
      // 这里使用Haversine公式的思路，但进行简化处理
      const angularDistance = radiusMeters / earthRadius; // 角度距离（弧度）
      // 根据球面余弦定理计算新点的纬度
      // 根据球面正弦定理计算新点的经度
      // 计算新点的纬度
      const latRad = Math.asin(
        Math.sin(centerLatRad) * Math.cos(angularDistance) +
          Math.cos(centerLatRad) * Math.sin(angularDistance) * Math.cos(angle)
      );
      // 计算新点的经度
      const lonRad =
        centerLonRad +
        Math.atan2(
          Math.sin(angle) * Math.sin(angularDistance) * Math.cos(centerLatRad),
          Math.cos(angularDistance) - Math.sin(centerLatRad) * Math.sin(latRad)
        );
      // 转换回度数并添加到结果数组（转换为角度值）
      const lon = Cesium.Math.toDegrees(lonRad);
      const lat = Cesium.Math.toDegrees(latRad);
      circlePoints.push([lon, lat]);
    }
    // 确保闭合（第一个点和最后一个点相同）
    circlePoints.push(circlePoints[0]);
    return circlePoints;
  }

  return {
    getSateTreeList,
    changeTimeSelectType,
    timeSelectBtns,
    currentSelectTimeType,
    queryParams,
    defaultProps,
    satelliteList,
    getSateDict,
    satelliteDict,
    handleLoadAllOrbit,
    handleSateCheck,
    getSateIdsFromTree,
    setAllOrbitShow,
    showSatellite,
    getDefaultSatellite,
    flyToSelectedArea
  };
};
