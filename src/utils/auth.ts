import Cookies from "js-cookie";
import { storageLocal } from "@pureadmin/utils";
import { useUserStoreHook } from "@/store/modules/user";

export interface DataInfo<T> {
  /** token */
  accessToken: string;
  /** `accessToken`的过期时间（时间戳） */
  expires: T;
  /** 用于调用刷新accessToken的接口时所需的token */
  refreshToken: string;
  /** 头像 */
  avatar?: string;
  /** 用户名 */
  username?: string;
  /** 昵称 */
  nickName?: string;
  email?: string;
  /** 用户信息 */
  info?: Array<object>;
  /** 当前登录用户的角色 */
  roles?: Array<string>;
  /** 当前登录用户的按钮权限 */
  permissions?: Array<string>;
}

export const userKey = "user-info";
export const TokenKey = "authorized-token";

/** 获取`token` */
export function getToken(): DataInfo<number> {
  // 此处与`TokenKey`相同，此写法解决初始化时`Cookies`中不存在`TokenKey`报错
  return Cookies.get(TokenKey)
    ? JSON.parse(Cookies.get(TokenKey))
    : storageLocal().getItem(userKey);
}

/** 设置`token`,适配大屏项目 */
export function setTokenNew(data) {
  // 提取关键信息进行存储
  useUserStoreHook().SET_TOKEN(data.token);
  Cookies.set(TokenKey, data.token);
  storageLocal().setItem(TokenKey, data.token);
}

/** 删除`token`以及key值为`user-info`的localStorage信息 */
export function removeToken() {
  Cookies.remove(TokenKey);
  storageLocal().clear();
  // storageLocal().removeItem(userKey);
}

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
  return "Bearer " + token;
};
