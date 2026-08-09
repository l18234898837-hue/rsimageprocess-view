import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 查询在线欧空局哨兵系列资源列表 */
export const getSentinelList = () => {
  return http.request<Result>("get", `/algorithm/sentinel/list`);
};

/** 查询在线Landsat卫星资源列表 */
export const getStUsgsInfo = () => {
  return http.request<Result>("get", `/stUsgsInfo/`);
};

/** 查询在线Landsat卫星资源列表 */
export const downloadSentinel = (data: any) => {
  return http.request<Result>("get", `/algorithm/sentinel/download/sentinel`, {
    params: data
  });
};

/** 搜索usgs数据
 * @description
 * OnlineType: 1是landsat,2是sentinel，
 * WTK: sentinel搜索时输入这个，
 * geoJsonStr: 传入geoJson选择数据范围
 */
export const stUsgsInfoSearch = (data: {
  pageSize: number;
  pageNum: number;
  datasetName?: string;
  geoJsonStr?: string;
  startDate: string;
  endDate: string;
  onlineType: string | number;
  wtk?: string;
  sentinel2Types?: any[];
}) => {
  return http.request<Result>("post", `/stUsgsInfo/search`, {
    data
  });
};

/** 下载Sentinel在线数据 */
export const usgsGownloadSentinel = (data: any) => {
  return http.request<Result>("get", `/stUsgsInfo/download/sentinel`, {
    params: data
  });
};

/** 下载Sentinel在线数据 */
export const usgsGownloadLandsat = (data: any) => {
  return http.request<Result>("get", `/stUsgsInfo/download/landsat`, {
    params: data
  });
};

/** ToCircleWkt4326 */
export const toCircleWkt4326 = (data: {
  centerWkt: string;
  radius: number;
}) => {
  return http.request<Result>("post", `/transform/ToCircleWkt4326`, {
    data
  });
};

/** 获取所有在线记录下载记录 */
export const onlineDownloadRecord = (data: {
  userId: string | number;
  pageSize: number;
  pageNum: number;
}) => {
  return http.request<Result>("get", `/StOnlineDownloadRecord`, {
    params: data
  });
};

/** 继续/开始下载在线资源 */
export const startOnlineDownloadRecord = (id: number) => {
  return http.request<Result>("get", `/StOnlineDownloadRecord/continue/${id}`);
};

/** 暂停下载在线资源 */
export const pauseOnlineDownloadRecord = (id: number) => {
  return http.request<Result>("get", `/StOnlineDownloadRecord/pause/${id}`);
};

/** 删除下载在线资源 */
export const delOnlineDownloadRecord = (id: number) => {
  return http.request<Result>("get", `/StOnlineDownloadRecord/delete/${id}`);
};
