import { ref, nextTick, getCurrentInstance } from "vue";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import Tooltip from "../utils/Tooltip";
import { getPublicPath } from "../utils";
import {
  postOrbitForecastResultForSideAngle,
  exportSatelliteOrbit,
  postOrbitForecastResultForSideAngleCircle
} from "@/api/satelliteOrbit";
import type { postOrbitForecastSatelliteOverZoneNewResponse } from "@/api/satelliteOrbit/types";
import { OrbitLayer } from "../utils/OrbitLayer";
import { downloadByData } from "@pureadmin/utils";
import dayjs from "dayjs";
import * as Ceisum from "cesium";
import type { BaseResult } from "@/api/api";

export type IRightTableData = {
  uuid: string; // 唯一id,
  defaultIndex: number; // 默认索引
  isPlaying: boolean;
  sideAngle: number;
  // 是否展示对应的过境区域
  isShowPolygon: boolean;
  // popover是否展示
  sideAnglePopoverVisible: boolean;
  // 侧摆角slider绑定值
  sideAngleSliderValue: number;
  // 0度时的过境点数据,后续需要传入侧摆角接口，侧摆角相对于0度偏移
  forecastStateDtosInZero: postOrbitForecastSatelliteOverZoneNewResponse["forecastStateDtos"];
};

export type IRightItem = IRightTableData &
  postOrbitForecastSatelliteOverZoneNewResponse;

