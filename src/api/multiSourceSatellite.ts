import { http } from "@/utils/http";
import type { Result } from "@/api/api";

export interface MultiSourceSatelliteFile {
  fileName: string;
  satelliteType: string;
  size: number;
}

export interface MultiSourceProcessPayload {
  files: MultiSourceSatelliteFile[];
  operations: string[];
}

export interface MultiSourceProcessResult {
  resultId: string;
  fileName: string;
  downloadPath: string;
}

/** 提交多源卫星数据处理任务。假后端会在三秒后返回结果文件信息。 */
export const runMultiSourceSatelliteProcess = (
  data: MultiSourceProcessPayload
) => {
  return http.request<Result>("post", "/multi-source-satellite/process", {
    data
  });
};

/** 下载假后端生成的空 RAR 结果包。 */
export const downloadMultiSourceSatelliteResult = (resultId: string) => {
  return http.request<any>(
    "get",
    `/multi-source-satellite/result/${resultId}.rar`,
    {
      responseType: "blob"
    }
  );
};
