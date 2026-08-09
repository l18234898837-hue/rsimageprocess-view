import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 获取用户日志，分页  */
export const getTimerLogPage = (data: {
  userId: string | number;
  pageSize: number;
  pageNum: number;
  taskType?: string | number;
  runDate?: string | number;
  taskStatus?: string | number;
}) => {
  return http.request<Result>("get", `/stTimerLog/page`, {
    params: data
  });
};

/** 添加定时器
 * @param data
 * @param data.status 任务状态：0=未启用，1=进行中
 * @param data.type 任务类型：1=一次性定时任务，2=周期任务
 * @param data.taskType 具体任务类型：1=下载任务，2=计算任务
 * @param data.tastDescription 任务描述
 * @param data.runText 运行参数字符串，存储任务所需的复杂参数
 * @param data.frequency 周期任务运行频率：1=每天，2=每周，3=每月
 */
export const addTimerInfo = (data: {
  name: string;
  userId: string | number;
  status?: string | number;
  type: number;
  taskType: number;
  tastDescription?: string;
  runDate?: string;
  runTime?: string;
  runText: string;
  frequency?: number;
}) => {
  return http.request<Result>("post", `/stTimerInfo`, {
    data
  });
};

/** 修改定时器功能 */
export const updateTimerInfo = (data: any) => {
  return http.request<Result>("put", `/stTimerInfo`, {
    data
  });
};

/** 分页查询定时器 */
export const getTimerInfoPage = (data: any) => {
  return http.request<Result>("get", `/stTimerInfo/page`, {
    params: data
  });
};

/** 删除 */
export const delTimerInfo = (id: any) => {
  return http.request<Result>("delete", `/stTimerInfo/${id}`);
};
