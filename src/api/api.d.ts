export type Result = {
  success: boolean;
  data?: any;
  rows?: any;
  total?: number;
  code: number;
  msg?: string;
};
// 列表的基本的返回结构
export type BaseResultList<T = any> = {
  code: number;
  msg: string;
  total: number;
  rows: Array<T>;
};

// 其他接口的基本返回结构
export type BaseResult<T = any> = {
  code: number;
  msg: string;
  data: T;
};
// 时间范围
export type TimeRange = {
  startTime?: string;
  endTime?: string;
};
// 分页
export type Page = {
  pageNum?: number;
  pageSize?: number;
};
