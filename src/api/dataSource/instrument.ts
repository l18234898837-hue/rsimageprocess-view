import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 获取设备分类 */
export const getSdObserveDevice = () => {
  return http.request<Result>("get", `/sd/observe/device`);
};

/** 搜索观测数据 */
export const getSdObserveQuery = (data: any) => {
  return http.request<Result>("post", `/sd/observe/query`, {
    data
  });
};

/** 获取所有参数区间 */
export const getSdObserveInterval = () => {
  return http.request<Result>("get", `/sd/observe/interval`);
};

//点时序信息
export const getTimeSeqPoint = (params: object) => {
  return http.request<Result>("post", `timeSeq/point`, {
    data: params
  });
};
//矩形时序信息
export const getTimeSeqRect = (params: object) => {
  return http.request<Result>("post", `timeSeq/rect`, {
    data: params
  });
};