export const useRightHook = () => {
  // 右侧表格数据
  const rightTableData = ref([]);
  // 扫描图层实例
  let scanLayerInstance = null;
  // polygon数组
  const polygonEntityArr = ref([]);
  // leftClickHandler 左键处理事件
  let leftClickHandler = null;
  // 卫星弹窗tooltip实例数组
  let tooltipInstance = null;
  // 默认最小侧摆角
  const defaultMinSideAngle = -30;
  // 默认最大侧摆角
  const defaultMaxSideAngle = 30;
  // table选中行数据
  const tableSelectedRows = ref([]);
  // TableRef
  const refTable = ref(null);
  // 当前用户选择的区域
  let currentUserSelectZoneStr = null;

  const { proxy } = getCurrentInstance();

  /**
   * @description 设置右侧表格数据
   * @param data 右侧表格数据
   * @param zone 用户选择的区域
   */
  const setRightTableData = (
    data: (postOrbitForecastSatelliteOverZoneNewResponse & IRightTableData)[],
    zone
  ) => {
    console.log("zone", zone);
    currentUserSelectZoneStr = zone ? JSON.stringify(zone) : null;
    rightTableData.value = data;
    // 加载完成右侧面板数据之后，加载所有的过境区域
    nextTick(() => {
      // 前端计算(为保持扫描画幅宽度和轨迹宽度一致，先使用前段计算的版本)
      handleLoadAllZone(zone);

      // 后端计算
      // loadZones();
    });
  };

  // /**
  //  * @description 加载全部的区域
  //  */
  // const loadZones = () => {
  //   console.log("rightTables", rightTableData.value);
  //   clearAll();
  //   rightTableData.value.forEach(rightItem => {
  //     handleAddOnePolygon(rightItem);
  //   });
  // };

  // /**
  //  * @description 处理添加一个过境区域
  //  * @param rightItem 右侧表格数据行
  //  */
  // const handleAddOnePolygon = (rightItem: IRightItem) => {
  //   if (rightItem.geomJson) {
  //     const geomJson = JSON.parse(rightItem.geomJson);
  //     // "{"type":"Polygon","coordinates":[[[107.2936506949,30.4043755647],[107.2260904978,30.4246062065],[107.8301552621,32.4418795517],[107.9194154662,32.4418795517],[107.9321621371,32.4380626099],[107.3231823532,30.4043755647],[107.2936506949,30.4043755647]]]}"
  //     if (geomJson.coordinates && Array.isArray(geomJson.coordinates)) {
  //       if (Array.isArray(geomJson.coordinates[0])) {
  //         let coordinates = geomJson.coordinates[0];
  //         if (geomJson.type == "Polygon" && coordinates.length > 0) {
  //           coordinates = coordinates.map(coord =>
  //             Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
  //           );
  //           const polygon = window.viewer.entities.add({
  //             name: rightItem.uuid,
  //             polygon: {
  //               hierarchy: new Cesium.PolygonHierarchy(coordinates),
  //               material: new Cesium.ColorMaterialProperty(
  //                 // new Cesium.Color(0.2, 0.8, 0.2, 0.6) // 绿色半透明
  //                 Cesium.Color.YELLOW // 红色半透明
  //               ),
  //               zIndex: 1000
  //             },
  //             description: "过境区域",
  //             userData: {
  //               rightItem
  //             },
  //             zIndex: 1000
  //           });
  //           polygonEntityArr.value.push(polygon);
  //         }
  //         if (geomJson.type == "MultiPolygon") {
  //           // 处理MultiPolygon类型，遍历每个多边形
  //           geomJson.coordinates.forEach(
  //             (polygonGroup: number[][][], index: number) => {
  //               // MultiPolygon的coordinates结构是[[[[lng,lat],...]], [[[lng,lat],...]], ...]
  //               // 遍历每个多边形组
  //               polygonGroup.forEach((polygon: number[][]) => {
  //                 // 转换坐标为Cesium笛卡尔坐标
  //                 const polygonPositions = polygon.map(coord =>
  //                   Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
  //                 );
  //                 // 创建Cesium多边形实体
  //                 const multiPolygon = window.viewer.entities.add({
  //                   name: `${rightItem.uuid}_polygon_${index}`,
  //                   polygon: {
  //                     hierarchy: new Cesium.PolygonHierarchy(polygonPositions),
  //                     material: new Cesium.ColorMaterialProperty(
  //                       // new Cesium.Color(0.2, 0.8, 0.2, 0.6) // 绿色半透明
  //                       Cesium.Color.YELLOW // 红色半透明
  //                     ),
  //                     outline: true,
  //                     outlineColor: Cesium.Color.GREEN,
  //                     outlineWidth: 2,
  //                     zIndex: 1000
  //                   },
  //                   description: `过境区域_${index}`,
  //                   userData: {
  //                     rightItem
  //                   }
  //                 });
  //                 // 添加到多边形实体数组中
  //                 polygonEntityArr.value.push(multiPolygon);
  //               });
  //             }
  //           );
  //         }
  //       }
  //     }
  //   }
  // };

  /**
   * @description 加载全部的过境区域
   * @param userSelectZone 用户选择的区域
   * @param sateClothWidth 卫星的地面幅宽
   */
  const handleLoadAllZone = (userSelectZone: any) => {
    console.log("handleLoadAllZone", userSelectZone);
    // let sateClothWidth = 5000;
    console.log("加载全部的过境区域", rightTableData.value);
    polygonEntityArr.value = [];
    rightTableData.value.forEach(rightItem => {
      console.log("rightItem", rightItem);

      // 方案2： 采用走廊实体(使用走廊实体，后续无法判断走廊实体与用户选择的区域是否存在交集，除非将走廊进行边界线采样点，再将采样点组成Polygon)
      // 将经纬度转换为笛卡尔坐标
      // const positions = Cesium.Cartesian3.fromDegreesArray([
      //   rightItem.footprints[0][0],
      //   rightItem.footprints[0][1], // 点A
      //   rightItem.footprints[1][0],
      //   rightItem.footprints[1][1] // 点B
      // ]);
      // const corridor = window.viewer.entities.add({
      //   name: "AB方向带状面",
      //   corridor: {
      //     positions: positions, // 路径点（A和B）
      //     width: 5000, // 带宽5000米
      //     material: Cesium.Color.RED.withAlpha(0.9), // 半透明蓝色
      //     outline: true, // 显示边框
      //     outlineColor: Cesium.Color.BLACK,
      //     height: 0, // 贴地高度
      //     clampToGround: true // 贴合地面曲面
      //   }
      // });
      // console.log("corridor", corridor);
      // console.log("corridor.position", corridor.position);
      // let positionsArr = corridor.corridor.positions.getValue(
      //   Cesium.JulianDate.now()
      // );
      // positionArr 只能获取到中心线上的两个点，不能获取整个走廊区域的点
      // console.log("positionsArr", positionsArr);
      // window.viewer.zoomTo(corridor);

      // 方案1： 遍历过境区域，加载对应的区域
      // 通过卫星进入区域的起始点和卫星离开区域的结束点以及卫星的地面幅宽计算过境区域的矩形框
      // const sateZone = computedSateZone(rightItem.footprints, sateClothWidth);
      // console.log("sateZone", sateZone);
      // sateZone.push(JSON.parse(JSON.stringify(sateZone[0])));
      // const tempArr = sateZone.map(cart3 => {
      //   // 把cartesian3转化为经纬度
      //   const cartographic = Cesium.Cartographic.fromCartesian(cart3);
      //   return [
      //     Cesium.Math.toDegrees(cartographic.longitude),
      //     Cesium.Math.toDegrees(cartographic.latitude)
      //   ];
      // });
      // console.log("tempArr", [tempArr]);
      // let scanTurfPolygon = turf.polygon([tempArr]);
      // console.log("coordinates", coordinates);

      // 方案3：在中心线上采样点，然后计算边界点，在使用边界点组成Polygon
      handleLoadAllZoneWithCenterPoint(userSelectZone, rightItem);
    });
  };

  /**
   * 原型：圆形查询范围（与 GeoJSON Polygon 的 coordinates 二选一）
   * @example { centerLon, centerLat, radiusKm, segments?: 32 }
   */
  type UserSelectCircleZoneProto = {
    centerLon: string | number;
    centerLat: string | number;
    radiusKm: string | number;
    segments?: string | number;
  };

  const isUserSelectCircleZoneProto = (
    zone: any
  ): zone is UserSelectCircleZoneProto =>
    zone != null &&
    zone.centerLon != null &&
    zone.centerLat != null &&
    zone.radiusKm != null;

  /**
   * 将用户选择区转为 turf Polygon Feature：支持圆形参数或 GeoJSON coordinates
   */
  const userSelectZoneToTurfPolygon = (userSelectZone: any) => {
    if (isUserSelectCircleZoneProto(userSelectZone)) {
      const centerLon = Number(userSelectZone.centerLon);
      const centerLat = Number(userSelectZone.centerLat);
      const radiusKm = Number(userSelectZone.radiusKm);
      const segRaw =
        userSelectZone.segments != null ? Number(userSelectZone.segments) : 32;
      const steps = Math.max(
        3,
        Math.min(256, Number.isFinite(segRaw) ? Math.floor(segRaw) : 32)
      );
      if (
        !Number.isFinite(centerLon) ||
        !Number.isFinite(centerLat) ||
        !Number.isFinite(radiusKm) ||
        radiusKm <= 0
      ) {
        return null;
      }
      return turf.circle([centerLon, centerLat], radiusKm, {
        steps,
        units: "kilometers"
      });
    }
    const coordinates = userSelectZone?.coordinates;
    if (!coordinates) {
      return null;
    }
    const processedCoordinates = JSON.parse(JSON.stringify(coordinates));
    processedCoordinates[0][0].push(processedCoordinates[0][0][0]);
    return turf.polygon(processedCoordinates[0]);
  };

  /**
   * @description 方案3：在中心线上采样点，然后计算边界点，在使用边界点组成Polygon
   */
  const handleLoadAllZoneWithCenterPoint = (
    userSelectZone: any,
    rightItem: any
  ) => {
    const satePolygonPositions = computedWithCenterPoint(
      // rightItem.footprints,
      rightItem.forecastStateDtos,
      // sateClothWidth
      rightItem.clothWidth
    );
    console.log("satePolygonPositions", satePolygonPositions);

    satePolygonPositions.push(
      JSON.parse(JSON.stringify(satePolygonPositions[0]))
    );
    const tempArr = satePolygonPositions.map(cart3 => {
      // 把cartesian3转化为经纬度
      const cartographic = Cesium.Cartographic.fromCartesian(cart3);
      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ];
    });
    console.log("tempArr", [tempArr]);
    let scanTurfPolygon = turf.polygon([tempArr]);

    // 计算用户选择的区域（矩形/多边形 coordinates，或圆形 centerLon + centerLat + radiusKm）
    const selectedTurfPolygon = userSelectZoneToTurfPolygon(userSelectZone);
    if (!selectedTurfPolygon) {
      return;
    }
    console.log("scanTurfPolygon", scanTurfPolygon);
    console.log("selectedTurfPolygon", selectedTurfPolygon);

    // 计算两个多边形之间的交集
    let intersection = turf.intersect(
      turf.featureCollection([scanTurfPolygon, selectedTurfPolygon])
    );
    console.log("交集intersection", intersection);
    if (
      intersection &&
      intersection.geometry &&
      intersection.geometry.coordinates
    ) {
      try {
        // 解析GeoJSON坐标格式，转换为Cesium可用的笛卡尔坐标
        const geometry = intersection.geometry;
        let intersectionPositions = [];
        if (geometry.type === "Polygon") {
          // 处理Polygon类型
          // 获取外环坐标并转换为Cesium笛卡尔坐标
          const outerRing = geometry.coordinates[0];
          intersectionPositions = outerRing.map((coord: number[]) => {
            return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0);
          });
          // 创建Cesium多边形
          const intersectionEntity = window.viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(intersectionPositions),
              material: new Cesium.ColorMaterialProperty(
                // new Cesium.Color(0.2, 0.8, 0.2, 0.6) // 绿色半透明
                Cesium.Color.YELLOW // 红色半透明
              ),
              outline: true,
              outlineColor: Cesium.Color.GREEN,
              outlineWidth: 2,
              zIndex: 1000
            },
            description: "过境区域",
            // @ts-ignore
            userData: {
              rightItem
            }
          });
          console.log("交集区域已绘制在地图上", intersectionEntity);
          polygonEntityArr.value.push(intersectionEntity);

          return intersectionEntity;
        } else if (geometry.type === "MultiPolygon") {
          // 如果是MultiPolygon，需要处理多个多边形
          // 遍历每个多边形，绘制交集区域
          geometry.coordinates.forEach((polygon: number[][][]) => {
            const innerRing = polygon[0];
            intersectionPositions = innerRing.map((coord: number[]) => {
              return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0);
            });
            // 创建Cesium多边形
            const intersectionEntity = window.viewer.entities.add({
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(intersectionPositions),
                material: new Cesium.ColorMaterialProperty(
                  // new Cesium.Color(0.2, 0.8, 0.2, 0.6) // 绿色半透明
                  Cesium.Color.YELLOW // 红色半透明
                ),
                outline: true,
                outlineColor: Cesium.Color.GREEN,
                outlineWidth: 2,
                zIndex: 1000
              },
              // @ts-ignore
              userData: {
                rightItem
              }
            });
            console.log(
              "检测到MultiPolygon类型，需要特殊处理",
              intersectionEntity
            );
            polygonEntityArr.value.push(intersectionEntity);
          });
        }
      } catch (error) {
        console.error("绘制交集区域时出错:", error);
      }
    }
  };

  /**
   * @description 计算边界区域
   * @param footprints 卫星轨道路径
   * @param sateClothWidth 卫星地面画幅宽度
   * @return 卫星轨迹边界区域Cartesian3数组
   */
  const computedWithCenterPoint = (
    footprints: { lon: number; lat: number }[],
    sateClothWidth: number
  ) => {
    // 计算大圆路径采样点（使用EllipsoidGeodesic）
    // 初始化为 WGS84 标准的椭球实例
    const ellipsoid = Cesium.Ellipsoid.WGS84;

    // 从经纬度转化为Cartographic坐标
    // Cesium.Cartographic.fromDegrees根据以度为单位指定的经度和纬度创建新的制图实例。生成对象中的值将以弧度为单位。
    // const start = Cesium.Cartographic.fromDegrees(
    //   footprints[0][0],
    //   footprints[0][1]
    // );
    // const end = Cesium.Cartographic.fromDegrees(
    //   footprints[1][0],
    //   footprints[1][1]
    // );

    const start = Cesium.Cartographic.fromDegrees(
      footprints[0].lon,
      footprints[0].lat
    );
    const end = Cesium.Cartographic.fromDegrees(
      footprints[1].lon,
      footprints[1].lat
    );
    // Cesium.EllipsoidGeodesic初始化椭球体上连接两个提供的行星点的测地线。
    const geodesic = new Cesium.EllipsoidGeodesic(start, end);

    // 采样50个点
    const sampleCount = 100;
    const positions = [];
    for (let i = 0; i <= sampleCount; i++) {
      const fraction = i / sampleCount;
      // interpolateUsingFraction提供沿测地线指示部分的点的位置。
      const cartographic = geodesic.interpolateUsingFraction(fraction);
      // 转为Cartesian3坐标
      const position = ellipsoid.cartographicToCartesian(cartographic);
      positions.push(position);
    }

    // 计算两侧偏移点（宽度5000米，每侧2500米）
    const leftPositions = [];
    const rightPositions = [];
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];

      try {
        // 获取当前点的东-北-上坐标系（用于计算垂直方向）
        const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

        // 计算路径方向向量（切向量）
        let pathDirection = new Cesium.Cartesian3();

        // 如果不是最后一个点，使用下一个点计算方向
        if (i < positions.length - 1) {
          const nextPosition = positions[i + 1];
          Cesium.Cartesian3.subtract(nextPosition, position, pathDirection);
        }
        // 如果是最后一个点或方向向量为零，使用前一个点计算方向
        else if (i > 0) {
          const prevPosition = positions[i - 1];
          Cesium.Cartesian3.subtract(position, prevPosition, pathDirection);
        } else {
          // 如果只有一个点，使用默认方向（东向）
          pathDirection = new Cesium.Cartesian3(1.0, 0.0, 0.0);
        }

        // 检查并归一化路径方向向量
        const pathDirectionLength = Cesium.Cartesian3.magnitude(pathDirection);
        if (pathDirectionLength > 0) {
          Cesium.Cartesian3.normalize(pathDirection, pathDirection);
        } else {
          // 如果方向向量为零，使用默认方向
          pathDirection = new Cesium.Cartesian3(1.0, 0.0, 0.0);
        }

        // 计算垂直方向（法向量 × 路径方向）叉积
        const normal = ellipsoid.geodeticSurfaceNormal(position);
        let verticalDirection = new Cesium.Cartesian3();
        Cesium.Cartesian3.cross(normal, pathDirection, verticalDirection);

        // 检查并归一化垂直方向向量
        const verticalDirectionLength =
          Cesium.Cartesian3.magnitude(verticalDirection);
        if (verticalDirectionLength > 0) {
          Cesium.Cartesian3.normalize(verticalDirection, verticalDirection);
        } else {
          // 如果垂直向量为零（可能是因为路径方向与法线平行），使用ENU框架中的北向
          verticalDirection = new Cesium.Cartesian3(
            enuMatrix[4],
            enuMatrix[5],
            enuMatrix[6]
          );
          Cesium.Cartesian3.normalize(verticalDirection, verticalDirection);
        }

        // 向两侧偏移2500米
        const leftOffset = new Cesium.Cartesian3();
        Cesium.Cartesian3.multiplyByScalar(
          verticalDirection,
          sateClothWidth / 2,
          leftOffset
        );
        const leftPoint = new Cesium.Cartesian3();
        Cesium.Cartesian3.add(position, leftOffset, leftPoint);
        leftPositions.push(leftPoint);

        const rightOffset = new Cesium.Cartesian3();
        Cesium.Cartesian3.multiplyByScalar(
          verticalDirection,
          -(sateClothWidth / 2),
          rightOffset
        );
        const rightPoint = new Cesium.Cartesian3();
        Cesium.Cartesian3.add(position, rightOffset, rightPoint);
        rightPositions.push(rightPoint);
      } catch (error) {
        console.error(`计算偏移点时出错 (索引 ${i}):`, error);
        // 如果出错，使用简单的默认偏移
        const defaultOffset = new Cesium.Cartesian3(sateClothWidth / 2, 0, 0);
        const leftPoint = new Cesium.Cartesian3();
        const rightPoint = new Cesium.Cartesian3();
        Cesium.Cartesian3.add(position, defaultOffset, leftPoint);
        Cesium.Cartesian3.subtract(position, defaultOffset, rightPoint);
        leftPositions.push(leftPoint);
        rightPositions.push(rightPoint);
      }
    }
    // 合并点形成多边形边界（左边界 + 右边界反向）
    const polygonPositions = leftPositions.concat(rightPositions.reverse());
    return polygonPositions;
  };

  /**
   * @description 计算卫星过境区域的矩形框
   * @param footprints 卫星过境区域的起始点和结束点
   * @param sateClothWidth 卫星的地面幅宽
   * @returns 卫星过境区域的矩形框
   */
  // const computedSateZone = (
  //   footprints: Array<Array<any>>,
  //   sateClothWidth: number
  // ) => {
  //   console.log("computedSateZone", footprints, sateClothWidth);
  //   let startPoint = Cesium.Cartesian3.fromDegrees(
  //     footprints[0][0],
  //     footprints[0][1],
  //     footprints[0][2]
  //   );
  //   let endPoint = Cesium.Cartesian3.fromDegrees(
  //     footprints[1][0],
  //     footprints[1][1],
  //     footprints[1][2]
  //   );
  //   let direction = Cesium.Cartesian3.subtract(
  //     endPoint,
  //     startPoint,
  //     new Cesium.Cartesian3()
  //   );
  //   let normalizedDirection = Cesium.Cartesian3.normalize(
  //     direction,
  //     new Cesium.Cartesian3()
  //   );

  // 计算一个与飞行方向垂直的向量（即矩形的半宽方向）
  // 这里假设垂直向上，你可能需要根据实际情况调整垂直轴（例如，地表法线）
  // let vertical = Cesium.Cartesian3.UNIT_Z;
  // 获取地球椭球体对象
  //   const ellipsoid = window.viewer.scene.globe.ellipsoid;
  //   const up = ellipsoid.geodeticSurfaceNormal(
  //     startPoint,
  //     new Cesium.Cartesian3()
  //   );
  //   let halfWidthVector = Cesium.Cartesian3.cross(
  //     normalizedDirection,
  //     up,
  //     new Cesium.Cartesian3()
  //   );
  //   Cesium.Cartesian3.normalize(halfWidthVector, halfWidthVector);
  //   Cesium.Cartesian3.multiplyByScalar(
  //     halfWidthVector,
  //     sateClothWidth / 2.0,
  //     halfWidthVector
  //   );
  //   // 计算矩形四个角点
  //   let leftStart = Cesium.Cartesian3.add(
  //     startPoint,
  //     halfWidthVector,
  //     new Cesium.Cartesian3()
  //   );
  //   let rightStart = Cesium.Cartesian3.subtract(
  //     startPoint,
  //     halfWidthVector,
  //     new Cesium.Cartesian3()
  //   );
  //   let leftEnd = Cesium.Cartesian3.add(
  //     endPoint,
  //     halfWidthVector,
  //     new Cesium.Cartesian3()
  //   );
  //   let rightEnd = Cesium.Cartesian3.subtract(
  //     endPoint,
  //     halfWidthVector,
  //     new Cesium.Cartesian3()
  //   );
  //   let scanPolygonPositions = [leftStart, leftEnd, rightEnd, rightStart];
  //   console.log("scanPolygonPositions", scanPolygonPositions);
  //   return scanPolygonPositions;
  // };

  /**
   * @description 高亮某个实体
   * @param entity 要高亮的实体
   */
  const highlightEntity = (
    row: postOrbitForecastSatelliteOverZoneNewResponse & IRightTableData
  ) => {
    console.log("highlightEntity", row);
    // 重置所有多边形区域的边框线和材质
    polygonEntityArr.value.forEach(entity => {
      if (entity && entity.polygon) {
        // outLine需要在没有地形的情况下才能生效，使用Cesium.ConstantProperty正确设置属性
        // entity.polygon.outline = new Cesium.ConstantProperty(true);
        // entity.polygon.outlineColor = new Cesium.ConstantProperty(
        //   Cesium.Color.GREEN
        // );
        // entity.polygon.outlineWidth = new Cesium.ConstantProperty(2);
        entity.polygon.material = new Cesium.ColorMaterialProperty(
          // new Cesium.Color(0.2, 0.8, 0.2, 0.6) // 绿色半透明
          Cesium.Color.YELLOW // 红色半透明
        );
      }
    });
    // 找到对应的实体并高亮
    // const selectEntity = polygonEntityArr.value.find(
    //   entity => entity.userData.rightItem.uuid === row.uuid
    // );
    // console.log("selectEntity", selectEntity);
    // if (selectEntity && selectEntity.polygon) {
    //   selectEntity.polygon.material = new Cesium.ColorMaterialProperty(
    //     Cesium.Color.RED
    //   );
    // }
    const selectEntity = findPolygonEntityByUuid(row.uuid);
    if (selectEntity.length) {
      selectEntity.forEach(item => {
        item.polygon.material = new Cesium.ColorMaterialProperty(
          Cesium.Color.RED
        );
        // 设置较高的 zIndex 确保实体显示在最上层
        item.polygon.zIndex = 1000;
      });
    }
  };

  /**
   * @description 点击某一行高亮对应的过境区域
   * @param row 右侧表格数据行
   */
  const handleClickRow = (
    row: postOrbitForecastSatelliteOverZoneNewResponse & IRightTableData
  ) => {
    console.log("点击某一行高亮对应的过境区域", row);
    highlightEntity(row);
  };

  /**
   * @description 点击过境区域弹出弹窗
   */
  const handleClickZoneShowTooltip = () => {
    console.log("点击过境区域加载弹窗");
    // 处理用户输入事件。可以添加自定义函数，以便在用户输入输入时执行。接收一个参数，就是要向其添加事件的元素，默认为document
    leftClickHandler = new Cesium.ScreenSpaceEventHandler(
      window.viewer.scene.canvas
    );
    // 设置要在输入事件是哪个执行的函数
    leftClickHandler.setInputAction(event => {
      closeAllTooltip();
      console.log("输入事件发生时要执行的内容", event);
      // drillPick返回一个数组，包含点击位置处所有可见的实体，pick只能获取点击位置的最前面的实体，使用drillPick可以获取点击位置下的所有实体
      // drillPick返回对象列表，每个对象都包含特定窗口坐标位置的所有基元属性。还可以根据图元的类型设置其他属性，并可用于进一步识别拾取的对象。
      // 列表中的基元按其在场景中的视觉顺序（从前到后）排序。
      let pickedObjects = window.viewer.scene.drillPick(event.position);
      console.log("点击位置下的所有实体:", pickedObjects);
      // 遍历所有点击到的实体，如果当前点击的是多个地面画幅相交的地方，pickedObjects中会包含多个entity
      // 选择出视觉上最靠前的实体，高亮该实体，显示该实体的弹窗
      let selectEntity = null;
      for (let i = 0; i < pickedObjects.length; i++) {
        const pickedObject = pickedObjects[i];
        console.log(`实体${i}结构:`, pickedObject);
        if (Cesium.defined(pickedObject)) {
          if (
            pickedObject.id &&
            pickedObject.id.userData &&
            pickedObject.id.description &&
            pickedObject.id.description.getValue().includes("过境区域")
          ) {
            console.log("pickedObject.id.userData", pickedObject.id.userData);
            selectEntity = pickedObject.id;
            break;
          }
        }
      }
      if (selectEntity) {
        tooltipInstance = new Tooltip(window.viewer._element);
        const rightItem = selectEntity.userData.rightItem;
        if (rightItem) {
          // 高亮该实体
          highlightEntity(rightItem);
          // 显示弹窗
          tooltipInstance.show(
            event.position,
            `<div style="width: 420px; height: 347px; z-index: 999">
      <div
        style="
          background-size: 100% 100%;
          width: 100%;
          height: 44px;
          font-size: 18px;
          padding-left: 49px;
          line-height: 44px;
          color: white;
          background-image: url(${getPublicPath("tooltip-header-bg.png")});
          background-size: 100% 100%;">
        卫星名称：${rightItem.satelliteName ?? "-"}
      </div>
      <div
        style="
          padding: 16px;
          font-size: 16px;
          color: #537daf;
          display: flex;
          flex-direction: column;
          flex-wrap: wrap;
          justify-content: space-between;
          background-image: url(${getPublicPath("tooltip-content-bg.png")});
          background-size: 100% 100%;
        ">
        <span>数据序号：${rightItem.defaultIndex}</span>
        <span>开始时间：${rightItem.entryTime}</span>
        <span>结束时间：${rightItem.exitTime}</span>
        <span>卫星类型：${rightItem.satelliteType || "-"}</span>
        <span>卫星系列：${rightItem.satelliteSeries || "-"}</span>
        <span>侧摆角：${rightItem.sideAngle ?? "-"}</span>
        <span>轨道高度：${rightItem.orbitalAltitude ? rightItem.orbitalAltitude + "米" : "-"}</span>
      </div>
    </div>`
          );
        } else {
          console.log("当前点击的selectEntity没有rightItem属性");
        }
      }
      // 如果没有找到任何实体
      if (pickedObjects.length === 0) {
        console.log("点击位置没有实体");
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    leftClickHandler.setInputAction(event => {
      if (tooltipInstance) {
        tooltipInstance.followMouse(event.endPosition);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    leftClickHandler.setInputAction(() => {
      if (tooltipInstance) {
        closeAllTooltip();
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  };

  /**
   * @description 处理播放暂停
   * @param {object} row 行数据
   */
  const handlePlayPause = (row: IRightItem) => {
    let copyRowIsPlaying = row.isPlaying;
    console.log("处理播放暂停", row);
    if (row.isPlaying) {
      // 清空扫描图层
      clearOrbitScanLayer();
      // 暂停
      row.isPlaying = !copyRowIsPlaying;
    } else {
      // 自动打开图层眼睛
      if (!row.isShowPolygon) row.isShowPolygon = true;
      // row.isPlaying = !copyRowIsPlaying;
      handleAddOneScanLayer(row);
    }
  };

  /**
   * @description 处理添加扫描图层
   * @param {object} row 行数据
   */
  const handleAddOneScanLayer = (row: IRightItem) => {
    // 清空扫描图层
    clearOrbitScanLayer();
    row.isPlaying = true;
    // 播放
    flyToPolygon(row.uuid);
    // 添加扫描图层
    scanLayerInstance = new OrbitLayer({
      // 现在,这个开始时间和结束时间应该需要修改为每个卫星不一样
      startTime: new Date(),
      // 24小时后
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      stepSeconds: 10,
      name: row.satelliteName,
      satelliteInfoId: Number(row.satelliteId),
      tle1: row.tleLine1,
      tle2: row.tleLine2,
      clothWidth: row.clothWidth, // 这个参数只有在加载扫描图层的时候用到
      showPath: false,
      // @ts-ignore
      viewer: window.viewer,
      cylinderShow: true,
      forecastStateDtos: row.forecastStateDtos,
      forecastStateDtosOrigin: row.forecastStateDtosInZero
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
    // 添加监听扫描图层的事件
    scanLayerInstance.addCrossTrackCallback(
      (params: { type: "start" | "end" }) => {
        console.log("当前扫描状态", params.type);
        if (params.type == "end") {
          // 清空扫描图层
          clearOrbitScanLayer();
        }
      }
    );
  };

  /**
   * @description 处理显示隐藏多边形过境区域
   * @param {object} row 行数据
   */
  const handleShowPolygon = (row: IRightItem) => {
    console.log("处理显示隐藏多边形", row);
    if (row.isShowPolygon) {
      // 隐藏
      const selectEntity = findPolygonEntityByUuid(row.uuid);
      // if (selectEntity) {
      //   // window.viewer.entities.removeById(selectEntity.id);
      //   selectEntity.show = false;
      //   // 如果当前操作的轨道的扫描图层正在播放，那么暂停播放，移除扫描图层
      //   if (row.isPlaying) {
      //     handlePlayPause(row);
      //   }
      //   // 如果当前有tooltip，那么关闭tooltip
      //   closeAllTooltip();
      // }
      if (selectEntity.length) {
        selectEntity.forEach(item => {
          item.show = false;
        });
        // 如果当前操作的轨道的扫描图层正在播放，那么暂停播放，移除扫描图层
        if (row.isPlaying) {
          handlePlayPause(row);
        }
        // 如果当前有tooltip，那么关闭tooltip
        closeAllTooltip();
      }
    } else {
      // 显示
      highlightEntity(row);
      flyToPolygon(row.uuid);
    }
    row.isShowPolygon = !row.isShowPolygon;
  };

  /**
   * @description 侧摆角改变点击确定触发
   * @param row 右侧表格数据行
   */
  const handleSideAngle = (row: IRightItem) => {
    const copyIsPlaying = row.isPlaying;
    row.sideAnglePopoverVisible = false;
    row.sideAngle = row.sideAngleSliderValue;
    console.log("侧摆角改变点击确定触发", row);
    // 如果当前行正在播放，需要同时调整轨道区域和扫描区域
    // 删除之前的polygon和扫描图层
    // removePolygonByUuid(row.uuid);
    clearOrbitScanLayer(); // 如果不清空扫描图层，调整侧摆角后会高亮当前操作侧摆角的图层，此时正在扫描的图层和高亮的图层有可能对不上
    handleAddNewPolygon(row, copyIsPlaying);
    // if (copyIsPlaying) {
    //   handleAddOneScanLayer(row);
    // }
  };

  /**
   * @description 处理添加新的polygon
   * @param row 右侧表格数据行
   */
  const handleAddNewPolygon = (row: IRightItem, copyIsPlaying: boolean) => {
    // 添加新的polygon和扫描图层
    let positionList = [];
    row.zoneDetectResultList.forEach(e => {
      if (Array.isArray(e.footprints) && e.footprints.length > 0) {
        positionList.push(...e.footprints.map(fr => [fr[0], fr[1]]));
      }
    });
    console.log("positionList", positionList);
    if (!currentUserSelectZoneStr) return;
    console.log("currentUserSelectZoneStr", currentUserSelectZoneStr);
    const currentUserSelectZoneObj = JSON.parse(currentUserSelectZoneStr);
    const successCallback = (
      res: BaseResult<postOrbitForecastSatelliteOverZoneNewResponse>
    ) => {
      console.log("预测侧摆角", res);
      if (res.data) {
        // 如果没有摆出目标区域，那么需要删除之前的polygon
        removePolygonByUuid(row.uuid);
        // const realData = {
        //   ...JSON.parse(JSON.stringify(row)),
        //   geomJson: res.data.geomJson,
        //   forecastStateDtos: res.data.forecastStateDtos,
        //   entryTime: res.data.entryTime,
        //   exitTime: res.data.exitTime
        // };
        // console.log("realData", realData);
        // 这里应该直接修改row,调整完侧摆角之后后续的播放是按照新的侧摆角参数进行的，播放时取的是rightTable中对应Item，因此直接修改row
        row.geomJson = res.data.geomJson;
        row.forecastStateDtos = res.data.forecastStateDtos;
        row.entryTime = res.data.entryTime;
        row.exitTime = res.data.exitTime;
        // 使用后端计算出来的polygon
        // handleAddOnePolygon(row);
        // 使用前端计算出来的polygon
        handleLoadAllZoneWithCenterPoint(currentUserSelectZoneObj, row);
        highlightEntity(row);
        if (copyIsPlaying) {
          handleAddOneScanLayer(row);
        }
        //  {"type":"Polygon","coordinates":[[[105.753750393,31.8121874655],[105.6937805996,31.828916064],[106.1361493448,33.4147489903],[106.1837397829,33.4014736181],[106.1837397829,33.2175928752],[105.7917013675,31.8121874655],[105.753750393,31.8121874655]]]}
        //   {"type":"Polygon","coordinates":[[[105.753750393,31.8121874655],[105.6937805996,31.828916064],[106.1361493448,33.4147489903],[106.1837397829,33.4014736181],[106.1837397829,33.2175928752],[105.7917013675,31.8121874655],[105.753750393,31.8121874655]]]}
      } else {
        proxy.$message.warning({
          message: "已经侧摆出目标区域",
          duration: 2000
        });
      }
    };
    if (
      currentUserSelectZoneObj.centerLon &&
      currentUserSelectZoneObj.centerLat &&
      currentUserSelectZoneObj.radiusKm
    ) {
      postOrbitForecastResultForSideAngleCircle({
        centerLon: currentUserSelectZoneObj.centerLon || 0,
        centerLat: currentUserSelectZoneObj.centerLat || 0,
        radiusKm: currentUserSelectZoneObj.radiusKm || 0,
        segments: currentUserSelectZoneObj.segments || 0,
        satelliteId: row.satelliteId,
        satelliteName: row.satelliteName,
        orbitalAltitude: row.orbitalAltitude,
        clothWidth: row.clothWidth,
        tleLine1: row.tleLine1,
        tleLine2: row.tleLine2,
        sensorId: row.sensorId,
        forecastStartTime: row.entryTime,
        forecastEndTime: row.exitTime,
        sideAngle: row.sideAngle.toString(),
        positionList: row.forecastStateDtosInZero.map(fr => {
          return [fr.lon, fr.lat];
        })
      }).then(res => {
        successCallback(res);
      });
    } else {
      postOrbitForecastResultForSideAngle({
        satelliteId: row.satelliteId,
        // orbitalAltitude: row.orbitAltitude,
        clothWidth: row.clothWidth,
        tleLine1: row.tleLine1,
        tleLine2: row.tleLine2,
        // wkt: row.geomJson,
        wkt: currentUserSelectZoneStr,
        sensorId: row.sensorId,
        forecastStartTime: row.entryTime,
        forecastEndTime: row.exitTime,
        orbitalAltitude: row.orbitalAltitude,
        sideAngle: row.sideAngle.toString(),
        // 这个值应该必须是0度时的入境点和出境点，因为侧摆角的偏移都是相对于0度时来说的
        // positionList: row.forecastStateDtos.map(fr => {
        //   return [fr.lon, fr.lat];
        // // })
        positionList: row.forecastStateDtosInZero.map(fr => {
          return [fr.lon, fr.lat];
        })
        // positionList: positionList
      }).then(res => {
        successCallback(res);
      });
    }
  };

  /**
   * @description 处理显示隐藏侧摆角popover
   * @param row 右侧表格数据行
   */
  const handleShowSideAnglePopover = (row: IRightItem) => {
    const isShow = row.sideAnglePopoverVisible;
    // 同步slider值
    row.sideAngleSliderValue = row.sideAngle;
    // 确保只有一个popover显示
    rightTableData.value.forEach(item => {
      item.sideAnglePopoverVisible = false;
    });
    row.sideAnglePopoverVisible = !isShow;
  };

  /**
   * @description 处理选中行变化
   * @param selectedRows 选中的行数据
   */
  const handleSelectionChange = (selectedRows: IRightItem[]) => {
    console.log("选中行变化", selectedRows);
    tableSelectedRows.value = selectedRows;
  };

  /**
   * @description 导出卫星轨道
   */
  const handleExport = () => {
    if (!tableSelectedRows.value.length) {
      proxy.$message.warning({
        message: "请至少选择一条轨道",
        duration: 2000
      });
      return;
    }
    // 把卫星数据处理成GeoJson
    const geoJson = {
      type: "FeatureCollection",
      features: tableSelectedRows.value.map(row => ({
        type: "Feature",
        geometry: JSON.parse(row.geomJson),
        properties: {
          satelliteId: row.satelliteId,
          satelliteName: row.satelliteName,
          tleLine1: row.tleLine1,
          tleLine2: row.tleLine2,
          sideAngle: row.sideAngle.toString(),
          entryTime: row.entryTime,
          exitTime: row.exitTime
        }
      }))
    };
    console.log("geoJson", geoJson);
    const loadingInstance = proxy.$loading({
      text: "下载中，请稍等..."
    });
    exportSatelliteOrbit(geoJson)
      .then(res => {
        console.log("导出卫星轨道", res);
        downloadByData(
          res.data,
          "satellite" + dayjs().format("YYYYMMDDHHmmss") + ".zip"
        );
        proxy.$message({ message: "下载成功", type: "success" });
        if (refTable.value) {
          refTable.value.clearSelection();
        }
      })
      .finally(() => {
        loadingInstance.close();
      });
  };

  /**
   * @description 根据uuid删除某个polygon
   * @param row 右侧表格数据行
   */
  const removePolygonByUuid = (uuid: string) => {
    const selectEntity = findPolygonEntityByUuid(uuid);
    // if (selectEntity) {
    //   window.viewer.entities.removeById(selectEntity.id);
    //   polygonEntityArr.value = polygonEntityArr.value.filter(
    //     item => item.id !== selectEntity.id
    //   );
    // }
    if (selectEntity.length) {
      selectEntity.forEach(item => {
        window.viewer.entities.removeById(item.id);
      });
      polygonEntityArr.value = polygonEntityArr.value.filter(
        item => !selectEntity.includes(item)
      );
    }
  };

  /**
   * @description 根据uuid查找对应的多边形entity
   * @param {string} uuid 行的uuid
   */
  const findPolygonEntityByUuid = (uuid: string) => {
    if (!polygonEntityArr.value) return null;
    return polygonEntityArr.value.filter(
      item => item.userData.rightItem.uuid === uuid
    );
  };

  /**
   * @description 根据uuid飞行到对应行的多边形，并且显示图层
   * @param {string} uuid 行的uuid
   */
  const flyToPolygon = (uuid: string) => {
    const selectEntity = findPolygonEntityByUuid(uuid);
    // if (selectEntity) {
    //   const selectEntityInViewer = window.viewer.entities.getById(
    //     selectEntity.id
    //   );
    //   if (selectEntityInViewer) {
    //     selectEntityInViewer.show = true;
    //     window.viewer.zoomTo(selectEntityInViewer);
    //   }
    // }
    if (selectEntity.length) {
      const entityCollection = new Ceisum.EntityCollection();
      selectEntity.forEach(item => {
        const selectEntityInViewer = window.viewer.entities.getById(item.id);
        if (selectEntityInViewer) {
          selectEntityInViewer.show = false;
          entityCollection.add(selectEntityInViewer);
          selectEntityInViewer.show = true;
        }
      });
      window.viewer.zoomTo(entityCollection);
    }
  };

  /**
   * @description 清空所有的polygon
   */
  const handleClearAllPolygon = () => {
    if (polygonEntityArr.value) {
      polygonEntityArr.value.forEach(item => {
        window.viewer.entities.removeById(item.id);
      });
      polygonEntityArr.value = [];
    }
  };

  /**
   * @description 清空扫描图层
   */
  const clearOrbitScanLayer = () => {
    if (scanLayerInstance) {
      // scanLayerInstance.removeTriangleEntity();
      scanLayerInstance.remove();
      // 移除事件监听
      scanLayerInstance.removeCrossTrackCallback();
      scanLayerInstance = null;
      // 确保只有一个图层在播放
      rightTableData.value.forEach(rt => {
        rt.isPlaying = false;
      });
    }
  };

  /**
   * @description 关闭所有的tooltip
   */
  const closeAllTooltip = () => {
    if (tooltipInstance) {
      tooltipInstance.remove();
      tooltipInstance = null;
    }
  };

  /**
   * @description 清空
   */
  const clearAll = () => {
    handleClearAllPolygon();
    clearOrbitScanLayer();
    closeAllTooltip();
  };

  /**
   * @description 收尾事件
   */
  const clearAboutOrbit = () => {
    if (leftClickHandler) {
      leftClickHandler.destroy();
      leftClickHandler = null;
    }
    clearAll();
  };

  return {
    rightTableData,
    setRightTableData,
    handleClickRow,
    handleClickZoneShowTooltip,
    handleShowPolygon,
    clearAboutOrbit,
    defaultMinSideAngle,
    defaultMaxSideAngle,
    handlePlayPause,
    handleSideAngle,
    handleShowSideAnglePopover,
    handleSelectionChange,
    handleExport,
    refTable,
    clearAll,
    currentUserSelectZoneStr
  };
};
