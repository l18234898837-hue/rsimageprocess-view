import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 获取菜单 */
export const getStMenuInfoTree = (data?: object) => {
  // return http.request<Result>("get", "/stMenuInfo/tree", { params: data });
  return http.request<Result>("get", "/algorithm/menu/tree", {
    params: data
  });
};

/** 构建目录树 */
export const getalgorithmCatalogAllTree = (data?: object) => {
  // return http.request<Result>("get", "/stMenuInfo/tree", { params: data });
  return http.request<Result>("get", "algorithm/catalog/all/tree", {
    params: data
  });
};

/** 获取所有专题数据 */
export const getStThematicData = (data?: object) => {
  // return http.request<Result>("get", "/stThematicData", { params: data });
  return http.request<Result>("get", "/stThematicData", { params: data });
};

/** 获取所有专题分组 */
export const getAlgorithmCatalogList = (data?: object) => {
  return http.request<Result>("get", "/algorithm/catalog/list", {
    params: data
  });
};
// 获取所有的仪器信息：stInstrumentsInfo
export const stInstrumentsInfo = (data?: any) => {
  return http.request<Result>("get", `stInstrumentsInfo`, {
    params: data
  });
};
/** 分页查询资源列表 */
export const getAlgorithmCatalogPage = (data?: object) => {
  return http.request<Result>("get", "/algorithm/catalog/page", {
    params: data
  });
};

/** 根据1级根目录构建目录树 */
export const getAlgorithmCatalogTree = (data?: object) => {
  return http.request<Result>("get", "/algorithm/catalog/tree", {
    params: data
  });
};

/** 获取新菜单生成 */
export const getDataTypeTreeByString = (data?: object) => {
  return http.request<Result>("post", "/stDataType/TreeByString", {
    data
  });
};

export const getAlgorithmList = (data?: object) => {
  return http.request<Result>("get", "/algorithm/algorithm/list/data", {
    params: data
  });
};
/** 搜索usgs数据 */
export const usgsInfoSearch = (data?: object) => {
  return http.request<Result>("get", "/stUsgsInfo/search", {
    data
  });
};
