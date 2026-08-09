import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 根据类型和数据id或算法id得到启用的配色*/
export const getEnabledLegend = (data?: object) => {
  return http.request<Result>("get", "/algorithm/legend/enabled", {
    params: data
  });
};

/** 新增配色*/
export const postLegend = (data?: object) => {
  return http.request<Result>("post", "/algorithm/legend", {
    data
  });
};

/** 新增配色*/
export const postLegendList = (data?: object) => {
  return http.request<Result>("get", "/algorithm/legend/list", {
    params: data
  });
};

/** 数据资源入库*/
export const putDataStorage = (data?: object) => {
  return http.request<Result>("put", `/algorithm/data/storage/${data}`, {
    params: data
  });
};

/** 查询在线根资源列表*/
export const getSentinelList = (data?: object) => {
  return http.request<Result>("get", `/algorithm/sentinel/tree`, {
    params: data
  });
};

/** 查询在线根资源列表*/
export const getSentinelSearch = (data?: object) => {
  return http.request<Result>("post", `/algorithm/sentinel/search`, {
    params: data
  });
};

/** 根据资源ID得到资源信息*/
export const getSentinel = (data?: object) => {
  return http.request<Result>("get", `/algorithm/sentinel/${data}`, {
    params: data
  });
};

/** 按坐标系转换坐标*/
export const transformCoordinates = (data?: object) => {
  return http.request<Result>("post", `/algorithm/data/transform`, {
    data
  });
};

/** 构建行政区划树*/
export const getRegionTree = (data?: object) => {
  return http.request<Result>("get", `/algorithm/region/tree`, {
    data
  });
};

/** 构建岛礁树*/
export const getStIslandInfoTree = (data?: object) => {
  return http.request<Result>("get", `/stIslandInfo/tree`, {
    data
  });
};

/* 岛礁列表-polygon */
export const getStIslandInfoList = (data?: object) => {
  return http.request<Result>("get", `/stIslandInfo/page`, {
    data
  });
};

export const listLayer = (pid: string) => {
  return http.request<Result>("get", `/algorithm/sentinel/layers/${pid}`);
};
