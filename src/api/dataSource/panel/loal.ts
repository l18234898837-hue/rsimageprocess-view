import { http } from "@/utils/http";
import type { Result } from "@/api/api";
// const { VITE_THUMBJPG_PATH } = import.meta.env;

/** 根据查询条件检索资源 */
export const getConditionPage = (data: any, type?: string) => {
  return http.request<Result>("post", `/algorithm/data/condition${type}/page`, {
    data
  });
};

/** GCJ02ToWGS84 */
export const gcj20ToWgs84 = (data: { lng: number; lat: number }) => {
  return http.request<Result>("post", `/transform/GCJ02ToWGS84`, {
    data
  });
};

/** WGS84ToGCJ02 */
export const wgs84ToGcj20 = (data: { lng: number; lat: number }) => {
  return http.request<Result>("post", `/transform/WGS84ToGCJ02`, {
    data
  });
};

/** 获取对应id文件缩略图 */
export const getThumbJpg = (id: any) => {
  return http.request<Result>("get", `/algorithm/data/ThumbJpg/${id}`, {
    responseType: "arraybuffer"
  });
};
// 获取风场数据
export const getWindData = (data: any) => {
  return http.request<Result>("post", `/WDSD/getData`, {
    data
  });
};
/** 获取对应id按照色带Id生成的新缩略图 */
export const getThumbJpgByColorRampId = (id: any, colorId: string | number) => {
  return http.request<Result>(
    "get",
    `/algorithm/data/ThumbJpgByColorRampId/${id}`,
    {
      responseType: "arraybuffer"
    },
    {
      params: {
        colorRampId: colorId
      }
    }
  );
};

/** 下载对应id地图数据 */
export const downloadLocalData = (level: any, id: any) => {
  return http.request<Result>("get", `/algorithm/data/download${level}/${id}`, {
    responseType: "arraybuffer"
  });
};

/** 通过id下载关联的文件 */
export const downloadLocalDataByIds = (data: {
  name?: string;
  dataIds: any[];
  type: number;
}) => {
  return http.request<Result>(
    "post",
    `/algorithm/data/download`,
    {
      data
    },
    {
      responseType: "arraybuffer"
    }
  );
};
