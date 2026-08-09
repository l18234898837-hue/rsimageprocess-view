import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 添加配置文件 */
export const addSetting = (data: any) => {
  return http.request<Result>("post", `/stAlgorithmRecord/addSetting`, {
    data
  });
};

/** 添加算法运行进行排队 */
export const stAlgorithmRecord = (data: {
  dataIds: any[];
  spaceDataIds?: any[];
  settingDataIds?: any[];
}) => {
  return http.request<Result>("post", `/stAlgorithmRecord`, {
    data
  });
};

/** 获取当前结果数据以及卫星结构 */
export const getAlgorithmRecordCatalog = () => {
  return http.request<Result>("get", `/stAlgorithmRecord/catalog`);
};

/** 获取用户运行结果 */
export const getStAlgorithmRecord = () => {
  return http.request<Result>("get", `/stAlgorithmRecord`);
};

/** 提交数据到个人数据集 */
export const algorithmRecordSubUser = (data: { dataIds: any[] }) => {
  return http.request<Result>("post", `/stAlgorithmRecord/submit/user`, {
    data
  });
};

/** 提交数据到公共数据集 */
export const algorithmRecordSubPublic = (data: {
  dataIds: any[];
  reason: string;
  region: string;
}) => {
  return http.request<Result>("post", `/stAlgorithmRecord/submit/public`, {
    data
  });
};

/** 查询色带 */
export const getColorRamp = (data: { name: string }) => {
  return http.request<Result>("get", `/sdColorRamp`, {
    params: data
  });
};
