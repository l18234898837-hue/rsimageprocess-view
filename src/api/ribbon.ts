import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 查询色带列表 */
export const pageSysColorRamp = (data?: object) => {
  return http.request<Result>("get", "/sdColorRamp", { params: data });
};
// 删除
export const deleteSysColorRamp = (id: string) => {
  return http.request<Result>("delete", `sdColorRamp/${id}`);
};
// 新增
export const addSysColorRamp = (data?: object) => {
  return http.request<Result>("post", "/sdColorRamp", { data });
};
// 修改
export const updateSysColorRamp = (data?: object) => {
  return http.request<Result>("put", "/sdColorRamp", { data });
};
