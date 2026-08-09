import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 根据字典类型查询字典数据信息 */
export const getDicts = dictType => {
  return http.request<Result>("get", `/system/dict/data/type/${dictType}`);
};
// 根据id 下载图片
export const downloadImageById = (id: string) => {
  return http.request<Result>("get", `/system/file/download/${id}`, {
    responseType: "arraybuffer"
  });
};
