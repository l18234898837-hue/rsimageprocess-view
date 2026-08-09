import { http } from "@/utils/http";
import type { BaseResult, BaseResultList } from "@/api/api";
import type {
  getSatelliteInfoDictResponse,
  getSatelliteTleListResponse,
  getSatelliteTreeResponse,
  postOrbitForecastSatelliteOverCircleZoneBody,
  postOrbitForecastSatelliteOverZoneBody,
  postOrbitForecastSatelliteOverZoneResponse,
  postOrbitForecastSatelliteOverZoneBodyNew,
  postOrbitForecastSatelliteOverZoneNewResponse,
  postOrbitForecastSatelliteOverCircleZoneBodyNew,
  postOrbitForecastResultForSideAngleBody,
  postOrbitForecastResultForSideAngleCircleBody
} from "./types";

/**
 * @description 卫星轨道相关接口
 */

// 获取卫星树
export const getSatelliteTree = () => {
  return http.request<BaseResult<getSatelliteTreeResponse[]>>(
    "get",
    "/api/satellite/info/tree"
  );
};

// 根据卫星id获取轨道信息
export const postSatelliteTleList = (data: number[] | string[]) => {
  return http.request<BaseResultList<getSatelliteTleListResponse>>(
    "post",
    `/api/satellite/tle/list`,
    {
      data: data
    }
  );
};

// 根据TLE预测卫星进入/离开地面区域情况(多边形)
export const postOrbitForecastSatelliteOverZone = (
  data: postOrbitForecastSatelliteOverZoneBody[]
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneResponse>
  >("post", `/api/orbit/forecastSatelliteOverZone`, {
    data: data,
    timeout: 0
  });
};

// 根据TLE预测卫星进入/离开地面区域情况（圆形）
export const postOrbitForecastSatelliteOverCircleZone = (
  data: postOrbitForecastSatelliteOverCircleZoneBody[]
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneResponse>
  >("post", `/api/orbit/forecastSatelliteOverCircle`, {
    data: data,
    timeout: 0
  });
};

// 获取卫星字典
export const getSatelliteInfoDict = () => {
  return http.request<BaseResultList<getSatelliteInfoDictResponse>>(
    "get",
    "/api/satellite/info/dict"
  );
};

// 导出卫星轨道
export const exportSatelliteOrbit = (data: Object) => {
  return http.request<BaseResult<Blob>>("post", `/api/orbit/download`, {
    data: data,
    timeout: 0,
    responseType: "blob"
  });
};

// 新版预测接口
// 根据TLE预测卫星进入/离开地面区域情况(多边形) + 画线
export const postOrbitForecastSatelliteOverZoneNew = (
  data: postOrbitForecastSatelliteOverZoneBodyNew
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneNewResponse>
  >("post", `/api/orbit/forecastSatelliteOverZoneAndLine`, {
    data: data,
    timeout: 0
  });
};

// 根据TLE预测卫星进入/离开地面区域情况（圆形） + 画线
export const postOrbitForecastSatelliteOverCircleZoneNew = (
  data: postOrbitForecastSatelliteOverCircleZoneBodyNew
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneResponse>
  >("post", `/api/orbit/forecastSatelliteOverCircleAndLine`, {
    data: data,
    timeout: 0
  });
};

// 根据TLE预测卫星进入/离开地面区域情况(多边形) + 画线 + 周期时间
export const postOrbitForecastSatelliteOverZonePeriod = (
  data: postOrbitForecastSatelliteOverZoneBodyNew
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneNewResponse>
  >("post", `/api/orbit/forecastSatelliteOverZoneAndLinePeriod`, {
    data: data,
    timeout: 0
  });
};

// 根据TLE预测卫星进入/离开地面区域情况（圆形） + 画线 + 周期时间
export const postOrbitForecastSatelliteOverCircleZonePeriod = (
  data: postOrbitForecastSatelliteOverCircleZoneBodyNew
) => {
  return http.request<
    BaseResultList<postOrbitForecastSatelliteOverZoneResponse>
  >("post", `/api/orbit/forecastSatelliteOverCircleAndLinePeriod`, {
    data: data,
    timeout: 0
  });
};

// 侧摆角预测
export const postOrbitForecastResultForSideAngle = (
  data: postOrbitForecastResultForSideAngleBody
) => {
  return http.request<
    BaseResult<postOrbitForecastSatelliteOverZoneNewResponse>
  >("post", `/api/orbit/getOrbitForecastResultForSideAngle`, {
    data: data,
    timeout: 0
  });
};

// 侧摆角预测（圆形）
export const postOrbitForecastResultForSideAngleCircle = (
  data: postOrbitForecastResultForSideAngleCircleBody
) => {
  return http.request<
    BaseResult<postOrbitForecastSatelliteOverZoneNewResponse>
  >("post", `/api/orbit/getOrbitForecastResultForSideAngleCircle`, {
    data: data,
    timeout: 0
  });
};
